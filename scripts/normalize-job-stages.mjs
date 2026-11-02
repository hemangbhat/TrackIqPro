// scripts/normalize-job-stages.mjs
// Fix job records whose stage isn't one of the exact lowercase values
// (e.g. "Applied" saved before the schema enforced lowercase).
//
//   node scripts/normalize-job-stages.mjs            # preview only, changes nothing
//   node scripts/normalize-job-stages.mjs --apply    # write the fixes
//
// Uses MONGODB_URI from .env.local (or the environment). A value that still
// isn't a known stage after lowercasing and trimming is reported, not changed.

import nextEnv from "@next/env";
import mongoose from "mongoose";

const STAGES = ["applied", "screening", "interview", "offer", "rejected", "accepted", "withdrawn"];
const apply = process.argv.includes("--apply");

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
const jobs = mongoose.connection.db.collection("jobs");

// Group by stored value so the output shows counts, never job contents.
const groups = await jobs
    .aggregate([{ $match: { stage: { $nin: STAGES } } }, { $group: { _id: "$stage", n: { $sum: 1 } } }])
    .toArray();

let fixed = 0;
for (const { _id: stored, n } of groups) {
    const target = typeof stored === "string" ? stored.trim().toLowerCase() : null;
    if (!target || !STAGES.includes(target)) {
        console.log(`  ${JSON.stringify(stored)}: ${n} job(s), not a known stage - left as is`);
        continue;
    }
    if (apply) {
        const res = await jobs.updateMany({ stage: stored }, { $set: { stage: target } });
        fixed += res.modifiedCount;
        console.log(`  ${JSON.stringify(stored)} -> "${target}": ${res.modifiedCount} job(s) updated`);
    } else {
        console.log(`  ${JSON.stringify(stored)} -> "${target}": ${n} job(s) would be updated`);
    }
}

if (groups.length === 0) console.log("All job stages are already valid.");
else if (!apply) console.log("\nPreview only. Re-run with --apply to write these changes.");
else console.log(`\nUpdated ${fixed} job(s).`);

await mongoose.disconnect();
