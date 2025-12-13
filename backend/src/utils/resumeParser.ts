// Resume parser to extract structured data from resume text

interface ParsedResume {
  skills: string[];
  keywords: string[];
  email: string;
  experience: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    field: string;
  }>;
  certificates: string[];
}

// Common technical skills keywords (expanded list)
const TECHNICAL_SKILLS = [
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

// Education degree keywords
const DEGREE_KEYWORDS = ["bachelor", "master", "phd", "doctorate", "diploma", "certificate", "degree"];

// Common certificate keywords
const CERT_KEYWORDS = ["certified", "certification", "certificate", "license", "accredited"];

export function parseResume(text: string): ParsedResume {
  const lowerText = text.toLowerCase();
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  // Extract skills
  const skills = extractSkills(lowerText, lines);

  // Extract keywords (important terms)
  const keywords = extractKeywords(text, lowerText);

  // Extract email
  const email = extractEmail(text);

  // Extract experience
  const experience = extractExperience(text, lines);

  // Extract education
  const education = extractEducation(text, lines);

  // Extract certificates
  const certificates = extractCertificates(text, lines);

  return {
    skills: Array.from(new Set(skills)),
    keywords: Array.from(new Set(keywords)),
    email,
    experience,
    education,
    certificates: Array.from(new Set(certificates))
  };
}

function extractSkills(text: string, lines: string[]): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  // Check for skills section with more flexible matching
  const skillsSection = findSection(text, ["skills", "technical skills", "core competencies", "expertise", "technologies", "tools", "programming languages", "languages"]);
  if (skillsSection) {
    // Split by various delimiters
    const skillLines = skillsSection.split(/\n|,|;|•|·|\||\//).map((s) => s.trim().toLowerCase()).filter(s => s.length > 1);
    
    // Check each technical skill
    for (const skill of TECHNICAL_SKILLS) {
      const skillLower = skill.toLowerCase();
      // Check if skill appears in any line
      if (skillLines.some((line) => line.includes(skillLower) || line === skillLower)) {
        if (!found.includes(skill)) {
          found.push(skill);
        }
      }
    }
    
    // Also extract any capitalized tech terms that might be skills
    const capitalizedTerms = skillsSection.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
    for (const term of capitalizedTerms) {
      const termLower = term.toLowerCase();
      if (TECHNICAL_SKILLS.some(s => s.toLowerCase() === termLower || termLower.includes(s.toLowerCase()))) {
        const matchedSkill = TECHNICAL_SKILLS.find(s => s.toLowerCase() === termLower || termLower.includes(s.toLowerCase()));
        if (matchedSkill && !found.includes(matchedSkill)) {
          found.push(matchedSkill);
        }
      }
    }
  }

  // Scan entire text for technical skills (more aggressive)
  for (const skill of TECHNICAL_SKILLS) {
    const skillLower = skill.toLowerCase();
    // Check for skill with word boundaries or as part of phrases
    const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText) && !found.includes(skill)) {
      found.push(skill);
    }
  }

  return found;
}

function extractEmail(text: string): string {
  // Email regex pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailPattern);
  if (matches && matches.length > 0) {
    // Return the first email found (usually the primary contact email)
    return matches[0].toLowerCase();
  }
  return "";
}

function extractKeywords(text: string, lowerText: string): string[] {
  const keywords: string[] = [];

  // Extract capitalized words (likely important terms)
  const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  keywords.push(...capitalized.map((k) => k.toLowerCase()).slice(0, 20));

  // Extract technical terms
  keywords.push(...TECHNICAL_SKILLS.filter((skill) => lowerText.includes(skill)));

  // Extract years (experience indicators)
  const years = text.match(/\b(19|20)\d{2}\b/g) || [];
  keywords.push(...years);

  return keywords.slice(0, 30); // Limit to top 30
}

