// lib/interview-reflection.ts
// Interview Reflection Assistant — a transparent, rule-based analyzer over the
// user's interview notes. It extracts strengths, weaknesses, recurring mistakes,
// topics needing revision, and a confidence trend over time.
//
// This is deliberately explainable (lexicon + heuristics, not a black-box LLM):
// every insight is traceable to phrases in the notes. The interface is designed
// so the analyzer could later be swapped for an LLM without changing callers.

import { Note } from "../types";
import { extractSkills } from "./skills";

export interface ReflectionInsight {
    text: string;
    /** Notes (titles) that contributed to this insight. */
    evidence: string[];
    /** How many notes mentioned this signal. */
    count: number;
}

export interface ConfidencePoint {
    date: string;
    /** -1..1 sentiment/confidence signal for that note. */
    value: number;
    label: string;
}

export interface ReflectionResult {
    strengths: ReflectionInsight[];
    weaknesses: ReflectionInsight[];
    recurringMistakes: ReflectionInsight[];
    topicsToRevise: ReflectionInsight[];
    confidenceTrend: ConfidencePoint[];
    /** Overall direction of confidence across notes. */
    trendDirection: "improving" | "declining" | "steady" | "insufficient";
    summary: string;
    /** Number of interview notes analyzed. */
    analyzed: number;
}

// Sentiment/confidence lexicons. Transparent and easy to audit/extend.
const POSITIVE = [
    "confident", "strong", "great", "well", "smooth", "nailed", "clear", "solid",
    "good", "comfortable", "prepared", "positive", "fluent", "aced", "proud",
];
const NEGATIVE = [
    "nervous", "struggled", "blanked", "forgot", "confused", "unclear", "stuck",
    "failed", "weak", "rushed", "ran out of time", "couldn't", "hard", "difficult",
    "messed up", "mistake", "rejected", "bombed", "anxious", "unprepared",
];

