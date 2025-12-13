import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Application } from "../models/Application.ts";
import { authMiddleware } from "../middleware/auth.ts";
import type { AuthRequest } from "../middleware/auth.ts";

const router = Router();

const appSchema = z.object({
  companyName: z.string().min(1),
  position: z.string().min(1),
  candidateName: z.string().optional(),
  candidateEmail: z.preprocess(
    (val) => val === "" ? undefined : val,
    z.string().email().optional()
  ),
  candidatePhone: z.string().optional(),
  status: z.enum(["applied", "interview", "offer", "rejected"]).optional(),
  dateApplied: z.string().transform((val) => new Date(val)),
  notes: z.string().optional()
});

router.use(authMiddleware);

router.post("/", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Clean up empty strings for optional fields
    const cleanedData: any = { ...req.body };
    if (cleanedData.candidateName === "") cleanedData.candidateName = undefined;
    if (cleanedData.candidateEmail === "") cleanedData.candidateEmail = undefined;
    if (cleanedData.candidatePhone === "") cleanedData.candidatePhone = undefined;
    if (cleanedData.notes === "") cleanedData.notes = undefined;
    
    const parsed = appSchema.safeParse(cleanedData);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error.format());
      return res.status(400).json({ 
        message: "Invalid input", 
        errors: parsed.error.format(),
        details: parsed.error.errors 
      });
    }
    
    const app = await Application.create({ ...parsed.data, userId: req.userId });
    res.status(201).json(app);
  } catch (error: any) {
    console.error("Error creating application:", error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate entry", error: error.message });
    }
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Validation error", error: error.message });
    }
    
    return res.status(500).json({ 
      message: "Failed to create application", 
      error: error.message || "Internal server error" 
    });
  }
});

router.get("/", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { status, company, position, search, sortBy = "dateApplied", sortOrder = "desc", page = "1", limit = "50" } = req.query;
    const filter: Record<string, unknown> = { userId: req.userId };
    if (status && typeof status === "string") filter.status = status;
    if (company && typeof company === "string") filter.companyName = { $regex: company, $options: "i" };
    if (position && typeof position === "string") filter.position = { $regex: position, $options: "i" };
    // Single search field that searches company, position, candidate name, and email
    if (search && typeof search === "string") {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
        { candidateName: { $regex: search, $options: "i" } },
        { candidateEmail: { $regex: search, $options: "i" } }
      ];
    }
    
    // Sorting
    const sortField = typeof sortBy === "string" ? sortBy : "dateApplied";
    const sortDirection = typeof sortOrder === "string" && sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDirection };
    
    // Pagination
    const pageNum = parseInt(typeof page === "string" ? page : "1", 10);
    const limitNum = parseInt(typeof limit === "string" ? limit : "50", 10);
    const skip = (pageNum - 1) * limitNum;
    
    const [apps, total] = await Promise.all([
      Application.find(filter).sort(sort).skip(skip).limit(limitNum),
      Application.countDocuments(filter)
    ]);
    
    res.json({
      applications: apps,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error("Error fetching applications:", error);
    return res.status(500).json({ 
      message: "Failed to fetch applications", 
      error: error.message || "Internal server error" 
    });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Clean up empty strings for optional fields
    const cleanedData: any = { ...req.body };
    if (cleanedData.candidateName === "") cleanedData.candidateName = undefined;
    if (cleanedData.candidateEmail === "") cleanedData.candidateEmail = undefined;
    if (cleanedData.candidatePhone === "") cleanedData.candidatePhone = undefined;
    if (cleanedData.notes === "") cleanedData.notes = undefined;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    const parsed = appSchema.partial().safeParse(cleanedData);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.format() });
    }

    const updated = await Application.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(req.params.id), userId: req.userId },
      { $set: parsed.data },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Application not found" });
    }
    res.json(updated);
  } catch (error: any) {
    console.error("Error updating application:", error);
    return res.status(500).json({ 
      message: "Failed to update application", 
      error: error.message || "Internal server error" 
    });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    const deleted = await Application.findOneAndDelete({ 
      _id: new mongoose.Types.ObjectId(req.params.id), 
      userId: req.userId 
    });
    if (!deleted) {
      return res.status(404).json({ message: "Application not found" });
    }
    res.json({ message: "Deleted" });
  } catch (error: any) {
    console.error("Error deleting application:", error);
    return res.status(500).json({ 
      message: "Failed to delete application", 
      error: error.message || "Internal server error" 
    });
  }
});

// Bulk operations for recruiters
router.post("/bulk", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { action, ids, data } = req.body;
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Invalid bulk operation" });
    }
    
    // Validate and convert IDs to ObjectIds
    const objectIds = ids
      .map((id: string) => {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return null;
        }
        return new mongoose.Types.ObjectId(id);
      })
      .filter(Boolean) as mongoose.Types.ObjectId[];
    
    if (objectIds.length === 0) {
      return res.status(400).json({ message: "Invalid IDs provided" });
    }
    
    const filter = { _id: { $in: objectIds }, userId: req.userId };
    
    if (action === "delete") {
      const result = await Application.deleteMany(filter);
      return res.json({ message: `Deleted ${result.deletedCount} applications`, deletedCount: result.deletedCount });
    }
    
    if (action === "updateStatus" && data?.status) {
      const validStatuses = ["applied", "interview", "offer", "rejected"];
      if (!validStatuses.includes(data.status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const result = await Application.updateMany(filter, { $set: { status: data.status } });
      return res.json({ message: `Updated ${result.modifiedCount} applications`, modifiedCount: result.modifiedCount });
    }
    
    return res.status(400).json({ message: "Invalid action" });
  } catch (error: any) {
    console.error("Error in bulk operation:", error);
    return res.status(500).json({ 
      message: "Failed to perform bulk operation", 
      error: error.message || "Internal server error" 
    });
  }
});

// Analytics endpoint
router.get("/analytics", async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userIdObj = new mongoose.Types.ObjectId(req.userId);
    const stats = await Application.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const total = await Application.countDocuments({ userId: userIdObj });
    const recent = await Application.countDocuments({
      userId: userIdObj,
      dateApplied: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    const statusMap: Record<string, number> = {};
    stats.forEach((s) => {
      statusMap[s._id] = s.count;
    });
    
    res.json({
      total,
      recent,
      byStatus: {
        applied: statusMap.applied || 0,
        interview: statusMap.interview || 0,
        offer: statusMap.offer || 0,
        rejected: statusMap.rejected || 0
      }
    });
  } catch (error: any) {
    console.error("Error fetching analytics:", error);
    return res.status(500).json({ 
      message: "Failed to fetch analytics", 
      error: error.message || "Internal server error" 
    });
  }
});

export default router;


