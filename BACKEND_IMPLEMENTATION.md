# 10.2 Backend Implementation

This document provides a comprehensive overview of TrackIQ's backend architecture, covering APIs, routes, server logic, authentication, and authorization patterns.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Routes](#api-routes)
4. [Server Logic Patterns](#server-logic-patterns)
5. [Error Handling](#error-handling)
6. [Database Operations](#database-operations)
7. [Payment Integration](#payment-integration)

---

## Architecture Overview

### Tech Stack

- **Runtime**: Next.js 15.4.6 App Router (Serverless Functions)
- **Database**: MongoDB Atlas with Mongoose 8.17.0
- **Authentication**: Clerk (JWT-based)
- **Payments**: Stripe (Subscriptions)
- **API Style**: RESTful with JSON responses

### Design Principles

1. **Serverless-First**: Connection pooling and caching for cold starts
2. **User Data Isolation**: All queries filtered by `userId`
3. **Type Safety**: TypeScript interfaces across frontend and backend
4. **Middleware Pattern**: Reusable auth wrapper (`withAuth`)
5. **Fail-Fast Validation**: Early request validation with detailed errors

---

## Authentication & Authorization

### Clerk Integration

**Middleware Protection** (`middleware.ts`):

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export const middleware = clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth.protect();
  }
});
```

**How It Works**:

- Protects all routes except homepage and auth pages
- Redirects unauthenticated users to `/sign-in`
- Validates Clerk JWT tokens on every request
- Sets `userId` in request context

---

### API Authentication: `withAuth` Middleware

**Implementation** (`lib/api-helpers.ts`):

```typescript
import { getAuth } from "@clerk/nextjs/server";

export interface AuthenticatedRequest extends NextApiRequest {
  userId: string;
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized: Authentication required",
      });
    }

    (req as AuthenticatedRequest).userId = userId;
    return handler(req as AuthenticatedRequest, res);
  };
}
```

**Usage Pattern**:

```typescript
// All protected API routes use this pattern
export default withAuth(async (req, res) => {
  const { userId } = req; // Guaranteed to exist
  // ... route logic with userId
});
```

**Benefits**:

- Type-safe `userId` access (no null checks needed)
- Consistent 401 error responses
- Single source of truth for authentication

---

### Authorization: User Data Isolation

Every query includes `userId` filter to ensure users only access their own data:

```typescript
// Example: Fetch user's jobs
const jobs = await Job.find({ userId }).sort({ createdAt: -1 });