// Phrases that signal a recurring mistake pattern.
const MISTAKE_SIGNALS: { pattern: RegExp; label: string }[] = [
    { pattern: /ran out of time|time management|too slow|rushed/i, label: "Time management" },
    { pattern: /didn'?t clarify|missed the requirement|misread|misunderstood/i, label: "Clarifying requirements" },
    { pattern: /edge case|forgot to test|didn'?t test/i, label: "Edge cases & testing" },
    { pattern: /nervous|anxious|froze|blanked/i, label: "Interview nerves" },
    { pattern: /complexity|big o|time complexity|optimi[sz]e/i, label: "Complexity analysis" },
    { pattern: /communicat|explain|think out loud|silent/i, label: "Communication / thinking aloud" },
    { pattern: /system design|scal|architecture/i, label: "System design depth" },
    { pattern: /behavioral|star method|stories|examples/i, label: "Behavioral storytelling" },
];

function tokenize(text: string): string {
    return ` ${text.toLowerCase()} `;
}

function countMatches(text: string, terms: string[]): { hits: number; matched: string[] } {
    const hay = tokenize(text);
    const matched: string[] = [];
    for (const term of terms) {
        if (hay.includes(` ${term} `) || hay.includes(`${term}`)) {
            if (new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)) {
                matched.push(term);
            }
        }
    }
    return { hits: matched.length, matched };
}

function noteConfidence(content: string): number {
    const pos = countMatches(content, POSITIVE).hits;
    const neg = countMatches(content, NEGATIVE).hits;
    const total = pos + neg;
    if (total === 0) return 0;
    return Math.max(-1, Math.min(1, (pos - neg) / total));
}

function sortInsights(map: Map<string, ReflectionInsight>): ReflectionInsight[] {
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * Analyze a set of interview notes into reflection insights. Notes without a
 * `round` are still analyzed (treated as general interview notes). The notes
 * array IS the history; confidence trend is ordered by note date.
 */
export function analyzeReflections(notes: Note[]): ReflectionResult {
    // Consider notes that look interview-related: have a round, or mention
    // interview signals. Falls back to all notes if none are tagged.
    const interviewNotes = notes.filter(
        (n) =>
            n.round ||
            /interview|round|onsite|screen|technical|behavioral|coding/i.test(
                `${n.title} ${n.content}`
            )
    );
    const corpus = interviewNotes.length > 0 ? interviewNotes : notes;

    const strengthMap = new Map<string, ReflectionInsight>();
    const weaknessMap = new Map<string, ReflectionInsight>();
    const mistakeMap = new Map<string, ReflectionInsight>();
    const topicMap = new Map<string, ReflectionInsight>();

    const bump = (
        map: Map<string, ReflectionInsight>,
        key: string,
        text: string,
        evidence: string
    ) => {
        const existing = map.get(key);
        if (existing) {
            existing.count += 1;
            if (!existing.evidence.includes(evidence)) existing.evidence.push(evidence);
        } else {
            map.set(key, { text, evidence: [evidence], count: 1 });
        }
    };

    const sorted = [...corpus].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const confidenceTrend: ConfidencePoint[] = [];

    for (const note of sorted) {
        const content = `${note.title}\n${note.content}`;
        const evidence = note.title || note.round || "Untitled note";

        // Strengths / weaknesses from sentiment terms.
        const pos = countMatches(content, POSITIVE);
        const neg = countMatches(content, NEGATIVE);
        for (const term of pos.matched.slice(0, 3)) {
            bump(strengthMap, term, capitalize(term), evidence);
        }
        for (const term of neg.matched.slice(0, 3)) {
            bump(weaknessMap, term, capitalize(term), evidence);
        }

        // Recurring mistakes from signal phrases.
        for (const sig of MISTAKE_SIGNALS) {
            if (sig.pattern.test(content)) {
                bump(mistakeMap, sig.label, sig.label, evidence);
            }
        }

        // Topics to revise: technical skills mentioned alongside negative signal.
        const skills = extractSkills(content);
        if (neg.hits > 0) {
            for (const skill of skills) {
                bump(topicMap, skill, skill, evidence);
            }
        }

        confidenceTrend.push({
            date:
                typeof note.createdAt === "string"
                    ? note.createdAt
                    : new Date(note.createdAt).toISOString(),
            value: noteConfidence(content),
            label: evidence,
        });
    }

    // Recurring = mentioned in 2+ notes; otherwise keep top weaknesses.
    const recurringMistakes = sortInsights(mistakeMap).filter((m) => m.count >= 2);

    const trendDirection = computeTrend(confidenceTrend);

    return {
        strengths: sortInsights(strengthMap).slice(0, 5),
        weaknesses: sortInsights(weaknessMap).slice(0, 5),
        recurringMistakes:
            recurringMistakes.length > 0 ? recurringMistakes : sortInsights(mistakeMap).slice(0, 3),
        topicsToRevise: sortInsights(topicMap).slice(0, 5),
        confidenceTrend,
        trendDirection,
        summary: buildSummary(corpus.length, trendDirection, sortInsights(mistakeMap)[0]),
        analyzed: corpus.length,
    };
}

function computeTrend(points: ConfidencePoint[]): ReflectionResult["trendDirection"] {
    if (points.length < 2) return "insufficient";
    const half = Math.floor(points.length / 2);
    const firstAvg = avg(points.slice(0, half).map((p) => p.value));
    const lastAvg = avg(points.slice(half).map((p) => p.value));
    const delta = lastAvg - firstAvg;
    if (Math.abs(delta) < 0.15) return "steady";
    return delta > 0 ? "improving" : "declining";
}

function avg(nums: number[]): number {
    if (nums.length === 0) return 0;
    return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildSummary(
    count: number,
    trend: ReflectionResult["trendDirection"],
    topMistake?: ReflectionInsight
): string {
    if (count === 0) {
        return "Add interview notes to unlock reflection insights and a confidence trend.";
    }
    const trendText =
        trend === "improving"
            ? "Your confidence is trending up across recent interviews."
            : trend === "declining"
              ? "Your confidence has dipped recently — review the recurring themes below."
              : trend === "steady"
                ? "Your confidence has held steady across interviews."
                : "Add a couple more notes to chart a confidence trend.";
    const focus = topMistake ? ` Most common theme to work on: ${topMistake.text}.` : "";
    return `Analyzed ${count} interview note${count === 1 ? "" : "s"}. ${trendText}${focus}`;
}
