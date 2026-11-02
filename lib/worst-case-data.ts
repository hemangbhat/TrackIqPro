// lib/worst-case-data.ts
// Worst realistic data for the dev-only stress page (/demo/break-ui). Every
// value is something a real user produces or the limit the Mongoose models
// accept (models/Job.ts, Note.ts, Offer.ts). Kept as the regression fixture
// for the next time someone touches the dashboard components.

import { Job, Offer, Note } from "../types";
import type { CareerProfile } from "./career-fit";
import { demoJobs, demoOffers, demoNotes, DEMO_PROFILE } from "./demo-data";

export type FixtureKind = "demo" | "worst" | "empty" | "one" | "huge";

export interface Fixture {
    jobs: Job[];
    offers: Offer[];
    notes: Note[];
    profile: CareerProfile;
}

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

function job(id: string, fields: Partial<Job> & Pick<Job, "title" | "company">): Job {
    return {
        _id: id,
        userId: "worst",
        stage: "applied",
        status: "active",
        dateApplied: daysAgo(10),
        createdAt: daysAgo(10),
        updatedAt: daysAgo(10),
        ...fields,
    };
}

const LONG_DESCRIPTION = Array.from(
    { length: 40 },
    () =>
        "You will own the TypeScript and React surface of our payments dashboard, partner with design on accessibility, and keep CI green across Node.js, PostgreSQL and AWS services."
).join(" ");

export const worstJobs: Job[] = [
    job("w-1", {
        // 197 characters: close to the 200 limit, and a real posting title shape.
        title: "Senior Staff Software Engineer, Developer Experience & Internal Platform Tooling (Infrastructure Reliability, Payments Core), Remote-first with EMEA/AMER overlap",
        company: "Northwind Industries Holdings International Logistics & Supply Chain Solutions GmbH & Co. KG",
        location: "Remote, must reside in Germany, Austria, Switzerland, Poland or the Czech Republic",
        stage: "interview",
        salary: 1250000,
        link: "https://boards.greenhouse.io/northwindindustriesholdingsinternational/jobs/4829104003?gh_src=8f2e1c9a3b&utm_source=linkedin&utm_campaign=q3-platform-hiring",
        jobDescription: LONG_DESCRIPTION,
        dateApplied: daysAgo(3 * 365),
        updatedAt: daysAgo(400),
    }),
    // One-letter company, three-letter title, every optional field missing.
    job("w-2", { title: "SWE", company: "X", stage: "screening", dateApplied: daysAgo(1) }),
    job("w-3", {
        title: "フロントエンドエンジニア（シニア）",
        company: "株式会社メルカリ",
        location: "東京都港区六本木",
        stage: "offer",
        salary: 14500000,
    }),
    job("w-4", {
        title: "مهندس برمجيات أول",
        company: "شركة الاتصالات السعودية",
        location: "الرياض",
        stage: "rejected",
        status: "closed",
        salary: 0,
    }),
    job("w-5", {
        // An unbreakable token in the title, as people paste from emails.
        title: "Engineer, apply via bartholomew.fitzgerald@northwind-industries-holdings.example.com",
        company: "Northwind",
        stage: "withdrawn",
        status: "closed",
        dateApplied: "not-a-date",
    }),
    job("w-6", {
        title: "Product Engineer 🚀",
        company: "🦄 Unicorn Labs",
        location: "São Paulo, Brasil",
        stage: "accepted",
        salary: 98000.5,
        dateApplied: daysAgo(-14),
    }),
    job("w-7", {
        title: "Software Engineer II, Trust & Safety <ML Platform> &amp; Integrity",
        company: "Wiśniewska-Kowalczyk Software",
        stage: "applied",
        dateApplied: daysAgo(45),
    }),
];

