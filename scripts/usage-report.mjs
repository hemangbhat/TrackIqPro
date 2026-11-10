// scripts/usage-report.mjs
// Read-only product metrics for a case study or interview: how many people
// use TrackIQ and how. Prints totals only, never anyone's data.
//
//   npm run usage-report
//
// Uses MONGODB_URI from .env.local (or the environment). "Active" means the
// user created or edited a job or note in the window.

import { pathToFileURL } from "node:url";

const DAY = 24 * 60 * 60 * 1000;

const utcDay = (d) => d.toISOString().slice(0, 10);

async function distinctUsers(collection, filter = {}) {
    return new Set(await collection.distinct("userId", filter));
}

/** Compute the report from a connected MongoDB `db`, as of `now`. */
export async function usageReport(db, now = new Date()) {
    const jobs = db.collection("jobs");
    const notes = db.collection("notes");
    const offers = db.collection("offers");
    const usage = db.collection("aiusages");
    const profiles = db.collection("careerprofiles");
    const plans = db.collection("userplans");

    const since = (days) => ({ updatedAt: { $gte: new Date(now.getTime() - days * DAY) } });
    const activeIn = async (days) =>
        new Set([...(await distinctUsers(jobs, since(days))), ...(await distinctUsers(notes, since(days)))]);

    const users = new Set([...(await distinctUsers(jobs)), ...(await distinctUsers(notes))]);
    const active7 = await activeIn(7);
    const active30 = await activeIn(30);

    // Returning users: activity in at least two different ISO weeks.
    const weeks = await jobs
        .aggregate([
            { $unionWith: { coll: "notes" } },
            { $group: { _id: { user: "$userId", week: { $isoWeek: "$updatedAt" }, year: { $isoWeekYear: "$updatedAt" } } } },
            { $group: { _id: "$_id.user", weeks: { $sum: 1 } } },
            { $match: { weeks: { $gte: 2 } } },
            { $count: "n" },
        ])
        .toArray();

    const prepTotals = async (filter) =>
        (await usage.aggregate([{ $match: filter }, { $group: { _id: null, preps: { $sum: "$count" } } }]).toArray())[0]
            ?.preps ?? 0;

    return {
        users: users.size,
        activeUsers7d: active7.size,
        activeUsers30d: active30.size,
        returningUsers: weeks[0]?.n ?? 0,
        jobs: await jobs.countDocuments(),
        notes: await notes.countDocuments(),
        offers: await offers.countDocuments(),
        proUsers: await plans.countDocuments({ plan: "pro" }),
        aiOptedIn: await profiles.countDocuments({ aiEnabled: true }),
        prepsTotal: await prepTotals({}),
        preps7d: await prepTotals({ date: { $gte: utcDay(new Date(now.getTime() - 6 * DAY)) } }),
        prepUsers: (await distinctUsers(usage, { count: { $gt: 0 } })).size,
        reminderOptOuts: await profiles.countDocuments({ remindersEnabled: false }),
    };
}

async function main() {
    const { default: nextEnv } = await import("@next/env");
    const { default: mongoose } = await import("mongoose");
    nextEnv.loadEnvConfig(process.cwd());
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is not set.");
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
    const report = await usageReport(mongoose.connection.db);
    await mongoose.disconnect();
    console.log(`TrackIQ usage as of ${new Date().toISOString().slice(0, 10)}`);
    console.table(report);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    await main();
}