// Example: Update only if user owns the resource
const job = await Job.findOne({ _id: jobId, userId });
if (!job) {
  return res.status(404).json({ error: "Job not found" });
}
```

**Security Pattern**:

1. Extract `userId` from authenticated request
2. Add `userId` to all database queries
3. Return 404 for resources user doesn't own (prevents info leakage)
4. Never trust client-provided `userId`

---

## API Routes

### Route Structure

All API routes follow Next.js Pages Router convention:

```
pages/api/
├── jobs/
│   ├── index.ts          # GET (list), POST (create)
│   └── [id].ts           # GET, PUT, PATCH, DELETE
├── applications/
│   ├── index.ts
│   └── [id].ts
├── offers/
│   ├── index.ts
│   └── [id].ts
├── notes/
│   ├── index.ts
│   └── [id].ts
├── companies/
│   └── index.ts
├── interviews/
│   └── index.ts
├── skills/
│   └── index.ts
├── user-skills/
│   └── index.ts
├── user-preferences/
│   └── index.ts
├── communications/
│   └── index.ts
├── stripe/
│   ├── checkout.ts       # Create Stripe checkout session
│   ├── portal.ts         # Customer portal redirect
│   └── webhook.ts        # Stripe webhook handler
├── user/
│   └── plan.ts           # Get user subscription plan
└── enrich-job.ts         # Job data enrichment utility
```

---

### Core API Endpoints

#### 1. Jobs API

**`GET /api/jobs`** - List user's jobs

- **Auth**: Required (withAuth)
- **Query Params**: None
- **Response**:
  ```json
  [
    {
      "jobId": "job_abc123",
      "userId": "user_123",
      "company": "TechCorp",
      "position": "Senior Engineer",
      "location": "San Francisco, CA",
      "jobType": "Full-Time",
      "workplaceType": "Hybrid",
      "stage": "Applied",
      "jobUrl": "https://example.com/jobs/123",
      "salary": "$150,000 - $200,000",
      "notes": "Great benefits",
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ]
  ```
- **Logic**:
  ```typescript
  const jobs = await Job.find({ userId }).sort({ createdAt: -1 });
  ```

**`POST /api/jobs`** - Create new job

- **Auth**: Required (withAuth)
- **Request Body**:
  ```json
  {
    "company": "TechCorp",
    "position": "Senior Engineer",
    "location": "San Francisco, CA",
    "jobType": "Full-Time",
    "workplaceType": "Hybrid",
    "stage": "Applied",
    "jobUrl": "https://example.com/jobs/123",
    "salary": "$150,000 - $200,000"
  }
  ```
- **Validation**:
  - Required fields: `company`, `position`, `stage`
  - `stage` must be one of: Saved, Applied, Interview, Offer, Accepted, Rejected, Archived
  - Free plan limit: 10 jobs per user
- **Logic**:

  ```typescript
  // Check plan limits
  const user = await getUserPlan(userId);
  if (user.plan === "free") {
    const jobCount = await Job.countDocuments({ userId });
    if (jobCount >= 10) {
      return res.status(403).json({
        error: "Free plan limit reached (10 jobs). Upgrade to Pro.",
      });
    }
  }

  // Create job with generated ID
  const job = await Job.create({
    jobId: generateId("job"),
    userId,
    ...validatedData,
  });
  ```

**`GET /api/jobs/[id]`** - Get single job

- **Auth**: Required (withAuth)
- **Response**: Single job object or 404

**`PUT /api/jobs/[id]`** - Update entire job
**`PATCH /api/jobs/[id]`** - Partial update

- **Auth**: Required (withAuth)
- **Validation**: Only update if user owns the job
- **Logic**:

  ```typescript
  const job = await Job.findOne({ _id: id, userId });
  if (!job) return res.status(404).json({ error: "Job not found" });

  Object.assign(job, req.body);
  await job.save();
  ```

**`DELETE /api/jobs/[id]`** - Delete job

- **Auth**: Required (withAuth)
- **Cascading**: Deletes associated applications, offers, interviews

---

#### 2. Applications API

**`GET /api/applications`** - List user's applications
**`POST /api/applications`** - Create new application

- **Required Fields**: `jobId`, `status`, `appliedDate`
- **Foreign Key**: Validates `jobId` exists and user owns it

**`GET /api/applications/[id]`** - Get single application
**`PUT /api/applications/[id]`** - Update application
**`DELETE /api/applications/[id]`** - Delete application

---

#### 3. Offers API

**`GET /api/offers`** - List user's offers
**`POST /api/offers`** - Create new offer

- **Unique Constraint**: One offer per application (`appId`)
- **Required Fields**: `appId`, `baseSalary`, `offerDate`
- **Logic**:
  ```typescript
  // Check if offer already exists for this application
  const existing = await Offer.findOne({ appId });
  if (existing) {
    return res.status(409).json({
      error: "Offer already exists for this application",
    });
  }
  ```

**`GET /api/offers/[id]`** - Get single offer
**`PUT /api/offers/[id]`** - Update offer
**`DELETE /api/offers/[id]`** - Delete offer

---

#### 4. Notes API

**`GET /api/notes`** - List user's notes
**`POST /api/notes`** - Create new note

- **Required Fields**: `title`, `content`
- **Timestamps**: Automatically managed by Mongoose

**`GET /api/notes/[id]`** - Get single note
**`PUT /api/notes/[id]`** - Update note
**`DELETE /api/notes/[id]`** - Delete note

---

#### 5. Additional Resource APIs

**Companies** (`/api/companies`):

- GET: List companies with job counts
- POST: Create new company profile

**Interviews** (`/api/interviews`):

- GET: List scheduled interviews
- POST: Create interview with application link

**Skills** (`/api/skills`):

- GET: List all skills
- POST: Create new skill

**User Skills** (`/api/user-skills`):

- GET: List user's skills with proficiency
- POST: Add skill to user profile

**User Preferences** (`/api/user-preferences`):

- GET: Get user's job preferences (location, salary, remote, etc.)
- PUT: Update preferences

**Communications** (`/api/communications`):

- GET: List communications with contacts
- POST: Log new communication

---

#### 6. Payment APIs

**`POST /api/stripe/checkout`** - Create Stripe checkout session

- **Auth**: None (userId passed in body)
- **Request Body**:
  ```json
  {
    "userId": "user_123",
    "email": "user@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "url": "https://checkout.stripe.com/..."
  }
  ```
- **Logic**:

  ```typescript
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: "price_1Rtt...", quantity: 1 }],
    metadata: { userId },
    success_url: `${origin}/dashboard?upgrade=success`,
    cancel_url: `${origin}/dashboard?upgrade=cancel`,
  });

  // Update user plan in DB
  if (session.customer) {
    await updateUserPlanInDB(userId, "premium", session.customer);
  }
  ```

**`POST /api/stripe/portal`** - Redirect to customer portal

- **Auth**: Required (withAuth)
- **Purpose**: Manage subscription, billing, invoices

**`POST /api/stripe/webhook`** - Handle Stripe events

- **Auth**: Stripe signature verification
- **Events Handled**:
  - `checkout.session.completed`: Upgrade user to Pro
  - `customer.subscription.updated`: Update subscription status
  - `customer.subscription.deleted`: Downgrade to free plan
- **Security**:
  ```typescript
  const sig = req.headers["stripe-signature"];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  ```

---

#### 7. User Plan API

**`GET /api/user/plan`** - Get user's subscription status

- **Auth**: Required (getAuth from Clerk)
- **Response**:
  ```json
  {
    "plan": "premium",
    "customerId": "cus_123",
    "status": "active",
    "trialEnd": null
  }
  ```
- **Logic**:

  ```typescript
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const planData = await getUserPlan(userId);
  res.status(200).json(planData);
  ```

---

#### 8. Utility APIs

**`POST /api/enrich-job`** - Enrich job data from URL

- **Auth**: Required (withAuth)
- **Request Body**: `{ "url": "https://..." }`
- **Response**: Extracted job details (company, position, description)
- **Pro Feature**: May require Pro plan

---

## Server Logic Patterns

### 1. Request Validation

**Required Fields Validation**:

```typescript
const validation = validateRequiredFields(req.body, [
  "company",
  "position",
  "stage",
]);
if (!validation.valid) {
  return res.status(400).json({
    error: "Missing required fields",
    missing: validation.missing,
  });
}
```

**Enum Validation**:

```typescript
const validStages = [
  "Saved",
  "Applied",
  "Interview",
  "Offer",
  "Accepted",
  "Rejected",
  "Archived",
];
if (!validStages.includes(stage)) {
  return res.status(400).json({
    error: `Invalid stage. Must be one of: ${validStages.join(", ")}`,
  });
}
```

---

### 2. Business Logic

**Free Plan Limits**:

```typescript
const user = await getUserPlan(userId);
if (user.plan === "free") {
  const count = await Job.countDocuments({ userId });
  if (count >= 10) {
    return res.status(403).json({
      error: "Free plan limit reached. Upgrade to Pro for unlimited jobs.",
    });
  }
}
```

**Unique Constraints**:

```typescript
// One offer per application
const existing = await Offer.findOne({ appId });
if (existing) {
  return res.status(409).json({ error: "Offer already exists" });
}
```

**Cascading Deletes**:

```typescript
// Delete job and all related data
await Job.findByIdAndDelete(jobId);
await Application.deleteMany({ jobId });
await Offer.deleteMany({ jobId }); // via application
await Interview.deleteMany({ jobId });
```

---

### 3. ID Generation

**Custom ID Format**:

```typescript
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Usage:
const jobId = generateId("job"); // "job_1705320000000_abc123xyz"
const offerId = generateId("offer"); // "offer_1705320000000_def456uvw"
```

---

## Error Handling

### Standard Error Responses

**401 Unauthorized**:

```json
{ "error": "Unauthorized: Authentication required" }
```

**403 Forbidden** (Plan Limits):

```json
{ "error": "Free plan limit reached (10 jobs). Upgrade to Pro." }
```

**404 Not Found**:

```json
{ "error": "Job not found" }
```

**409 Conflict** (Unique Constraint):

```json
{ "error": "Offer already exists for this application" }
```

**400 Bad Request** (Validation):

```json
{
  "error": "Missing required fields",
  "missing": ["company", "position"]
}
```

**405 Method Not Allowed**:

```json
{ "error": "Method not allowed. Allowed: GET, POST" }
```

**500 Internal Server Error**:

```json
{ "error": "Internal server error" }
```

---

### Error Handling Pattern

```typescript
try {
  await connectDB(); // Connect to database

  // Validate request
  const validation = validateRequiredFields(req.body, requiredFields);
  if (!validation.valid) {
    return errorResponse(res, 400, "Missing required fields");
  }

  // Business logic
  const result = await performOperation();

  // Success response
  return successResponse(res, result, 201);
} catch (error) {
  console.error("Error:", error);
  return errorResponse(res, 500, "Internal server error");
}
```

---

## Database Operations

### Connection Management

**Serverless Caching** (`lib/db.ts`):

```typescript
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: MongooseCache = (global as any).mongoose || {
  conn: null,
  promise: null,
};

