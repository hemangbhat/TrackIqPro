// lib/skills.ts
// A curated, transparent skill lexicon used to extract technologies/skills from
// free-text job descriptions and titles. This is intentionally explainable: we
// match known terms (and their aliases) rather than using any opaque model.

export type SkillCategory =
    | "language"
    | "frontend"
    | "backend"
    | "data"
    | "cloud"
    | "devops"
    | "mobile"
    | "practice";

export interface SkillDef {
    /** Canonical display name. */
    name: string;
    category: SkillCategory;
    /** Lowercase aliases/synonyms matched against text (whole-word). */
    aliases: string[];
}

/**
 * The lexicon. Each entry's `name` plus `aliases` are matched case-insensitively
 * with word boundaries against job text. Keep aliases specific to avoid false
 * positives (e.g. "go" → "golang").
 */
export const SKILL_LEXICON: SkillDef[] = [
    { name: "JavaScript", category: "language", aliases: ["javascript", "js"] },
    { name: "TypeScript", category: "language", aliases: ["typescript", "ts"] },
    { name: "Python", category: "language", aliases: ["python"] },
    { name: "Java", category: "language", aliases: ["java"] },
    { name: "Go", category: "language", aliases: ["golang", "go lang"] },
    { name: "Rust", category: "language", aliases: ["rust"] },
    { name: "C#", category: "language", aliases: ["c#", "csharp", ".net", "dotnet"] },
    { name: "Ruby", category: "language", aliases: ["ruby", "rails", "ruby on rails"] },
    { name: "PHP", category: "language", aliases: ["php", "laravel"] },
    { name: "SQL", category: "data", aliases: ["sql", "postgres", "postgresql", "mysql"] },
    { name: "React", category: "frontend", aliases: ["react", "react.js", "reactjs"] },
    { name: "Next.js", category: "frontend", aliases: ["next.js", "nextjs", "next js"] },
    { name: "Vue", category: "frontend", aliases: ["vue", "vue.js", "vuejs"] },
    { name: "Angular", category: "frontend", aliases: ["angular"] },
    { name: "Svelte", category: "frontend", aliases: ["svelte", "sveltekit"] },
    { name: "Tailwind CSS", category: "frontend", aliases: ["tailwind", "tailwindcss"] },
    { name: "HTML/CSS", category: "frontend", aliases: ["html", "css", "html5", "css3"] },
    { name: "Node.js", category: "backend", aliases: ["node", "node.js", "nodejs"] },
    { name: "Express", category: "backend", aliases: ["express", "express.js"] },
    { name: "GraphQL", category: "backend", aliases: ["graphql"] },
    { name: "REST APIs", category: "backend", aliases: ["rest", "restful", "rest api", "rest apis"] },
    { name: "MongoDB", category: "data", aliases: ["mongodb", "mongo", "mongoose"] },
    { name: "Redis", category: "data", aliases: ["redis"] },
    { name: "Kafka", category: "data", aliases: ["kafka"] },
    { name: "AWS", category: "cloud", aliases: ["aws", "amazon web services"] },
    { name: "GCP", category: "cloud", aliases: ["gcp", "google cloud"] },
    { name: "Azure", category: "cloud", aliases: ["azure"] },
    { name: "Docker", category: "devops", aliases: ["docker", "containers"] },
    { name: "Kubernetes", category: "devops", aliases: ["kubernetes", "k8s"] },
    { name: "CI/CD", category: "devops", aliases: ["ci/cd", "cicd", "github actions", "continuous integration"] },
    { name: "Terraform", category: "devops", aliases: ["terraform"] },
    { name: "React Native", category: "mobile", aliases: ["react native"] },
    { name: "Swift", category: "mobile", aliases: ["swift", "swiftui"] },
    { name: "Kotlin", category: "mobile", aliases: ["kotlin"] },
    { name: "Machine Learning", category: "data", aliases: ["machine learning", "ml", "tensorflow", "pytorch"] },
    { name: "Data Analysis", category: "data", aliases: ["data analysis", "pandas", "numpy"] },
    { name: "System Design", category: "practice", aliases: ["system design", "distributed systems", "scalability"] },
    { name: "Testing", category: "practice", aliases: ["testing", "unit test", "jest", "vitest", "cypress", "tdd"] },
    { name: "Agile", category: "practice", aliases: ["agile", "scrum"] },
    { name: "Microservices", category: "practice", aliases: ["microservices", "micro-services"] },
];

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract canonical skill names present in the given free text. Matching is
 * case-insensitive and uses loose word boundaries so "node.js" and "React"
 * are detected while avoiding partial-word false positives.
 */
export function extractSkills(text: string | undefined | null): string[] {
    if (!text) return [];
    const haystack = ` ${text.toLowerCase()} `;
    const found = new Set<string>();

    for (const skill of SKILL_LEXICON) {
        for (const alias of [skill.name.toLowerCase(), ...skill.aliases]) {
            const a = escapeRegExp(alias);
            // Boundary that tolerates symbols like #, ., / in tech names.
            // Leading boundary excludes "." so aliases like "js" don't match
            // inside "node.js"; trailing boundary allows "." so "AWS." matches.
            const re = new RegExp(`(^|[^a-z0-9+#.])${a}([^a-z0-9+#]|$)`, "i");
            if (re.test(haystack)) {
                found.add(skill.name);
                break;
            }
        }
    }
    return Array.from(found);
}

/** Look up a skill definition by canonical name. */
export function getSkillDef(name: string): SkillDef | undefined {
    return SKILL_LEXICON.find((s) => s.name === name);
}

/** Normalize a free-text user skill to a canonical lexicon name when possible. */
export function canonicalizeSkill(raw: string): string {
    const matched = extractSkills(raw);
    return matched[0] ?? raw.trim();
}