function extractExperience(text: string, lines: string[]): ParsedResume["experience"] {
  const experience: ParsedResume["experience"] = [];
  const expSection = findSection(text, ["experience", "work experience", "employment", "professional experience", "work history", "career", "positions"]);

  if (!expSection) {
    // Try to find experience patterns in entire text
    return extractExperienceFromText(text);
  }

  const expLines = expSection.split(/\n/).filter((l) => l.trim().length > 3);
  let currentExp: Partial<ParsedResume["experience"][0]> = {};
  let expEntries: ParsedResume["experience"] = [];

  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i];
    
    // Check for duration/date pattern first (most reliable)
    const durationPatterns = [
      /(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|Present|Current|Now)/i,
      /(\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|Present|Current|Now)/i,
      /(\d{4})\s*[-–—]\s*(\d{4}|Present|Current|Now)/i
    ];
    
    let durationMatch = null;
    for (const pattern of durationPatterns) {
      durationMatch = line.match(pattern);
      if (durationMatch) break;
    }
    
    if (durationMatch) {
      // Save previous entry if exists
      if (currentExp.company || currentExp.position) {
        expEntries.push({
          company: currentExp.company || "Unknown",
          position: currentExp.position || "Unknown",
          duration: durationMatch[0],
          description: (currentExp.description || "").trim()
        });
      }
      currentExp = { duration: durationMatch[0] };
    }

    // Check for company name (more flexible)
    if (!currentExp.company) {
      const companyPatterns = [
        /([A-Z][a-zA-Z\s&.,'-]+(?:Inc|LLC|Ltd|Corp|Corporation|Company|Technologies|Systems|Solutions)?)/,
        /([A-Z][a-zA-Z\s&.,'-]+(?:University|College|Institute|School))/,
        /^([A-Z][a-zA-Z\s&.,'-]{3,})/ // Any capitalized phrase
      ];
      
      for (const pattern of companyPatterns) {
        const match = line.match(pattern);
        if (match && match[1].length > 3 && match[1].length < 50) {
          currentExp.company = match[1].trim();
          break;
        }
      }
    }

    // Check for position/title (more flexible)
    if (!currentExp.position) {
      const positionPatterns = [
        /(?:Senior|Junior|Lead|Principal|Staff|Associate|Senior|Mid|Entry)?\s*([A-Z][a-zA-Z\s]+(?:Engineer|Developer|Manager|Analyst|Designer|Specialist|Architect|Consultant|Developer|Programmer|Coordinator|Assistant|Director|Officer|Executive|Representative|Intern|Trainee))/i,
        /^([A-Z][a-zA-Z\s]+(?:Engineer|Developer|Manager|Analyst|Designer|Specialist|Architect|Consultant|Developer|Programmer))/i
      ];
      
      for (const pattern of positionPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          currentExp.position = match[1].trim();
          break;
        }
      }
    }

    // Description lines (bullet points or long lines)
    if (line.match(/^[-•·]\s/) || (line.length > 30 && !durationMatch && !currentExp.company && !currentExp.position)) {
      if (!currentExp.description) currentExp.description = "";
      currentExp.description += line.replace(/^[-•·]\s*/, "").trim() + ". ";
    }

    // Save entry if we have minimum info (company OR position with duration)
    if ((currentExp.company || currentExp.position) && currentExp.duration && i === expLines.length - 1) {
      expEntries.push({
        company: currentExp.company || "Unknown",
        position: currentExp.position || "Unknown",
        duration: currentExp.duration,
        description: (currentExp.description || "").trim()
      });
    }
  }

  // Add any remaining entry
  if (currentExp.company || currentExp.position) {
    expEntries.push({
      company: currentExp.company || "Unknown",
      position: currentExp.position || "Unknown",
      duration: currentExp.duration || "Unknown",
      description: (currentExp.description || "").trim()
    });
  }

  return expEntries.length > 0 ? expEntries : extractExperienceFromText(text);
}

function extractExperienceFromText(text: string): ParsedResume["experience"] {
  const experience: ParsedResume["experience"] = [];
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 5);
  
  // Look for date patterns that might indicate experience
  const datePattern = /(\w+\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|Present|Current|Now)/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(datePattern);
    
    if (dateMatch) {
      const exp: ParsedResume["experience"][0] = {
        company: "Unknown",
        position: line.replace(dateMatch[0], "").trim() || "Unknown",
        duration: dateMatch[0],
        description: ""
      };
      
      // Try to get description from next few lines
      let desc = "";
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].match(/^[-•·]\s/) || lines[j].length > 20) {
          desc += lines[j].replace(/^[-•·]\s*/, "") + ". ";
        } else {
          break;
        }
      }
      exp.description = desc.trim();
      experience.push(exp);
    }
  }
  
  return experience;
}

