import { NextApiRequest, NextApiResponse } from "next";
import { connectDB, getConnectionState } from "../../lib/db";

// Public health check: verifies the server is up and the database is reachable.
// Does not require auth and never returns user data.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    try {
        await connectDB();
        return res.status(200).json({ status: "ok", db: getConnectionState() });
    } catch (error) {
        return res.status(503).json({
            status: "degraded",
            db: "unreachable",
            message:
                process.env.NODE_ENV !== "production"
                    ? error instanceof Error
                        ? error.message
                        : String(error)
                    : undefined,
        });
    }
}