export async function connectDB() {
  if (cached.conn) {
    return cached.conn; // Reuse existing connection
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10, // Connection pooling
      serverSelectionTimeoutMS: 5000,
    });
  }

  cached.conn = await cached.promise;
  (global as any).mongoose = cached;
  return cached.conn;
}
```

**Why This Matters**:

- Serverless functions are stateless
- Without caching, each request creates new DB connection (slow)
- Connection pooling reuses connections across invocations
- Global cache persists across warm starts

---

### Query Patterns

**List with Sorting**:

```typescript
const jobs = await Job.find({ userId }).sort({ createdAt: -1 }).limit(50);
```

**Aggregations**:

```typescript
const stats = await Job.aggregate([
  { $match: { userId } },
  { $group: { _id: "$stage", count: { $sum: 1 } } },
]);
```

**Population (Joins)**:

```typescript
const application = await Application.findById(appId)
  .populate("jobId")
  .populate("offerId");
```

**Partial Updates**:

```typescript
await Job.findByIdAndUpdate(
  jobId,
  { $set: { stage: "Interview" } },
  { new: true } // Return updated document
);
```

---

### Indexes

**Performance Optimization**:

```typescript
// Job model indexes (models/Job.ts)
JobSchema.index({ userId: 1, createdAt: -1 }); // List queries
JobSchema.index({ userId: 1, stage: 1 }); // Filter by stage
JobSchema.index({ userId: 1, company: 1 }); // Filter by company
```

**Unique Constraints**:

```typescript
// Offer model (models/Offer.ts)
OfferSchema.index({ appId: 1 }, { unique: true }); // One offer per application
```

---

## Payment Integration

### Stripe Workflow

1. **User clicks "Upgrade to Pro"** → Redirected to `/pricing`
2. **Pricing page** → User clicks "Get Started" on Pro plan
3. **Frontend calls** → `POST /api/stripe/checkout`
4. **Checkout API creates** → Stripe Checkout session with metadata
5. **User completes payment** → Stripe fires `checkout.session.completed` webhook
6. **Webhook handler** → Updates user plan in database to "premium"
7. **User redirected** → `/dashboard?upgrade=success`

### Subscription Management

**Customer Portal**:

```typescript
// Frontend calls POST /api/stripe/portal
const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${origin}/dashboard`,
});
// Redirects user to Stripe portal for self-service
```

