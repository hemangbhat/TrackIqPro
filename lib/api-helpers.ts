import { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";

export interface AuthenticatedRequest extends NextApiRequest {
    userId: string;
}

/**
 * Middleware to authenticate requests using Clerk
 */
export function withAuth(
    handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const { userId } = getAuth(req);

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized: Authentication required" });
        }

        (req as AuthenticatedRequest).userId = userId;
        return handler(req as AuthenticatedRequest, res);
    };
}

/**
 * Error response helper
 */
export function errorResponse(
    res: NextApiResponse,
    statusCode: number,
    message: string,
    details?: unknown
) {
    const body: { error: string; details?: string } = { error: message };
    if (details && process.env.NODE_ENV !== "production") {
        body.details = details instanceof Error ? details.message : String(details);
    }
    return res.status(statusCode).json(body);
}

/**
 * Success response helper
 */
export function successResponse(res: NextApiResponse, data: unknown, statusCode = 200) {
    return res.status(statusCode).json(data);
}

/**
 * Method not allowed handler
 */
export function methodNotAllowed(res: NextApiResponse, allowedMethods: string[]) {
    res.setHeader("Allow", allowedMethods);
    return res.status(405).json({ error: `Method not allowed. Allowed: ${allowedMethods.join(", ")}` });
}

/**
 * Validate required fields
 */
export function validateRequiredFields(
    body: Record<string, unknown>,
    requiredFields: string[]
): { valid: boolean; missing?: string[] } {
    const missing = requiredFields.filter(field => !body[field]);
    
    if (missing.length > 0) {
        return { valid: false, missing };
    }
    
    return { valid: true };
}

/**
 * True when `id` is a 24-char hex MongoDB ObjectId. Checking up front turns a
 * malformed id into a clean 400 instead of a Mongoose CastError (500).
 */
export function isObjectId(id: unknown): id is string {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

/**
 * Generate unique ID with prefix
 */
export function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
