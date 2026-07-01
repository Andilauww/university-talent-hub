export const CERTIFICATE_LEVELS = [
  { value: "Local", label: "Local", points: 1 },
  { value: "Regional", label: "Regional", points: 3 },
  { value: "National", label: "National", points: 5 },
  { value: "International", label: "International", points: 10 },
] as const;

export const PORTFOLIO_CATEGORIES = [
  { value: "Personal", label: "Personal", points: 2 },
  { value: "Freelance", label: "Freelance", points: 5 },
  { value: "Industry", label: "Industry", points: 8 },
  { value: "Competition", label: "Competition Winner", points: 10 },
] as const;

export function certificatePoints(level: string) {
  return CERTIFICATE_LEVELS.find((l) => l.value === level)?.points ?? 1;
}

export function portfolioPoints(category: string) {
  return PORTFOLIO_CATEGORIES.find((c) => c.value === category)?.points ?? 2;
}

// Rule-based AI recommendation engine (no external AI).
export interface Recommendation {
  skill: string;
  items: { title: string; type: string; description: string }[];
}

const RULES: Record<string, Recommendation["items"]> = {
  react: [
    { title: "Frontend Internship", type: "Internship", description: "Apply your React skills at a fast-growing product team." },
    { title: "React Competition", type: "Competition", description: "Join a hackathon and build a React app under pressure." },
    { title: "Frontend Projects", type: "Project", description: "Ship polished UI projects to strengthen your portfolio." },
  ],
  python: [
    { title: "Machine Learning Track", type: "Learning Path", description: "Grow into ML with Python-based model building." },
    { title: "Backend Internship", type: "Internship", description: "Build scalable services and APIs with Python." },
    { title: "AI Competition", type: "Competition", description: "Compete in an AI/ML challenge to prove your skills." },
  ],
  "ui ux": [
    { title: "UI Design Competition", type: "Competition", description: "Showcase your design thinking in a UI contest." },
    { title: "Figma Challenge", type: "Challenge", description: "Sharpen prototyping skills in a timed Figma challenge." },
    { title: "Design Internship", type: "Internship", description: "Craft real product experiences as a design intern." },
  ],
  figma: [
    { title: "Figma Challenge", type: "Challenge", description: "Master advanced prototyping and design systems." },
    { title: "Design Internship", type: "Internship", description: "Join a design team and turn ideas into interfaces." },
    { title: "Portfolio Redesign", type: "Project", description: "Rebuild your portfolio to reflect strong design craft." },
  ],
  "machine learning": [
    { title: "AI Research Assistant", type: "Opportunity", description: "Support real ML research at a university lab." },
    { title: "Kaggle Competition", type: "Competition", description: "Test your models against a global community." },
    { title: "ML Engineer Internship", type: "Internship", description: "Deploy ML models into production systems." },
  ],
  "node.js": [
    { title: "Backend Internship", type: "Internship", description: "Build robust APIs with Node.js and databases." },
    { title: "API Project", type: "Project", description: "Design and document a production-grade REST API." },
    { title: "Full-Stack Challenge", type: "Challenge", description: "Combine frontend and Node backend in one build." },
  ],
  sql: [
    { title: "Data Analyst Internship", type: "Internship", description: "Turn raw data into insights with advanced SQL." },
    { title: "Database Project", type: "Project", description: "Design and optimize a relational schema end-to-end." },
  ],
  java: [
    { title: "Software Engineer Internship", type: "Internship", description: "Build enterprise applications with Java." },
    { title: "Backend Project", type: "Project", description: "Create a scalable service using Java frameworks." },
  ],
  flutter: [
    { title: "Mobile Developer Internship", type: "Internship", description: "Ship cross-platform apps with Flutter." },
    { title: "App Competition", type: "Competition", description: "Build a mobile app in a hackathon setting." },
  ],
  django: [
    { title: "Backend Internship", type: "Internship", description: "Develop web backends with Django." },
    { title: "SaaS Project", type: "Project", description: "Launch a full Django-powered web product." },
  ],
};

export function getRecommendations(skills: string[]): Recommendation[] {
  const seen = new Set<string>();
  const result: Recommendation[] = [];
  for (const raw of skills) {
    const key = raw.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const items = RULES[key];
    if (items) result.push({ skill: raw, items });
  }
  return result;
}