function extractEducation(text: string, lines: string[]): ParsedResume["education"] {
  const education: ParsedResume["education"] = [];
  const eduSection = findSection(text, ["education", "academic", "qualifications", "academic background", "educational background"]);

  const eduLines = eduSection 
    ? eduSection.split(/\n/).filter((l) => l.trim().length > 3)
    : lines.filter((l) => {
        const lower = l.toLowerCase();
        return DEGREE_KEYWORDS.some((deg) => lower.includes(deg)) || 
               lower.includes("university") || 
               lower.includes("college") ||
               lower.includes("bachelor") ||
               lower.includes("master");
      });

  for (const line of eduLines) {
    const lowerLine = line.toLowerCase();
    const hasDegree = DEGREE_KEYWORDS.some((deg) => lowerLine.includes(deg));
    const hasInstitution = lowerLine.includes("university") || lowerLine.includes("college") || lowerLine.includes("institute") || lowerLine.includes("school");
    
    if (!hasDegree && !hasInstitution) continue;

    // More flexible degree matching
    const degreePatterns = [
      /(Bachelor|Master|PhD|Doctorate|Diploma|Certificate|B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?|B\.?E\.?|M\.?E\.?|B\.?Tech|M\.?Tech)[\s\w]*/i,
      /(Bachelor|Master|PhD|Doctorate|Diploma|Certificate)[\s\w]*of[\s\w]+/i
    ];
    
    let degreeMatch = null;
    for (const pattern of degreePatterns) {
      degreeMatch = line.match(pattern);
      if (degreeMatch) break;
    }
    
    const institutionPatterns = [
      /([A-Z][a-zA-Z\s&.,'-]+(?:University|College|Institute|School|Academy|Academy of|Polytechnic))/,
      /([A-Z][a-zA-Z\s&.,'-]{5,}(?:University|College|Institute|School|Academy))/i
    ];
    
    let institutionMatch = null;
    for (const pattern of institutionPatterns) {
      institutionMatch = line.match(pattern);
      if (institutionMatch) break;
    }
    
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    const fieldPatterns = [
      /(?:in|of|,\s*|major[ing]*\s+)([A-Z][a-zA-Z\s]+(?:Engineering|Science|Arts|Business|Management|Computer|Information|Technology|Mathematics|Physics|Chemistry|Biology|Economics|Finance|Marketing|Accounting|Law|Medicine|Education))/i,
      /([A-Z][a-zA-Z\s]+(?:Engineering|Science|Arts|Business|Management|Computer|Information|Technology|Mathematics|Physics|Chemistry|Biology|Economics|Finance|Marketing|Accounting|Law|Medicine|Education))/i
    ];
    
    let fieldMatch = null;
    for (const pattern of fieldPatterns) {
      fieldMatch = line.match(pattern);
      if (fieldMatch) break;
    }

    if (degreeMatch || institutionMatch) {
      education.push({
        degree: degreeMatch?.[0]?.trim() || line.split(",")[0]?.trim() || line.split(" ").slice(0, 3).join(" ") || "",
        institution: institutionMatch?.[1]?.trim() || "",
        year: yearMatch?.[0] || "",
        field: fieldMatch?.[1]?.trim() || ""
      });
    }
  }

  return education;
}

function extractCertificates(text: string, lines: string[]): string[] {
  const certificates: string[] = [];
  const certSection = findSection(text, ["certifications", "certificates", "licenses", "credentials", "professional certifications", "certifications & licenses"]);

  if (certSection) {
    const certLines = certSection.split(/\n|,|;/).filter((l) => l.trim().length > 3);
    for (const line of certLines) {
      const lowerLine = line.toLowerCase();
      if (CERT_KEYWORDS.some((kw) => lowerLine.includes(kw)) || 
          lowerLine.includes("aws") || 
          lowerLine.includes("google") ||
          lowerLine.includes("microsoft") ||
          lowerLine.includes("oracle") ||
          lowerLine.includes("cisco")) {
        // Extract certificate name
        let certName = line.replace(/^[-•·]\s*/, "").trim();
        // Remove common prefixes
        certName = certName.replace(/^(certified|certification|certificate|license|licensed)\s*/i, "").trim();
        if (certName.length > 5 && certName.length < 100) {
          certificates.push(certName);
        }
      }
    }
  }

  // Also scan entire text for certificate patterns
  const allLines = text.split(/\n/);
  const certPatterns = [
    /(AWS|Google|Microsoft|Oracle|Cisco|Salesforce|Adobe|IBM|Red Hat|VMware)[\s\w]+(?:Certified|Certification|Certificate)/i,
    /(Certified|Certification|Certificate|License)[\s]+([A-Z][a-zA-Z\s]+(?:Professional|Associate|Expert|Specialist|Developer|Architect|Administrator|Engineer))/i
  ];
  
  for (const line of allLines) {
    const lowerLine = line.toLowerCase();
    if (CERT_KEYWORDS.some((kw) => lowerLine.includes(kw)) && line.length > 10) {
      // Check for specific cert patterns
      for (const pattern of certPatterns) {
        const match = line.match(pattern);
        if (match) {
          const certName = match[0].trim();
          if (certName.length > 5 && !certificates.includes(certName)) {
            certificates.push(certName);
            continue;
          }
        }
      }
      
      // Generic certificate extraction
      let certName = line.replace(/^[-•·]\s*/, "").trim();
      certName = certName.replace(/^(certified|certification|certificate|license|licensed)\s*/i, "").trim();
      if (certName.length > 5 && certName.length < 100 && !certificates.includes(certName)) {
        certificates.push(certName);
      }
    }
  }

  return Array.from(new Set(certificates)); // Remove duplicates
}

function findSection(text: string, sectionNames: string[]): string | null {
  for (const sectionName of sectionNames) {
    // More flexible regex patterns
    const patterns = [
      new RegExp(`^${sectionName}[\\s:]*\\n([\\s\\S]*?)(?=\\n\\n[A-Z][A-Z\\s]+:|$)`, "im"),
      new RegExp(`${sectionName}[\\s:]*\\n([\\s\\S]*?)(?=\\n\\n[A-Z][A-Z\\s]+:|$)`, "i"),
      new RegExp(`${sectionName}[\\s:]*([\\s\\S]*?)(?=\\n\\n[A-Z][A-Z\\s]+:|$)`, "i")
    ];
    
    for (const regex of patterns) {
      const match = text.match(regex);
      if (match && match[1]) {
        const section = match[1].trim();
        if (section.length > 10) { // Ensure we got meaningful content
          return section;
        }
      }
    }
  }
  return null;
}

