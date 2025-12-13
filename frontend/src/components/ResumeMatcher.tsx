import React, { useState } from "react";
import { api } from "../api/client";
import toast from "react-hot-toast";
import { extractTextFromPDF, isPDFFile } from "../utils/pdfParser";
import { extractTextWithOCR, isImageFile } from "../utils/ocrParser";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MatchResult {
  score: number;
  matchPercentage: number;
  decision: "shortlisted" | "rejected" | "low_priority";
  threshold: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  parsedResume?: {
    skills: string[];
    keywords: string[];
    experience: Array<{ company: string; position: string; duration: string; description: string }>;
    education: Array<{ degree: string; institution: string; year: string; field: string }>;
    certificates: string[];
  };
}

interface BulkResult {
  id: string;
  fileName: string;
  matchPercentage: number;
  status: "shortlisted" | "rejected" | "low_priority";
  email?: string;
  skills: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  error?: string;
}

interface Resume {
  _id: string;
  fileName: string;
  matchPercentage: number;
  matchScore: number;
  status: "shortlisted" | "rejected" | "low_priority";
  email?: string;
  skills: string[];
  keywords: string[];
  experience: Array<{ company: string; position: string; duration: string; description: string }>;
  education: Array<{ degree: string; institution: string; year: string; field: string }>;
  certificates: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  createdAt: string;
}