**Plan Checks**:

```typescript
// lib/stripe.ts
export async function getUserPlan(userId: string) {
  const user = await User.findOne({ userId });
  return {
    plan: user?.plan || "free",
    customerId: user?.stripeCustomerId,
    status: user?.subscriptionStatus || "inactive",
    trialEnd: user?.trialEnd,
  };
}
```

---

## Security Best Practices

### 1. Authentication

- ✅ All API routes use `withAuth` middleware
- ✅ Clerk JWT validation on every request
- ✅ Middleware protects frontend routes

### 2. Authorization

- ✅ All queries filter by `userId`
- ✅ 404 responses for unauthorized access (no info leakage)
- ✅ Client-provided `userId` never trusted

### 3. Input Validation

- ✅ Required fields validation
- ✅ Enum value validation
- ✅ Type safety with TypeScript

### 4. Rate Limiting

- ⚠️ **TODO**: Add rate limiting middleware
- Recommended: 100 requests/minute per user

### 5. Webhook Security

- ✅ Stripe signature verification
- ✅ Raw body parsing for webhook routes

---

## API Response Standards

### Success Responses

**200 OK** (GET, PUT):

```json
{
  "jobId": "job_123",
  "company": "TechCorp",
  ...
}
```

**201 Created** (POST):

```json
{
  "jobId": "job_123",
  "company": "TechCorp",
  ...
}
```

**204 No Content** (DELETE):

```
(empty body)
```

---

## API Testing Examples

### Create Job (cURL)

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -d '{
    "company": "TechCorp",
    "position": "Senior Engineer",
    "location": "San Francisco, CA",
    "jobType": "Full-Time",
    "workplaceType": "Hybrid",
    "stage": "Applied"
  }'
```

### List Jobs (cURL)

```bash
curl http://localhost:3000/api/jobs \
  -H "Authorization: Bearer YOUR_CLERK_JWT"
```

### Update Job (cURL)

```bash
curl -X PATCH http://localhost:3000/api/jobs/job_123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_JWT" \
  -d '{ "stage": "Interview" }'
```

---

## Summary

**Authentication**: Clerk + `withAuth` middleware ensures all API routes are protected

**Authorization**: User data isolation via `userId` filtering prevents cross-user access

**API Routes**: 19 RESTful endpoints following standard conventions (GET, POST, PUT, DELETE)

**Server Logic**: Request validation → business rules → database operations → typed responses

**Error Handling**: Consistent HTTP status codes and error messages

**Database**: Connection caching, indexes, and proper foreign key relationships

**Payments**: Stripe integration with checkout, webhooks, and subscription management

**Security**: JWT validation, input validation, webhook verification, no trust in client data

This backend architecture provides a secure, scalable, and maintainable foundation for TrackIQ's job tracking functionality.