export const worstOffers: Offer[] = [
    {
        offerId: "wo-1",
        company: "Northwind Industries Holdings International Logistics & Supply Chain Solutions GmbH & Co. KG",
        title: "Senior Staff Software Engineer, Developer Experience & Internal Platform Tooling",
        location: "Remote, must reside in Germany, Austria, Switzerland, Poland or the Czech Republic",
        salaryBase: 1250000,
        bonus: 312500,
        equity: 4800000,
        signingBonus: 250000,
        ptoDays: 30,
        remoteType: "remote",
        // Fifty entries is the model's cap; one is near the 60-character entry cap.
        techStack: [
            "TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "AWS", "Kubernetes", "Terraform",
            "GraphQL", "Kafka", "Redis", "Go", "Rust", "Python", "Snowflake", "dbt",
            "Amazon Web Services Elastic Kubernetes Service (EKS) Fargate",
            ...Array.from({ length: 33 }, (_, i) => `Internal tool ${i + 1}`),
        ],
        growthScore: 10,
        brandScore: 0,
        status: "pending",
        deadlineDate: daysAgo(2),
        createdAt: daysAgo(1),
    },
    {
        // Equity-only founding offer: a zero base salary is valid in the model.
        offerId: "wo-2",
        company: "X",
        title: "Founding Engineer",
        salaryBase: 0,
        equity: 400000,
        status: "pending",
        createdAt: daysAgo(2),
    },
    {
        offerId: "wo-3",
        company: "株式会社メルカリ",
        title: "フロントエンドエンジニア（シニア）",
        location: "東京都港区六本木",
        salaryBase: 14500000,
        bonus: 0,
        ptoDays: 0,
        remoteType: "onsite",
        techStack: [],
        growthScore: 0,
        brandScore: 10,
        status: "rejected",
        createdAt: daysAgo(30),
    },
];

const LONG_CONTENT = Array.from(
    { length: 25 },
    () =>
        "Felt nervous at the start and rambled through the system design intro, then settled in. Forgot caching trade-offs again. Confident on React performance."
).join("\n\n");

export const worstNotes: Note[] = [
    {
        _id: "wn-1",
        jobId: "w-1",
        // 300 characters, the model's limit.
        title: ("Northwind Industries Holdings: fourth-round onsite with the Payments Core platform team, covering distributed systems design, a live debugging exercise on the reconciliation service, and a leadership conversation with the VP of Engineering about on-call expectations and team topology " + "x".repeat(300)).slice(0, 300),
        round: "Final round: hiring manager, VP of Engineering and two cross-functional peers (on-site, Berlin)",
        content: LONG_CONTENT,
        createdAt: daysAgo(400),
    },
    {
        _id: "wn-2",
        jobId: "deleted-job",
        title: "X",
        round: "",
        content: "ok",
        createdAt: daysAgo(0),
    },
    {
        _id: "wn-3",
        jobId: null,
        title: "Markup pasted from an email: **bold** <b>tags</b> &amp; entities",
        round: "Phone screen",
        content:
            "Recruiter link: https://northwind-industries-holdings.example.com/careers/interview-scheduling/confirm?token=8f2e1c9a3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f\n<script>alert(1)</script> should render as text.",
        createdAt: daysAgo(3),
    },
    {
        _id: "wn-4",
        jobId: "w-3",
        title: "面接メモ：技術面接（二次）",
        round: "Technical",
        content: "システム設計はうまくいった。キャッシュ戦略について説明が足りなかった。自信を持って話せた。",
        createdAt: daysAgo(9),
    },
];

function hugeJobs(): Job[] {
    const stages: Job["stage"][] = ["applied", "screening", "interview", "offer", "rejected", "accepted", "withdrawn"];
    const companies = ["Vercel", "Linear", "Stripe", "Notion", "Datadog", "Figma", "Retool", "Mercari", "Northwind"];
    return Array.from({ length: 1000 }, (_, i) =>
        job(`h-${i}`, {
            title: `Software Engineer ${i + 1}`,
            company: companies[i % companies.length],
            location: i % 3 ? "Remote" : undefined,
            stage: stages[i % stages.length],
            status: i % 7 > 4 ? "closed" : "active",
            salary: 120000 + (i % 50) * 2500,
            dateApplied: daysAgo(i % 365),
            updatedAt: daysAgo(i % 30),
        })
    );
}

export function getFixture(kind: FixtureKind): Fixture {
    switch (kind) {
        case "worst":
            return { jobs: worstJobs, offers: worstOffers, notes: worstNotes, profile: { skills: [], targetRole: "", seniority: "senior" } };
        case "empty":
            return { jobs: [], offers: [], notes: [], profile: DEMO_PROFILE };
        case "one":
            return { jobs: demoJobs.slice(0, 1), offers: demoOffers.slice(0, 1), notes: demoNotes.slice(0, 1), profile: DEMO_PROFILE };
        case "huge":
            return { jobs: hugeJobs(), offers: demoOffers, notes: demoNotes, profile: DEMO_PROFILE };
        default:
            return { jobs: demoJobs, offers: demoOffers, notes: demoNotes, profile: DEMO_PROFILE };
    }
}
