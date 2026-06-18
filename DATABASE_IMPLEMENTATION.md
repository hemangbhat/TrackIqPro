# 10.3 Database Implementation

This document provides comprehensive coverage of TrackIQ's MongoDB database implementation, including queries, CRUD operations, schema structures, and visual representations of database tables.

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Collection Schemas](#collection-schemas)
3. [MongoDB Queries](#mongodb-queries)
4. [CRUD Operations](#crud-operations)
5. [Aggregation Pipelines](#aggregation-pipelines)
6. [Indexes & Performance](#indexes--performance)
7. [Database Tables Visual Reference](#database-tables-visual-reference)

---

## Database Overview

### Technology Stack

- **Database**: MongoDB Atlas (Cloud-hosted)
- **ODM**: Mongoose 8.17.0
- **Connection**: URI-based with connection pooling
- **Architecture**: Serverless-optimized with connection caching

### Database Configuration

```typescript
// lib/db.ts
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10, // Maximum 10 connections in pool
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### Connection String Format

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

---

## Collection Schemas

### 1. Jobs Collection

**Purpose**: Primary job tracking with application stages

**Schema Definition**:

```typescript
{
    _id: ObjectId,
    userId: String (indexed, required),
    title: String (required, trimmed),
    company: String (required, trimmed),
    location: String (optional, trimmed),
    stage: Enum (required, default: "applied"),
    status: Enum (required, default: "active"),
    link: String (optional),
    salary: Number (min: 0),
    jobDescription: String,
    notes: String,
    dateApplied: Date (default: Date.now),
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

**Stage Values**: `applied`, `screening`, `interview`, `offer`, `rejected`, `accepted`, `withdrawn`

**Status Values**: `active`, `closed`

**Indexes**:

```javascript
{ userId: 1, createdAt: -1 }  // List queries (DESC order)
{ userId: 1, stage: 1 }        // Filter by stage
{ userId: 1, company: 1 }      // Filter by company
{ userId: 1 }                  // Single field index
```

**Sample Document**:

```json
{
  "_id": "6751234567890abcdef12345",
  "userId": "user_2abc123xyz",
  "title": "Senior Full Stack Engineer",
  "company": "TechCorp Inc",
  "location": "San Francisco, CA",
  "stage": "interview",
  "status": "active",
  "link": "https://techcorp.com/careers/senior-engineer",
  "salary": 180000,
  "jobDescription": "Build scalable web applications...",
  "notes": "Great company culture, 4 interview rounds",
  "dateApplied": "2025-11-15T10:30:00.000Z",
  "createdAt": "2025-11-15T10:30:00.000Z",
  "updatedAt": "2025-11-18T14:22:00.000Z"
}
```

---

### 2. Applications Collection

**Purpose**: Formal application tracking with company relationships

**Schema Definition**:

```typescript
{
    _id: ObjectId,
    appId: String (unique, required),
    userId: String (indexed, required, ref: "User"),
    companyId: String (required, ref: "Company"),
    roleTitle: String (required, trimmed),
    status: Enum (required, default: "applied"),
    appliedDate: Date (default: Date.now),
    source: String (optional),
    jobDescription: String,
    location: String,
    salary: Number (min: 0),
    notes: String,
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

**Status Values**: `applied`, `screening`, `interview`, `offer`, `rejected`, `accepted`, `withdrawn`

**Indexes**:

```javascript
{ appId: 1 } (unique)
{ userId: 1, appliedDate: -1 }
{ userId: 1, status: 1 }
{ companyId: 1 }
```

**Sample Document**:

```json
{
  "_id": "6751234567890abcdef23456",
  "appId": "app_1705320000000_abc123xyz",
  "userId": "user_2abc123xyz",
  "companyId": "comp_techcorp",
  "roleTitle": "Senior Backend Engineer",
  "status": "interview",
  "appliedDate": "2025-11-10T09:00:00.000Z",
  "source": "LinkedIn",
  "jobDescription": "Design and implement RESTful APIs...",
  "location": "Remote",
  "salary": 160000,
  "notes": "Recruiter reached out directly",
  "createdAt": "2025-11-10T09:00:00.000Z",
  "updatedAt": "2025-11-16T11:30:00.000Z"
}
```

---

### 3. Offers Collection

**Purpose**: Job offer details with compensation breakdown (1:1 with Application)

**Schema Definition**:

```typescript
{
    _id: ObjectId,
    offerId: String (unique, required),
    appId: String (unique, required, ref: "Application"),
    userId: String (indexed, required, ref: "User"),
    company: String (required, trimmed),
    title: String (required, trimmed),
    location: String,
    salaryBase: Number (required, min: 0),
    bonus: Number (min: 0),
    equity: Number (min: 0),
    signingBonus: Number (min: 0),
    ptoDays: Number (min: 0),
    remoteType: Enum (optional),
    benefits: String,
    techStack: Array<String>,
    deadlineDate: Date,
    status: Enum (required, default: "pending"),
    notes: String,
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

**Remote Type Values**: `onsite`, `hybrid`, `remote`

**Status Values**: `pending`, `accepted`, `rejected`

**Indexes**:

```javascript
{ offerId: 1 } (unique)
{ appId: 1 } (unique)
{ userId: 1, createdAt: -1 }
```

**Sample Document**:

```json
{
  "_id": "6751234567890abcdef34567",
  "offerId": "offer_1705420000000_def456uvw",
  "appId": "app_1705320000000_abc123xyz",
  "userId": "user_2abc123xyz",
  "company": "TechCorp Inc",
  "title": "Senior Backend Engineer",
  "location": "San Francisco, CA",
  "salaryBase": 175000,
  "bonus": 25000,
  "equity": 50000,
  "signingBonus": 15000,
  "ptoDays": 25,
  "remoteType": "hybrid",
  "benefits": "Health, Dental, Vision, 401k matching",
  "techStack": ["Node.js", "TypeScript", "MongoDB", "AWS"],
  "deadlineDate": "2025-12-01T23:59:59.000Z",
  "status": "pending",
  "notes": "Negotiated higher base and signing bonus",
  "createdAt": "2025-11-20T15:00:00.000Z",
  "updatedAt": "2025-11-20T15:00:00.000Z"
}
```

---

### 4. Companies Collection

**Purpose**: Company profiles and metadata

**Schema Definition**:

```typescript
{
    _id: ObjectId,
    companyId: String (unique, required),
    name: String (unique, required, trimmed),
    website: String,
    industry: String,
    companySize: Enum,
    logo: String (URL),
    description: String,
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

**Company Size Values**: `1-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1001-5000`, `5001+`

**Indexes**:

```javascript
{
  companyId: 1;
}
unique;
{
  name: 1;
}
unique;
```

**Sample Document**:

```json
{
  "_id": "6751234567890abcdef45678",
  "companyId": "comp_techcorp",
  "name": "TechCorp Inc",
  "website": "https://techcorp.com",
  "industry": "Software Development",
  "companySize": "501-1000",
  "logo": "https://techcorp.com/logo.png",
  "description": "Leading provider of cloud solutions",
  "createdAt": "2025-11-01T08:00:00.000Z",
  "updatedAt": "2025-11-01T08:00:00.000Z"
}
```

---

### 5. User Preferences Collection

**Purpose**: User's job search preferences and filters

**Schema Definition**:

```typescript
{
    _id: ObjectId,
    userId: String (unique, required, ref: "User"),
    desiredRoles: Array<String>,
    desiredLocations: Array<String>,
    salaryMin: Number (min: 0),
    salaryMax: Number (min: 0),
    remotePreference: Enum,
    jobTypes: Array<String>,
    industries: Array<String>,
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

**Remote Preference Values**: `onsite`, `hybrid`, `remote`, `any`

**Sample Document**:

```json
{
  "_id": "6751234567890abcdef56789",
  "userId": "user_2abc123xyz",
  "desiredRoles": ["Senior Engineer", "Staff Engineer", "Tech Lead"],
  "desiredLocations": ["San Francisco", "Remote", "New York"],
  "salaryMin": 150000,
  "salaryMax": 250000,
  "remotePreference": "hybrid",
  "jobTypes": ["Full-Time", "Contract"],
  "industries": ["SaaS", "FinTech", "AI/ML"],
  "createdAt": "2025-11-01T10:00:00.000Z",
  "updatedAt": "2025-11-15T14:30:00.000Z"
}
```

---

### 6. Skills Collection

**Purpose**: Master list of technical and soft skills

**Schema Definition**:

```typescript
{
    _id: ObjectId,
    skillId: String (unique, required),
    name: String (unique, required, trimmed),
    category: String,
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

**Sample Document**:

```json
{
  "_id": "6751234567890abcdef67890",
  "skillId": "skill_typescript",
  "name": "TypeScript",
  "category": "Programming Language",
  "createdAt": "2025-11-01T08:00:00.000Z",
  "updatedAt": "2025-11-01T08:00:00.000Z"
}
```

---

### 7. User Skills Collection (Weak Entity)

**Purpose**: Many-to-many relationship between users and skills with proficiency

**Schema Definition**:

```typescript
{
    _id: ObjectId,
    userId: String (required, ref: "User"),
    skillId: String (required, ref: "Skill"),
    proficiency: Enum (required),
    yearsOfExperience: Number (min: 0),
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

**Proficiency Values**: `beginner`, `intermediate`, `advanced`, `expert`

**Indexes**:

```javascript
{ userId: 1, skillId: 1 } (compound unique)
{ userId: 1 }
{ skillId: 1 }
```

**Sample Document**:

```json
{
  "_id": "6751234567890abcdef78901",
  "userId": "user_2abc123xyz",
  "skillId": "skill_typescript",
  "proficiency": "expert",
  "yearsOfExperience": 5,
  "createdAt": "2025-11-01T10:00:00.000Z",
  "updatedAt": "2025-11-01T10:00:00.000Z"
}
```

---

### 8. Communications Collection

**Purpose**: Track communications with recruiters/contacts

**Schema Definition**:

```typescript
{
    _id: ObjectId,
    commId: String (unique, required),
    userId: String (indexed, required, ref: "User"),
    contactName: String (required),
    contactEmail: String,
    contactPhone: String,
    companyId: String (ref: "Company"),
    subject: String,
    message: String,
    date: Date (default: Date.now),
    type: Enum,
    createdAt: Date (auto),
    updatedAt: Date (auto)
}
```

**Type Values**: `email`, `phone`, `linkedin`, `other`

**Sample Document**:

```json
{
  "_id": "6751234567890abcdef89012",
  "commId": "comm_1705520000000_ghi789rst",
  "userId": "user_2abc123xyz",
  "contactName": "Jane Smith",
  "contactEmail": "jane.smith@techcorp.com",
  "contactPhone": "+1-555-0123",
  "companyId": "comp_techcorp",
  "subject": "Follow-up on Senior Engineer Role",
  "message": "Thank you for the opportunity...",
  "date": "2025-11-18T16:00:00.000Z",
  "type": "email",
  "createdAt": "2025-11-18T16:00:00.000Z",
  "updatedAt": "2025-11-18T16:00:00.000Z"
}
```

---

## MongoDB Queries

### Basic Queries

#### 1. Find All Jobs for User (Sorted by Date)

```javascript
db.jobs.find({ userId: "user_2abc123xyz" }).sort({ createdAt: -1 }).limit(50);
```

**Mongoose Equivalent**:

```typescript
const jobs = await Job.find({ userId })
  .sort({ createdAt: -1 })
  .limit(50)
  .lean();
```

---

#### 2. Find Jobs by Stage

```javascript
db.jobs.find({
  userId: "user_2abc123xyz",
  stage: "interview",
});
```

**Mongoose Equivalent**:

```typescript
const interviewJobs = await Job.find({
  userId,
  stage: "interview",
});
```

---

#### 3. Find Single Job by ID (with User Ownership Check)

```javascript
db.jobs.findOne({
  _id: ObjectId("6751234567890abcdef12345"),
  userId: "user_2abc123xyz",
});
```

**Mongoose Equivalent**:

```typescript
const job = await Job.findOne({ _id: jobId, userId });
```

---

#### 4. Find Applications with Company Details (Population)

```javascript
// MongoDB doesn't have native joins, so we use Mongoose populate
```

**Mongoose Equivalent**:

```typescript
const applications = await Application.find({ userId })
  .populate("companyId")
  .sort({ appliedDate: -1 });
```

---

#### 5. Find Offers with Application Details

```javascript
db.offers.aggregate([
  { $match: { userId: "user_2abc123xyz" } },
  {
    $lookup: {
      from: "applications",
      localField: "appId",
      foreignField: "appId",
      as: "application",
    },
  },
  { $unwind: "$application" },
  { $sort: { createdAt: -1 } },
]);
```

**Mongoose Equivalent**:

```typescript
const offers = await Offer.find({ userId })
  .populate("appId")
  .sort({ createdAt: -1 });
```

---

#### 6. Count Jobs by Stage

```javascript
db.jobs.aggregate([
  { $match: { userId: "user_2abc123xyz" } },
  {
    $group: {
      _id: "$stage",
      count: { $sum: 1 },
    },
  },
]);
```

**Mongoose Equivalent**:

```typescript
const stageCounts = await Job.aggregate([
  { $match: { userId } },
  { $group: { _id: "$stage", count: { $sum: 1 } } },
]);
```

---

#### 7. Find Recent Applications (Last 30 Days)

```javascript
db.applications
  .find({
    userId: "user_2abc123xyz",
    appliedDate: {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  })
  .sort({ appliedDate: -1 });
```

**Mongoose Equivalent**:

```typescript
const recentApps = await Application.find({
  userId,
  appliedDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
}).sort({ appliedDate: -1 });
```

---

#### 8. Search Jobs by Company Name (Case-Insensitive)

```javascript
db.jobs.find({
  userId: "user_2abc123xyz",
  company: { $regex: "tech", $options: "i" },
});
```

**Mongoose Equivalent**:

```typescript
const jobs = await Job.find({
  userId,
  company: { $regex: searchTerm, $options: "i" },
});
```

---

#### 9. Find High-Value Offers (Salary > $150k)

```javascript
db.offers
  .find({
    userId: "user_2abc123xyz",
    salaryBase: { $gte: 150000 },
  })
  .sort({ salaryBase: -1 });
```

**Mongoose Equivalent**:

```typescript
const highValueOffers = await Offer.find({
  userId,
  salaryBase: { $gte: 150000 },
}).sort({ salaryBase: -1 });
```

---

#### 10. Find User Skills with Proficiency Level

```javascript
db.userskills.aggregate([
  { $match: { userId: "user_2abc123xyz", proficiency: "expert" } },
  {
    $lookup: {
      from: "skills",
      localField: "skillId",
      foreignField: "skillId",
      as: "skillDetails",
    },
  },
  { $unwind: "$skillDetails" },
]);
```

**Mongoose Equivalent**:

```typescript
const expertSkills = await UserSkill.find({
  userId,
  proficiency: "expert",
}).populate("skillId");
```

---

## CRUD Operations

### CREATE Operations

#### 1. Create New Job

```typescript
// API Route: POST /api/jobs
async function createJob(userId: string, jobData: any) {
  await connectDB();

  // Check free tier limit
  const { plan } = await getUserPlan(userId);
  if (plan === "free") {
    const jobCount = await Job.countDocuments({ userId });
    if (jobCount >= 10) {
      throw new Error("Free tier limit reached (10 jobs max)");
    }
  }

  // Create job
  const job = new Job({
    userId,
    title: jobData.title,
    company: jobData.company,
    location: jobData.location,
    stage: jobData.stage || "applied",
    status: jobData.status || "active",
    link: jobData.link,
    salary: jobData.salary,
    dateApplied: jobData.dateApplied || new Date(),
    jobDescription: jobData.jobDescription,
    notes: jobData.notes,
  });

  await job.save();
  return job;
}
```

**MongoDB Shell**:

```javascript
db.jobs.insertOne({
  userId: "user_2abc123xyz",
  title: "Senior Full Stack Engineer",
  company: "TechCorp Inc",
  location: "San Francisco, CA",
  stage: "applied",
  status: "active",
  link: "https://techcorp.com/careers/123",
  salary: 180000,
  dateApplied: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

---

#### 2. Create Application

```typescript
// API Route: POST /api/applications
async function createApplication(userId: string, appData: any) {
  await connectDB();

  // Generate unique ID
  const appId = generateId("app");

  const application = new Application({
    appId,
    userId,
    companyId: appData.companyId,
    roleTitle: appData.roleTitle,
    status: appData.status || "applied",
    appliedDate: appData.appliedDate || new Date(),
    source: appData.source,
    jobDescription: appData.jobDescription,
    location: appData.location,
    salary: appData.salary,
    notes: appData.notes,
  });

  await application.save();
  return application;
}
```

---

#### 3. Create Offer (with Unique Constraint Check)

```typescript
// API Route: POST /api/offers
async function createOffer(userId: string, offerData: any) {
  await connectDB();

  // Check if offer already exists for this application
  const existing = await Offer.findOne({ appId: offerData.appId });
  if (existing) {
    throw new Error("Offer already exists for this application");
  }

  const offerId = generateId("offer");

  const offer = new Offer({
    offerId,
    appId: offerData.appId,
    userId,
    company: offerData.company,
    title: offerData.title,
    location: offerData.location,
    salaryBase: offerData.salaryBase,
    bonus: offerData.bonus,
    equity: offerData.equity,
    signingBonus: offerData.signingBonus,
    ptoDays: offerData.ptoDays,
    remoteType: offerData.remoteType,
    benefits: offerData.benefits,
    techStack: offerData.techStack,
    deadlineDate: offerData.deadlineDate,
    status: offerData.status || "pending",
    notes: offerData.notes,
  });

  await offer.save();
  return offer;
}
```

---

### READ Operations

#### 1. Get All User Jobs

```typescript
// API Route: GET /api/jobs
async function getUserJobs(userId: string) {
  await connectDB();

  const jobs = await Job.find({ userId }).sort({ createdAt: -1 }).lean();

  return jobs;
}
```

**MongoDB Shell**:

```javascript
db.jobs.find({ userId: "user_2abc123xyz" }).sort({ createdAt: -1 });
```

---

#### 2. Get Single Job by ID

```typescript
// API Route: GET /api/jobs/[id]
async function getJobById(userId: string, jobId: string) {
  await connectDB();

  const job = await Job.findOne({ _id: jobId, userId }).lean();

  if (!job) {
    throw new Error("Job not found");
  }

  return job;
}
```

**MongoDB Shell**:

```javascript
db.jobs.findOne({
  _id: ObjectId("6751234567890abcdef12345"),
  userId: "user_2abc123xyz",
});
```

---

#### 3. Get Applications with Populated Company

```typescript
async function getUserApplications(userId: string) {
  await connectDB();

  const applications = await Application.find({ userId })
    .populate("companyId")
    .sort({ appliedDate: -1 })
    .lean();

  return applications;
}
```

---

#### 4. Get Offers with Application Details

```typescript
async function getUserOffers(userId: string) {
  await connectDB();

  const offers = await Offer.find({ userId })
    .populate("appId")
    .sort({ createdAt: -1 })
    .lean();

  return offers;
}
```

---

### UPDATE Operations

#### 1. Update Job (Full Update)

```typescript
// API Route: PUT /api/jobs/[id]
async function updateJob(userId: string, jobId: string, updateData: any) {
  await connectDB();

  // Remove protected fields
  delete updateData._id;
  delete updateData.userId;

  const job = await Job.findOneAndUpdate({ _id: jobId, userId }, updateData, {
    new: true,
    runValidators: true,
  });

  if (!job) {
    throw new Error("Job not found");
  }

  return job;
}
```

**MongoDB Shell**:

```javascript
db.jobs.updateOne(
  {
    _id: ObjectId("6751234567890abcdef12345"),
    userId: "user_2abc123xyz",
  },
  {
    $set: {
      stage: "interview",
      notes: "Scheduled for next week",
    },
  }
);
```

---

#### 2. Partial Update (PATCH)

```typescript
// API Route: PATCH /api/jobs/[id]
async function patchJob(userId: string, jobId: string, partialData: any) {
  await connectDB();

  const job = await Job.findOne({ _id: jobId, userId });

  if (!job) {
    throw new Error("Job not found");
  }

  // Update only provided fields
  Object.assign(job, partialData);
  await job.save();

  return job;
}
```

**MongoDB Shell**:

```javascript
db.jobs.updateOne(
  {
    _id: ObjectId("6751234567890abcdef12345"),
    userId: "user_2abc123xyz",
  },
  { $set: { stage: "offer" } }
);
```

---

#### 3. Update Application Status

```typescript
async function updateApplicationStatus(
  userId: string,
  appId: string,
  status: string
) {
  await connectDB();

  const application = await Application.findOneAndUpdate(
    { appId, userId },
    { $set: { status } },
    { new: true, runValidators: true }
  );

  if (!application) {
    throw new Error("Application not found");
  }

  return application;
}
```

---

#### 4. Update Offer Status

```typescript
async function updateOfferStatus(
  userId: string,
  offerId: string,
  status: string
) {
  await connectDB();

  const offer = await Offer.findOneAndUpdate(
    { offerId, userId },
    { $set: { status } },
    { new: true, runValidators: true }
  );

  if (!offer) {
    throw new Error("Offer not found");
  }

  return offer;
}
```

---

### DELETE Operations

#### 1. Delete Job

```typescript
// API Route: DELETE /api/jobs/[id]
async function deleteJob(userId: string, jobId: string) {
  await connectDB();

  const result = await Job.deleteOne({ _id: jobId, userId });

  if (result.deletedCount === 0) {
    throw new Error("Job not found");
  }

  return { message: "Job deleted successfully" };
}
```

**MongoDB Shell**:

```javascript
db.jobs.deleteOne({
  _id: ObjectId("6751234567890abcdef12345"),
  userId: "user_2abc123xyz",
});
```

---

#### 2. Delete Application (with Cascading)

```typescript
async function deleteApplication(userId: string, appId: string) {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Delete application
    const result = await Application.deleteOne({ appId, userId }).session(
      session
    );

    if (result.deletedCount === 0) {
      throw new Error("Application not found");
    }

    // Delete associated offer
    await Offer.deleteOne({ appId }).session(session);

    await session.commitTransaction();
    return { message: "Application and associated offer deleted" };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

---

#### 3. Delete Offer

```typescript
async function deleteOffer(userId: string, offerId: string) {
  await connectDB();

  const result = await Offer.deleteOne({ offerId, userId });

  if (result.deletedCount === 0) {
    throw new Error("Offer not found");
  }

  return { message: "Offer deleted successfully" };
}
```

---

#### 4. Bulk Delete (Delete All Rejected Jobs)

```typescript
async function deleteRejectedJobs(userId: string) {
  await connectDB();

  const result = await Job.deleteMany({
    userId,
    stage: "rejected",
  });

  return {
    message: `${result.deletedCount} rejected jobs deleted`,
  };
}
```

**MongoDB Shell**:

```javascript
db.jobs.deleteMany({
  userId: "user_2abc123xyz",
  stage: "rejected",
});
```

---

## Aggregation Pipelines

### 1. Dashboard Statistics

```typescript
async function getDashboardStats(userId: string) {
  await connectDB();

  const stats = await Job.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        activeJobs: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        appliedCount: {
          $sum: { $cond: [{ $eq: ["$stage", "applied"] }, 1, 0] },
        },
        interviewCount: {
          $sum: { $cond: [{ $eq: ["$stage", "interview"] }, 1, 0] },
        },
        offerCount: {
          $sum: { $cond: [{ $eq: ["$stage", "offer"] }, 1, 0] },
        },
        rejectedCount: {
          $sum: { $cond: [{ $eq: ["$stage", "rejected"] }, 1, 0] },
        },
      },
    },
  ]);

  return stats[0] || {};
}
```

**MongoDB Shell**:

```javascript
db.jobs.aggregate([
  { $match: { userId: "user_2abc123xyz" } },
  {
    $group: {
      _id: null,
      totalJobs: { $sum: 1 },
      activeJobs: {
        $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
      },
      interviewCount: {
        $sum: { $cond: [{ $eq: ["$stage", "interview"] }, 1, 0] },
      },
    },
  },
]);
```

---

### 2. Applications by Company (with Count)

```typescript
async function getApplicationsByCompany(userId: string) {
  await connectDB();

  const companyStats = await Application.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: "$companyId",
        count: { $sum: 1 },
        latestApplication: { $max: "$appliedDate" },
      },
    },
    {
      $lookup: {
        from: "companies",
        localField: "_id",
        foreignField: "companyId",
        as: "companyDetails",
      },
    },
    { $unwind: "$companyDetails" },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return companyStats;
}
```

---

### 3. Monthly Application Trend

```typescript
async function getMonthlyApplicationTrend(userId: string) {
  await connectDB();

  const trend = await Application.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: {
          year: { $year: "$appliedDate" },
          month: { $month: "$appliedDate" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  return trend;
}
```

**MongoDB Shell**:

```javascript
db.applications.aggregate([
  { $match: { userId: "user_2abc123xyz" } },
  {
    $group: {
      _id: {
        year: { $year: "$appliedDate" },
        month: { $month: "$appliedDate" },
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } },
]);
```

---

### 4. Average Salary by Stage

```typescript
async function getAverageSalaryByStage(userId: string) {
  await connectDB();

  const salaryStats = await Job.aggregate([
    {
      $match: {
        userId,
        salary: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$stage",
        avgSalary: { $avg: "$salary" },
        minSalary: { $min: "$salary" },
        maxSalary: { $max: "$salary" },
        count: { $sum: 1 },
      },
    },
    { $sort: { avgSalary: -1 } },
  ]);

  return salaryStats;
}
```

---

### 5. Response Rate Analysis

```typescript
async function getResponseRate(userId: string) {
  await connectDB();

  const responseStats = await Application.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        responded: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$status",
                  ["screening", "interview", "offer", "accepted"],
                ],
              },
              1,
              0,
            ],
          },
        },
        rejected: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        total: 1,
        responded: 1,
        rejected: 1,
        responseRate: {
          $multiply: [{ $divide: ["$responded", "$total"] }, 100],
        },
      },
    },
  ]);

  return responseStats[0] || {};
}
```

---

## Indexes & Performance

### Index Strategy

#### 1. Jobs Collection Indexes

```javascript
// Compound index for list queries (sorted by date)
db.jobs.createIndex({ userId: 1, createdAt: -1 });

// Compound index for filtering by stage
db.jobs.createIndex({ userId: 1, stage: 1 });

// Compound index for company search
db.jobs.createIndex({ userId: 1, company: 1 });

// Single field index (covered by compound indexes)
db.jobs.createIndex({ userId: 1 });
```

---

#### 2. Applications Collection Indexes

```javascript
// Unique index for application ID
db.applications.createIndex({ appId: 1 }, { unique: true });

// Compound index for sorting by date
db.applications.createIndex({ userId: 1, appliedDate: -1 });

// Compound index for status filtering
db.applications.createIndex({ userId: 1, status: 1 });

// Foreign key index
db.applications.createIndex({ companyId: 1 });
```

---

#### 3. Offers Collection Indexes

```javascript
// Unique indexes
db.offers.createIndex({ offerId: 1 }, { unique: true });
db.offers.createIndex({ appId: 1 }, { unique: true });

// Compound index for user queries
db.offers.createIndex({ userId: 1, createdAt: -1 });
```

---

### Query Performance Tips

1. **Always Filter by userId First**: Ensures user data isolation and uses indexes
2. **Use Lean Queries**: `.lean()` returns plain JavaScript objects (faster)
3. **Limit Result Sets**: Use `.limit()` to prevent large data transfers
4. **Project Only Needed Fields**: Use `.select()` to reduce payload size
5. **Use Aggregation for Complex Reports**: More efficient than multiple queries

---

## Database Tables Visual Reference

### Entity Relationship Diagram (Textual Representation)

```
┌─────────────────┐
│      User       │ (Managed by Clerk, referenced via userId)
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴──────────────────────────────┐
    │                                   │
    ▼                                   ▼
┌─────────────┐                  ┌──────────────┐
│    Jobs     │                  │ Applications │
│             │                  │              │
│ - userId    │                  │ - appId (PK) │
│ - title     │                  │ - userId     │
│ - company   │                  │ - companyId  │──┐
│ - stage     │                  │ - status     │  │
│ - salary    │                  │ - roleTitle  │  │
└─────────────┘                  └──────┬───────┘  │
                                        │          │
                                     1:1│          │N:1
                                        │          │
                                        ▼          ▼
                                 ┌──────────┐  ┌──────────┐
                                 │  Offers  │  │Companies │
                                 │          │  │          │
                                 │- offerId │  │- name    │
                                 │- appId   │  │- website │
                                 │- userId  │  │- industry│
                                 │- salary  │  └──────────┘
                                 │- equity  │
                                 └──────────┘

┌──────────────────┐           ┌─────────────────┐
│ User Preferences │           │ Communications  │
│                  │           │                 │
│ - userId (1:1)   │           │ - commId        │
│ - desiredRoles   │           │ - userId        │
│ - salaryMin      │           │ - contactName   │
└──────────────────┘           │ - companyId     │
                               └─────────────────┘

┌───────────┐     M:N     ┌──────────────┐
│  Skills   │◄───────────►│ User Skills  │
│           │             │ (Weak Entity)│
│- skillId  │             │ - userId     │
│- name     │             │ - skillId    │
│- category │             │ - proficiency│
└───────────┘             └──────────────┘
```

---

### Collection Size Estimates (for 1000 active users)

| Collection       | Avg Doc Size | Docs per User | Total Docs  | Est. Storage |
| ---------------- | ------------ | ------------- | ----------- | ------------ |
| Jobs             | 500 bytes    | 50            | 50,000      | ~25 MB       |
| Applications     | 600 bytes    | 30            | 30,000      | ~18 MB       |
| Offers           | 700 bytes    | 5             | 5,000       | ~3.5 MB      |
| Companies        | 400 bytes    | Shared        | 2,000       | ~800 KB      |
| Skills           | 150 bytes    | Shared        | 500         | ~75 KB       |
| User Skills      | 200 bytes    | 20            | 20,000      | ~4 MB        |
| User Preferences | 300 bytes    | 1             | 1,000       | ~300 KB      |
| Communications   | 500 bytes    | 15            | 15,000      | ~7.5 MB      |
| **Total**        |              |               | **123,500** | **~59 MB**   |

---

### Sample Database State (Visual)

#### Jobs Table

```
┌──────────────────────────┬────────────────┬──────────────────────┬───────────┬─────────┐
│ _id                      │ userId         │ company              │ stage     │ salary  │
├──────────────────────────┼────────────────┼──────────────────────┼───────────┼─────────┤
│ 6751234567890abcdef12345 │ user_2abc123xyz│ TechCorp Inc         │ interview │ 180000  │
│ 6751234567890abcdef12346 │ user_2abc123xyz│ StartupXYZ           │ applied   │ 150000  │
│ 6751234567890abcdef12347 │ user_2abc123xyz│ BigTech Co           │ offer     │ 220000  │
│ 6751234567890abcdef12348 │ user_2abc123xyz│ AI Innovations       │ rejected  │ 170000  │
└──────────────────────────┴────────────────┴──────────────────────┴───────────┴─────────┘
```

#### Applications Table

```
┌─────────────────────┬────────────────┬──────────────────┬────────────────┬───────────┐
│ appId               │ userId         │ companyId        │ roleTitle      │ status    │
├─────────────────────┼────────────────┼──────────────────┼────────────────┼───────────┤
│ app_1705320000_abc  │ user_2abc123xyz│ comp_techcorp    │ Senior Engineer│ interview │
│ app_1705320001_def  │ user_2abc123xyz│ comp_startupxyz  │ Tech Lead      │ applied   │
│ app_1705320002_ghi  │ user_2abc123xyz│ comp_bigtech     │ Staff Engineer │ offer     │
└─────────────────────┴────────────────┴──────────────────┴────────────────┴───────────┘
```

#### Offers Table

```
┌───────────────────────┬─────────────────────┬───────────┬─────────┬────────┬──────────┐
│ offerId               │ appId               │ salaryBase│ bonus   │ equity │ status   │
├───────────────────────┼─────────────────────┼───────────┼─────────┼────────┼──────────┤
│ offer_1705420000_xyz  │ app_1705320002_ghi  │ 220000    │ 30000   │ 75000  │ pending  │
│ offer_1705420001_uvw  │ app_1705320003_jkl  │ 185000    │ 20000   │ 50000  │ accepted │
└───────────────────────┴─────────────────────┴───────────┴─────────┴────────┴──────────┘
```

---

## Performance Monitoring

### Useful MongoDB Commands

#### 1. Check Index Usage

```javascript
db.jobs.aggregate([{ $indexStats: {} }]);
```

#### 2. Explain Query Plan

```javascript
db.jobs
  .find({ userId: "user_2abc123xyz" })
  .sort({ createdAt: -1 })
  .explain("executionStats");
```

#### 3. Collection Statistics

```javascript
db.jobs.stats();
```

#### 4. Database Size

```javascript
db.stats();
```

---

## Security & Best Practices

### 1. Data Validation

- ✅ All schemas have required fields
- ✅ Enum validation for status/stage fields
- ✅ Min value validation for numeric fields
- ✅ String trimming to prevent whitespace issues

### 2. User Data Isolation

- ✅ All queries include `userId` filter
- ✅ Authorization checks before updates/deletes
- ✅ Foreign key relationships maintain data integrity

### 3. Index Strategy

- ✅ Compound indexes for common query patterns
- ✅ Unique indexes for IDs and constraints
- ✅ Foreign key indexes for joins

### 4. Connection Management

- ✅ Connection pooling (maxPoolSize: 10)
- ✅ Global caching for serverless
- ✅ Proper error handling and timeouts

---

## Summary

**Database**: MongoDB Atlas with Mongoose ODM for type-safe operations

**Collections**: 8 strong entities + 2 weak entities with proper relationships

**Queries**: MongoDB query language with Mongoose abstractions for type safety

**CRUD Operations**: Full implementation with authentication, validation, and error handling

**Aggregations**: Dashboard stats, trends, and analytics via aggregation pipelines

**Indexes**: Strategic compound indexes for optimal query performance

**Performance**: Connection pooling, lean queries, and proper index usage

This database implementation provides a robust, scalable foundation for TrackIQ's job tracking functionality with proper data modeling, efficient queries, and strong data integrity constraints.
