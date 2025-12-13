import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.ts";
import type { AuthRequest } from "../middleware/auth.ts";
import { Resume } from "../models/Resume.ts";
import { parseResume } from "../utils/resumeParser.ts";
import { matchResumeToJD } from "../utils/matcher.ts";
import { extractTextFromPDF, isPDF } from "../utils/pdfParser.ts";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Single resume match (text input)
const payloadSchema = z.object({
  resumeText: z.string().min(10, "Resume is too short"),
  jobDescription: z.string().min(10, "Job description is too short")
});

// Bulk upload schema
const bulkSchema = z.object({
  jobDescription: z.string().min(10, "Job description is too short"),
  jobDescriptionId: z.string().min(1, "Job description ID is required")
});

// Helper to read file as text (handles PDF and text files)
async function readFileAsText(file: Express.Multer.File): Promise<string> {
  try {
    // Check if it's a PDF
    if (isPDF(file.buffer)) {
      return await extractTextFromPDF(file.buffer);
    }
    
    // Try UTF-8 first
    let text = file.buffer.toString("utf-8");
    // If we got mostly replacement characters, try other encodings
    if (text.includes('\ufffd') || text.length < file.buffer.length * 0.5) {
      try {
        text = file.buffer.toString("latin1");
      } catch {
        text = file.buffer.toString("utf16le");
      }
    }
    // Clean up common encoding issues
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Remove null bytes and other control characters (except newlines and tabs)
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    return text;
  } catch (err: any) {
    // Last resort: try to decode as ASCII
    return file.buffer.toString("ascii").replace(/[^\x20-\x7E\n\r\t]/g, '');
  }
}

// Single resume match endpoint (backward compatible)
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
  }

  const { resumeText, jobDescription } = parsed.data;
  
  // Parse resume
  const parsedResume = parseResume(resumeText);
  
  // Match against JD
  const matchResult = matchResumeToJD(
    parsedResume.keywords,
    parsedResume.skills,
    resumeText,
    jobDescription
  );

  return res.json({
    score: matchResult.matchScore,
    matchPercentage: matchResult.matchPercentage,
    decision: matchResult.status,
    threshold: 80,
    matchedKeywords: matchResult.matchedKeywords,
    missingKeywords: matchResult.missingKeywords,
    parsedResume
  });
});

// Bulk resume upload endpoint
router.post("/bulk", authMiddleware, upload.array("resumes", 50), async (req: AuthRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const parsed = bulkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    }

    const { jobDescription, jobDescriptionId } = parsed.data;
    const userId = req.userId!;

    const results = [];

    // Process each resume
    for (const file of files) {
      try {
        // Read file content (handles PDF and text files)
        const resumeText = await readFileAsText(file);
        
        // Parse resume
        const parsedResume = parseResume(resumeText);
        
        // Match against JD
        const matchResult = matchResumeToJD(
          parsedResume.keywords,
          parsedResume.skills,
          resumeText,
          jobDescription
        );

        // Save to database
        const resume = await Resume.create({
          userId,
          jobDescriptionId,
          fileName: file.originalname,
          originalText: resumeText,
          skills: parsedResume.skills,
          keywords: parsedResume.keywords,
          email: parsedResume.email,
          experience: parsedResume.experience,
          education: parsedResume.education,
          certificates: parsedResume.certificates,
          matchScore: matchResult.matchScore,
          matchPercentage: matchResult.matchPercentage,
          status: matchResult.status,
          matchedKeywords: matchResult.matchedKeywords,
          missingKeywords: matchResult.missingKeywords
        });

        results.push({
          id: resume._id,
          fileName: file.originalname,
          matchPercentage: matchResult.matchPercentage,
          status: matchResult.status,
          email: parsedResume.email,
          skills: parsedResume.skills,
          matchedKeywords: matchResult.matchedKeywords.slice(0, 10),
          missingKeywords: matchResult.missingKeywords.slice(0, 10)
        });
      } catch (err: any) {
        results.push({
          fileName: file.originalname,
          error: err.message || "Failed to process resume"
        });
      }
    }

    return res.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Bulk upload failed" });
  }
});

// Get all resumes for a job description (with ranking, filtering, sorting)
router.get("/resumes/:jobDescriptionId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { jobDescriptionId } = req.params;
    const userId = req.userId!;
    const { status, sortBy = "matchScore", order = "desc" } = req.query;

    const filter: Record<string, unknown> = {
      userId,
      jobDescriptionId
    };

    if (status && typeof status === "string") {
      filter.status = status;
    }

    const sort: Record<string, 1 | -1> = {};
    if (sortBy === "matchScore" || sortBy === "matchPercentage") {
      sort[sortBy] = order === "asc" ? 1 : -1;
    } else {
      sort.matchScore = -1; // Default sort
    }

    const resumes = await Resume.find(filter)
      .sort(sort)
      .select("-originalText") // Don't send full text
      .limit(100)
      .lean();

    return res.json({
      count: resumes.length,
      resumes
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch resumes" });
  }
});

// Get single resume details
router.get("/resume/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    return res.json(resume);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to fetch resume" });
  }
});

// Update resume status (HR can manually change status)
router.patch("/resume/:id/status", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { status } = req.body;

    if (!["shortlisted", "rejected", "low_priority"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const resume = await Resume.findOneAndUpdate(
      { _id: id, userId },
      { status },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    return res.json(resume);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to update status" });
  }
});

export default router;