export const ResumeMatcher: React.FC = () => {
  const [mode, setMode] = useState<"single" | "bulk">("bulk");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescriptionId, setJobDescriptionId] = useState("");
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("matchScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const readFile = async (file: File): Promise<string> => {
    try {
      // Handle PDF files
      if (isPDFFile(file)) {
        toast.loading("Extracting text from PDF...", { id: "pdf-extract" });
        try {
          const text = await extractTextFromPDF(file);
          toast.success("PDF extracted successfully!", { id: "pdf-extract" });
          return text;
        } catch (error: any) {
          toast.error(`PDF extraction failed: ${error.message}. Trying OCR...`, { id: "pdf-extract" });
          // Fallback to OCR if PDF parsing fails (might be scanned PDF)
          try {
            const text = await extractTextWithOCR(file);
            toast.success("OCR extraction successful!", { id: "pdf-extract" });
            return text;
          } catch (ocrError: any) {
            toast.error(`OCR also failed: ${ocrError.message}`, { id: "pdf-extract" });
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
          }
        }
      }
      
      // Handle image files with OCR
      if (isImageFile(file)) {
        toast.loading("Extracting text using OCR...", { id: "ocr-extract" });
        try {
          const text = await extractTextWithOCR(file);
          toast.success("OCR extraction successful!", { id: "ocr-extract" });
          return text;
        } catch (error: any) {
          toast.error(`OCR failed: ${error.message}`, { id: "ocr-extract" });
          throw new Error(`Failed to extract text from image: ${error.message}`);
        }
      }
      
      // Handle text files
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") {
            // Clean up the text
            let cleaned = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            // Remove excessive whitespace but keep structure
            cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
            resolve(cleaned);
            return;
          }
          if (result instanceof ArrayBuffer) {
            try {
              // Try UTF-8 first
              const decoded = new TextDecoder('utf-8', { fatal: false }).decode(result);
              resolve(decoded);
            } catch {
              // Fallback to latin1
              const decoded = new TextDecoder('latin1').decode(result);
              resolve(decoded);
            }
            return;
          }
          reject(new Error("Unsupported file content"));
        };
        reader.onerror = () => reject(new Error(`Could not read file: ${file.name}`));
        // Try reading as text (works for .txt, .md, and some other text formats)
        reader.readAsText(file, 'UTF-8');
      });
    } catch (error: any) {
      throw error;
    }
  };

  const handleSingleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/match", { resumeText, jobDescription });
      setResult(data);
      toast.success(data.decision === "shortlisted" ? "Shortlisted!" : data.decision === "low_priority" ? "Low Priority" : "Rejected");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Match failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resumeFiles.length === 0) {
      toast.error("Please select at least one resume file");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please provide job description");
      return;
    }

    setLoading(true);
    try {
      const jdId = jobDescriptionId || `jd-${Date.now()}`;
      const formData = new FormData();
      resumeFiles.forEach((file) => {
        formData.append("resumes", file);
      });
      formData.append("jobDescription", jobDescription);
      formData.append("jobDescriptionId", jdId);

      const { data } = await api.post("/match/bulk", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setBulkResults(data.results);
      setJobDescriptionId(jdId);
      toast.success(`Processed ${data.processed} resumes`);
      
      // Fetch ranked resumes
      fetchResumes(jdId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Bulk upload failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchResumes = async (jdId: string) => {
    try {
      const params: Record<string, string> = { sortBy, order: sortOrder };
      if (filterStatus) params.status = filterStatus;
      
      const { data } = await api.get(`/match/resumes/${jdId}`, { params });
      setResumes(data.resumes);
    } catch (err: any) {
      toast.error("Failed to fetch resumes");
    }
  };

  React.useEffect(() => {
    if (jobDescriptionId) {
      fetchResumes(jobDescriptionId);
    }
  }, [filterStatus, sortBy, sortOrder, jobDescriptionId]);

  const getStatusBadge = (status: string) => {
    const classes = {
      shortlisted: "bg-green-100 text-green-700 border-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
      low_priority: "bg-yellow-100 text-yellow-700 border-yellow-200"
    };
    return classes[status as keyof typeof classes] || classes.rejected;
  };

  const downloadAsExcel = () => {
    if (resumes.length === 0) {
      toast.error("No resumes to download");
      return;
    }

    const data = resumes.map((r) => ({
      "Resume Name": r.fileName,
      "Match Score": r.matchPercentage,
      "Email": r.email || "Not found",
      "Status": r.status,
      "Skills": r.skills.join(", "),
      "Matched Keywords": r.matchedKeywords.slice(0, 10).join(", "),
      "Missing Keywords": r.missingKeywords.slice(0, 10).join(", ")
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resume Matches");
    XLSX.writeFile(wb, `resume_matches_${Date.now()}.xlsx`);
    toast.success("Excel file downloaded!");
  };

  const downloadAsPDF = () => {
    if (resumes.length === 0) {
      toast.error("No resumes to download");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Resume Match Results", 14, 20);

    const tableData = resumes.map((r) => [
      r.fileName,
      `${r.matchPercentage}%`,
      r.email || "Not found",
      r.status
    ]);

    autoTable(doc, {
      head: [["Resume Name", "Match Score", "Email", "Status"]],
      body: tableData,
      startY: 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.save(`resume_matches_${Date.now()}.pdf`);
    toast.success("PDF file downloaded!");
  };

  const handleReset = () => {
    setResumeText("");
    setJobDescription("");
    setJobDescriptionId("");
    setResumeFiles([]);
    setResult(null);
    setBulkResults([]);
    setResumes([]);
    setFilterStatus("");
    setSortBy("matchScore");
    setSortOrder("desc");
    toast.success("All data cleared!");
  };

  return (
    <section className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Resume Matcher & Ranker</h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload resumes (single or bulk) and match against job description. Resumes with ≥80% match are auto-shortlisted.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("single")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === "single"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Single Match
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              mode === "bulk"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Bulk Upload
          </button>
        </div>
      </div>

      {mode === "single" ? (
        <form className="space-y-4" onSubmit={handleSingleMatch}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Resume</label>
                <label className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-700">
                  Upload file
                  <input
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setLoading(true);
                          const text = await readFile(file);
                          setResumeText(text);
                          toast.success("File loaded successfully!");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to read file");
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                  />
                </label>
              </div>
              <textarea
                className="w-full border rounded-lg p-3 h-40 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                placeholder="Paste resume text or upload file"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Job Description</label>
                <label className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-700">
                  Upload file
                  <input
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setLoading(true);
                          const text = await readFile(file);
                          setJobDescription(text);
                          toast.success("File loaded successfully!");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to read file");
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                  />
                </label>
              </div>
              <textarea
                className="w-full border rounded-lg p-3 h-40 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                placeholder="Paste job description or upload file"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-indigo-500 transition disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Checking..." : "Check Match"}
            </button>
            {(result || resumeText || jobDescription) && (
              <button
                type="button"
                onClick={() => {
                  setResumeText("");
                  setJobDescription("");
                  setResult(null);
                  toast.success("Form cleared!");
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold shadow hover:bg-gray-500 transition"
              >
                Reset
              </button>
            )}
          </div>

          {result && (
            <div className={`p-4 rounded-lg border-2 ${getStatusBadge(result.decision)}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg">{result.decision.toUpperCase()}</span>
                <span className="text-2xl font-bold">{result.matchPercentage}% Match</span>
              </div>
              {result.parsedResume && (
                <div className="mt-3 space-y-2 text-sm">
                  <div><strong>Skills:</strong> {result.parsedResume.skills.slice(0, 10).join(", ")}</div>
                  {result.matchedKeywords.length > 0 && (
                    <div><strong>Matched Keywords:</strong> {result.matchedKeywords.slice(0, 10).join(", ")}</div>
                  )}
                  {result.missingKeywords.length > 0 && (
                    <div><strong>Missing Keywords:</strong> {result.missingKeywords.slice(0, 10).join(", ")}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-6">
          <form className="space-y-4" onSubmit={handleBulkUpload}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Job Description</label>
              <textarea
                className="w-full border rounded-lg p-3 h-32 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                placeholder="Paste job description"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Upload Resumes (Multiple files supported)</label>
              <input
                type="file"
                accept="*/*"
                multiple
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setResumeFiles(files);
                }}
                required
              />
              {resumeFiles.length > 0 && (
                <div className="text-sm text-gray-600">
                  {resumeFiles.length} file(s) selected: {resumeFiles.map((f) => f.name).join(", ")}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-indigo-500 transition disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Processing..." : `Upload & Match ${resumeFiles.length} Resume(s)`}
              </button>
              {(resumeFiles.length > 0 || jobDescription || resumes.length > 0) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold shadow hover:bg-gray-500 transition"
                >
                  Reset
                </button>
              )}
            </div>
          </form>

          {resumes.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Filter:</label>
                  <select
                    className="border rounded px-3 py-1"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="low_priority">Low Priority</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Sort by:</label>
                  <select
                    className="border rounded px-3 py-1"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="matchScore">Match Score</option>
                    <option value="matchPercentage">Match %</option>
                    <option value="createdAt">Date</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Order:</label>
                  <select
                    className="border rounded px-3 py-1"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                  >
                    <option value="desc">High to Low</option>
                    <option value="asc">Low to High</option>
                  </select>
                </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={downloadAsExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    Download Excel
                  </button>
                  <button
                    onClick={downloadAsPDF}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Ranked Resumes ({resumes.length})</h3>
                {resumes.map((resume) => (
                  <div
                    key={resume._id}
                    className={`p-4 rounded-lg border-2 ${getStatusBadge(resume.status)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{resume.fileName}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          Uploaded: {new Date(resume.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(resume.status)}`}>
                          {resume.status.toUpperCase()}
                        </div>
                        <div className="text-2xl font-bold mt-1">{resume.matchPercentage}%</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <strong>Email:</strong> {resume.email || "Not found"}
                      </div>
                      <div>
                        <strong>Skills:</strong> {resume.skills.slice(0, 8).join(", ")}
                        {resume.skills.length > 8 && ` +${resume.skills.length - 8} more`}
                      </div>
                      <div>
                        <strong>Experience:</strong> {resume.experience.length} position(s)
                      </div>
                      <div>
                        <strong>Education:</strong> {resume.education.length} entry/entries
                      </div>
                      <div>
                        <strong>Certificates:</strong> {resume.certificates.length}
                      </div>
                    </div>

                    {resume.matchedKeywords.length > 0 && (
                      <div className="mt-2">
                        <strong className="text-sm">Matched Keywords:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resume.matchedKeywords.slice(0, 10).map((kw, i) => (
                            <span key={i} className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {resume.missingKeywords.length > 0 && (
                      <div className="mt-2">
                        <strong className="text-sm">Missing Keywords:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resume.missingKeywords.slice(0, 10).map((kw, i) => (
                            <span key={i} className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
