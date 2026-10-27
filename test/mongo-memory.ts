// test/mongo-memory.ts
// Reusable in-memory MongoDB for tests that need a real database (atomic
// updates, unique indexes). The first run downloads a MongoDB binary.

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let server: MongoMemoryServer | null = null;

/** Start an in-memory MongoDB and connect mongoose to it. */
export async function startMemoryMongo(): Promise<void> {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri());
}

/** Disconnect mongoose and stop the in-memory MongoDB. */
export async function stopMemoryMongo(): Promise<void> {
    await mongoose.disconnect();
    await server?.stop();
    server = null;
}
