// Enhanced matching algorithm for resume vs job description

interface MatchResult {
  matchScore: number;
  matchPercentage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  status: "shortlisted" | "rejected" | "low_priority";
}

export function matchResumeToJD(
  resumeKeywords: string[],
  resumeSkills: string[],
  resumeText: string,
  jobDescription: string
): MatchResult {
  const jdLower = jobDescription.toLowerCase();
  const resumeLower = resumeText.toLowerCase();

  // Extract keywords from JD
  const jdKeywords = extractJDKeywords(jobDescription);
  const jdSkills = extractJDSkills(jobDescription);

  // Calculate matches
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  // Check resume keywords against JD
  for (const keyword of jdKeywords) {
    const found = resumeKeywords.some((rk) => rk.includes(keyword) || keyword.includes(rk)) ||
                  resumeLower.includes(keyword.toLowerCase());
    if (found) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }

  // Check skills match
  let skillsMatch = 0;
  for (const skill of jdSkills) {
    if (resumeSkills.some((rs) => rs.includes(skill) || skill.includes(rs)) ||
        resumeLower.includes(skill.toLowerCase())) {
      skillsMatch++;
      if (!matchedKeywords.includes(skill)) {
        matchedKeywords.push(skill);
      }
    } else {
      if (!missingKeywords.includes(skill)) {
        missingKeywords.push(skill);
      }
    }
  }

  // Calculate scores
  const keywordMatchRatio = jdKeywords.length > 0 ? matchedKeywords.length / jdKeywords.length : 0;
  const skillMatchRatio = jdSkills.length > 0 ? skillsMatch / jdSkills.length : 0;
  
  // Overall text similarity (Jaccard similarity)
  const textSimilarity = calculateTextSimilarity(resumeLower, jdLower);

  // Weighted score: 40% keywords, 40% skills, 20% text similarity
  const matchScore = (
    keywordMatchRatio * 0.4 +
    skillMatchRatio * 0.4 +
    textSimilarity * 0.2
  );

  const matchPercentage = Math.round(matchScore * 100);

  // Determine status
  let status: "shortlisted" | "rejected" | "low_priority";
  if (matchPercentage >= 80) {
    status = "shortlisted";
  } else if (matchPercentage >= 50) {
    status = "low_priority";
  } else {
    status = "rejected";
  }

  return {
    matchScore,
    matchPercentage,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    missingKeywords: Array.from(new Set(missingKeywords)),
    status
  };
}

function extractJDKeywords(jd: string): string[] {
  const keywords: string[] = [];
  const lowerJD = jd.toLowerCase();

  // Extract important capitalized terms (company names, technologies, etc.)
  const capitalized = jd.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  const capKeywords = capitalized
    .map((k) => k.toLowerCase())
    .filter(k => k.length > 2 && !['the', 'and', 'or', 'but', 'for', 'with', 'from', 'this', 'that'].includes(k))
    .slice(0, 20);
  keywords.push(...capKeywords);

  // Extract common job requirement keywords
  const requirementKeywords = [
    "experience", "years", "required", "preferred", "must have", "should have", "nice to have",
    "knowledge", "understanding", "familiar", "proficient", "expert", "advanced", "intermediate",
    "bachelor", "master", "degree", "certification", "diploma", "phd", "doctorate",
    "responsibilities", "duties", "qualifications", "requirements", "skills", "abilities",
    "team", "collaboration", "communication", "leadership", "management", "problem solving"
  ];

  for (const kw of requirementKeywords) {
    if (lowerJD.includes(kw) && !keywords.includes(kw)) {
      keywords.push(kw);
    }
  }

  // Extract years of experience patterns
  const yearsPattern = /\b(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi;
  const yearsMatches = jd.match(yearsPattern);
  if (yearsMatches) {
    keywords.push(...yearsMatches.map(m => m.toLowerCase()));
  }

  // Extract education level requirements
  const eduPatterns = [
    /\b(bachelor|master|phd|doctorate|diploma)\s*(?:degree|in|of)?/gi,
    /\b(bs|ms|mba|phd|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?)\b/gi
  ];
  for (const pattern of eduPatterns) {
    const matches = jd.match(pattern);
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()));
    }
  }

  return Array.from(new Set(keywords)).slice(0, 30);
}

function extractJDSkills(jd: string): string[] {
  const skills: string[] = [];
  const lowerJD = jd.toLowerCase();

  // Expanded technical skills list (same as resume parser)
  const technicalSkills = [
    // Programming Languages
    "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust", "php", "ruby",
    "swift", "kotlin", "scala", "r", "matlab", "perl", "shell", "bash", "powershell",
    // Frontend Frameworks
    "react", "vue", "angular", "svelte", "next.js", "nuxt", "gatsby", "remix",
    "html", "css", "sass", "scss", "less", "tailwind", "bootstrap", "material-ui", "ant design",
    // Backend Frameworks
    "node", "express", "django", "flask", "fastapi", "spring", "spring boot", "laravel", "symfony",
    "nest.js", "koa", "hapi", "rails", "asp.net", "dotnet", ".net",
    // Databases
    "mongodb", "postgresql", "mysql", "mariadb", "sqlite", "oracle", "sql server", "redis", 
    "elasticsearch", "cassandra", "dynamodb", "couchdb", "neo4j", "firebase", "supabase",
    // Cloud & DevOps
    "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform", "ansible", "chef", "puppet",
    "jenkins", "github actions", "gitlab ci", "circleci", "travis ci", "azure devops",
    "git", "svn", "mercurial", "ci/cd", "continuous integration", "continuous deployment",
    // Tools & Technologies
    "rest", "graphql", "soap", "microservices", "api", "web services", "json", "xml", "yaml",
    "linux", "unix", "windows", "macos", "nginx", "apache", "iis",
    // Data & Analytics
    "machine learning", "ml", "ai", "artificial intelligence", "data science", "analytics", "big data",
    "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "jupyter", "tableau", "power bi",
    // Methodologies
    "agile", "scrum", "kanban", "devops", "testing", "tdd", "bdd", "unit testing", "integration testing",
    "selenium", "cypress", "jest", "mocha", "jasmine", "pytest", "junit",
    // Mobile
    "react native", "flutter", "ionic", "xamarin", "android", "ios", "swift", "kotlin",
    // Other
    "blockchain", "ethereum", "solidity", "web3", "cybersecurity", "penetration testing"
  ];

  // Check for skills with word boundaries for better matching
  for (const skill of technicalSkills) {
    const skillLower = skill.toLowerCase();
    // Use regex for better matching (word boundaries)
    const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerJD)) {
      skills.push(skill);
    }
  }

  return Array.from(new Set(skills));
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const tokens1 = normalizeText(text1);
  const tokens2 = normalizeText(text2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function normalizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !["the", "and", "or", "but", "for", "with", "from", "this", "that"].includes(w));
}

