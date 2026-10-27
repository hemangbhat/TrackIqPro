// lib/ai-client.ts
// Thin HTTP client for the Python AI service (ai-service/). Every call carries
// the shared secret in X-AI-Service-Key. Safe-by-default: if AI_SERVICE_URL or
// AI_SERVICE_SECRET is unset, every function is a no-op that makes no network
// call (requestPrep throws AiNotConfiguredError since it must return data).
// Env is read at call time, not module load, so tests can toggle it.

export type SourceType = "job_description" | "job_notes" | "note";

export interface IndexSource {
    sourceType: SourceType;
    sourceId: string;
    jobId: string;
    company: string;
    title: string;
    round: string;
    createdAt: string; // ISO string
    text: string;
}

export interface SourceRef {
    sourceType: SourceType;
    sourceId: string;
}

export interface PrepProfile {
    skills: string[];
    targetRole: string;
    seniority: string;
}

export interface Citation {
    sourceType: SourceType;
    sourceId: string;
    jobId: string;
    title: string;
}

export interface PrepResult {
    insufficientData: boolean;
    message: string;
    likelyQuestions: { question: string; why: string; citations: Citation[] }[];
    weakSpots: { topic: string; detail: string; citations: Citation[] }[];
    studyPlan: { item: string; citations: Citation[] }[];
}

export interface PrepInput {
    userId: string;
    jobId: string;
    jobTitle: string;
    company: string;
    focus: string;
    profile: PrepProfile;
}

export class AiNotConfiguredError extends Error {
    constructor() {
        super("AI service is not configured");
        this.name = "AiNotConfiguredError";
    }
}

export class AiServiceError extends Error {
    status: number;
    constructor(status: number, message = `AI service responded with ${status}`) {
        super(message);
        this.name = "AiServiceError";
        this.status = status;
    }
}

const INDEX_TIMEOUT_MS = 10_000;
const PREP_TIMEOUT_MS = 55_000;
const HEALTH_TIMEOUT_MS = 3_000;

/** True iff both AI_SERVICE_URL and AI_SERVICE_SECRET are set. */
export function aiConfigured(): boolean {
    return Boolean(process.env.AI_SERVICE_URL && process.env.AI_SERVICE_SECRET);
}

async function call(path: string, init: { method: string; body?: unknown; timeoutMs: number }) {
    const base = process.env.AI_SERVICE_URL!.replace(/\/+$/, "");
    let res: Response;
    try {
        res = await fetch(base + path, {
            method: init.method,
            headers: {
                "Content-Type": "application/json",
                "X-AI-Service-Key": process.env.AI_SERVICE_SECRET!,
            },
            body: init.body === undefined ? undefined : JSON.stringify(init.body),
            signal: AbortSignal.timeout(init.timeoutMs),
        });
    } catch (e) {
        // Timeouts and network failures: callers only ever see AiServiceError (status 0 = no HTTP response).
        const reason = e instanceof Error ? e.name : "unknown";
        throw new AiServiceError(0, `AI service request failed (${reason})`);
    }
    if (!res.ok) throw new AiServiceError(res.status);
    return res;
}

export async function indexSources(userId: string, sources: IndexSource[]): Promise<void> {
    if (!aiConfigured()) return;
    await call("/index", { method: "POST", body: { userId, sources }, timeoutMs: INDEX_TIMEOUT_MS });
}

export async function deleteSources(userId: string, refs: SourceRef[]): Promise<void> {
    if (!aiConfigured()) return;
    await call("/index/delete", {
        method: "POST",
        body: { userId, sources: refs },
        timeoutMs: INDEX_TIMEOUT_MS,
    });
}

/** Remove every vector the service holds for this user. */
export async function deleteUserVectors(userId: string): Promise<void> {
    if (!aiConfigured()) return;
    await call(`/users/${encodeURIComponent(userId)}`, { method: "DELETE", timeoutMs: INDEX_TIMEOUT_MS });
}

export async function requestPrep(input: PrepInput): Promise<PrepResult> {
    if (!aiConfigured()) throw new AiNotConfiguredError();
    const res = await call("/prep", { method: "POST", body: input, timeoutMs: PREP_TIMEOUT_MS });
    return (await res.json()) as PrepResult;
}

/** Health check; never throws. False when unconfigured, unreachable, or unhealthy. */
export async function pingHealth(): Promise<boolean> {
    if (!aiConfigured()) return false;
    try {
        // /health needs no key, but sending it is harmless.
        await call("/health", { method: "GET", timeoutMs: HEALTH_TIMEOUT_MS });
        return true;
    } catch {
        return false;
    }
}
