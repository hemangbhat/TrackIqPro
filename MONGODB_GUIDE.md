# MongoDB Backend Implementation Guide

## 📚 Table of Contents

1. [Connection Management](#connection-management)
2. [Schema Definitions](#schema-definitions)
3. [CRUD Operations](#crud-operations)
4. [Indexes & Performance](#indexes--performance)
5. [Code Examples](#code-examples)

---

## 🔌 Connection Management

### **File: `lib/db.ts`**

#### **Connection Caching (Serverless Optimization)**

```typescript
let cached: MongooseCache = (global as any).mongoose;
```

**Why Cache?**

- Next.js API routes are **serverless functions**
- Each API call could spawn a new function instance
- Without caching: **NEW connection per request** = slow + connection pool exhaustion
- With caching: **REUSE connection** across requests = fast + efficient

**How It Works:**

```
Request 1 → connectDB() → Creates connection → Stores in global cache
Request 2 → connectDB() → Finds cached connection → Reuses it (instant!)
Request 3 → connectDB() → Finds cached connection → Reuses it (instant!)
```

#### **Connection Options Explained**

```typescript
const opts = {
  bufferCommands: false, // Don't queue operations when disconnected
  maxPoolSize: 10, // Max 10 simultaneous connections
  serverSelectionTimeoutMS: 5000, // 5 sec to find MongoDB server
  socketTimeoutMS: 45000, // 45 sec for idle connections
};
```

**Connection Flow:**

```
1. Check if connection exists in cache
   ├─ YES → Return cached connection ✓
   └─ NO  → Continue to step 2

2. Check if connection promise exists
   ├─ YES → Wait for existing connection attempt
   └─ NO  → Create new connection promise

3. Connect to MongoDB
   ├─ SUCCESS → Cache connection + return ✓
   └─ FAIL    → Clear promise + throw error ✗
```

---

## 📋 Schema Definitions

### **Job Schema** (`models/Job.ts`)

```typescript
const JobSchema = new Schema<IJob>(
  {
    userId: {
      type: String,
      required: true, // ❌ Can't create job without userId
      index: true, // 🚀 Fast lookups by userId
    },

    title: {
      type: String,
      required: true, // ❌ Title is mandatory
      trim: true, // 🔧 Auto-remove whitespace
    },

    stage: {
      type: String,
      required: true,
      enum: [
        "applied",
        "screening",
        "interview",
        "offer",
        "rejected",
        "accepted",
        "withdrawn",
      ],
      default: "applied", // ⚙️ Default value if not provided
    },

    salary: {
      type: Number,
      min: 0, // ❌ Prevent negative salaries
    },

    dateApplied: {
      type: Date,
      default: Date.now, // 📅 Auto-set to current date
      required: true,
    },
  },
  {
    timestamps: true, // 🕒 Auto-add createdAt & updatedAt
  }
);
```

#### **Field Type Reference**

| MongoDB Type | JavaScript Type | Example                    |
| ------------ | --------------- | -------------------------- |
| String       | string          | "Software Engineer"        |
| Number       | number          | 120000                     |
| Date         | Date object     | new Date()                 |
| Boolean      | boolean         | true                       |
| Array        | array           | ["React", "Node"]          |
| ObjectId     | string (ref)    | "507f1f77bcf86cd799439011" |

---

## 🔍 Indexes & Performance

### **What Are Indexes?**

Think of indexes like a **book's index** - instead of reading every page to find "MongoDB", you check the index and jump directly to page 42.

### **Indexes in Your Code:**

```typescript
// Single field index
JobSchema.index({ userId: 1 });
// ↑ Makes "find by userId" VERY fast

// Compound index (multiple fields)
JobSchema.index({ userId: 1, createdAt: -1 });
// ↑ Optimized for: "Get user's jobs sorted by date"

// Unique index
OfferSchema.index({ appId: 1 }, { unique: true });
// ↑ Ensures one offer per application
```

#### **Index Direction:**

- `1` = Ascending (A→Z, 1→9, oldest→newest)
- `-1` = Descending (Z→A, 9→1, newest→oldest)

#### **Performance Impact:**

```
WITHOUT Index:
  Find job by userId → Scan 10,000 documents → 500ms

WITH Index:
  Find job by userId → Jump to index → 5ms (100x faster!)
```

---

## 💾 CRUD Operations Explained

### **CREATE** (POST Request)

```typescript
// 1. Create new document
const newJob = new Job({
  userId: "user_123",
  title: "Backend Engineer",
  company: "Google",
  stage: "applied",
});

// 2. Save to MongoDB
await newJob.save();
```

**What Happens:**

```
Step 1: Validate data against schema
  ├─ userId exists? ✓
  ├─ title exists? ✓
  ├─ stage is valid enum? ✓
  └─ salary >= 0? ✓

Step 2: Generate _id (MongoDB auto-creates)
  → _id: "507f1f77bcf86cd799439011"

Step 3: Add timestamps
  → createdAt: 2025-11-17T10:30:00.000Z
  → updatedAt: 2025-11-17T10:30:00.000Z

Step 4: Write to database
  → Collection: "jobs"
  → Status: Success ✓
```

---

### **READ** (GET Request)

```typescript
// Find all jobs for user
const jobs = await Job.find({ userId: "user_123" })
  .sort({ createdAt: -1 }) // Newest first
  .lean(); // Return plain objects
```

**Query Breakdown:**

```typescript
Job.find({ userId: "user_123" })
  // SQL equivalent: SELECT * FROM jobs WHERE userId = 'user_123'

  .sort({ createdAt: -1 })
  // SQL equivalent: ORDER BY createdAt DESC

  .lean();
// Returns plain JavaScript object instead of Mongoose Document
// Benefit: Faster (no Mongoose methods overhead)
```

**With vs Without `.lean()`:**

```typescript
// Without .lean()
const job = await Job.findById("abc123");
job.save(); // ✓ Can call Mongoose methods
job.toJSON(); // ✓ Has Mongoose methods
// Size: ~2KB (includes Mongoose metadata)

// With .lean()
const job = await Job.findById("abc123").lean();
job.save(); // ✗ Error: not a Mongoose document
// Size: ~0.5KB (plain object only)
// Speed: 2-3x faster
```

---

### **UPDATE** (PUT/PATCH Request)

```typescript
const updatedJob = await Job.findOneAndUpdate(
  { _id: jobId, userId: "user_123" }, // Filter (which document)
  { stage: "interview" }, // Update (what to change)
  {
    new: true, // Return updated document
    runValidators: true, // Validate update against schema
  }
);
```

**Validation Example:**

```typescript
// ✓ Valid update
await Job.findByIdAndUpdate(id, { stage: "interview" });

// ✗ Invalid update (rejected by validator)
await Job.findByIdAndUpdate(id, { stage: "invalid_stage" });
// Error: stage must be one of: applied, screening, interview...

// ✗ Invalid update (rejected by validator)
await Job.findByIdAndUpdate(id, { salary: -50000 });
// Error: salary must be >= 0
```

---

### **DELETE** (DELETE Request)

```typescript
const result = await Job.deleteOne({
  _id: jobId,
  userId: "user_123", // Security: only delete user's own jobs
});

if (result.deletedCount === 0) {
  // Job not found or doesn't belong to user
}
```

**Return Value:**

```typescript
{
  acknowledged: true,
  deletedCount: 1    // Number of documents deleted
}
```

---

## 🔐 Security Patterns

### **User Data Isolation**

```typescript
// ✓ GOOD - Only user's jobs
await Job.find({ userId: req.userId });

// ✗ BAD - Returns ALL jobs from database
await Job.find({});
```

### **Preventing Unauthorized Updates**

```typescript
// ✓ GOOD - Update only if job belongs to user
await Job.findOneAndUpdate(
  { _id: jobId, userId: req.userId }, // Both conditions must match
  { stage: "interview" }
);

// ✗ BAD - Could update another user's job
await Job.findByIdAndUpdate(jobId, { stage: "interview" });
```

---

## 📊 Real Example: API Request Flow

### **POST /api/jobs** (Create Job)

```typescript
// 1. REQUEST from frontend
fetch("/api/jobs", {
  method: "POST",
  body: JSON.stringify({
    title: "Senior Developer",
    company: "Microsoft",
    salary: 150000
  })
});

// 2. API ROUTE handler
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // 2a. Connect to MongoDB
  await connectDB();  // Uses cached connection if exists

  // 2b. Validate plan limits
  const jobCount = await Job.countDocuments({ userId });
  if (plan === "free" && jobCount >= 10) {
    return res.status(403).json({ error: "Limit reached" });
  }

  // 2c. Create job document
  const newJob = new Job({
    userId: req.userId,          // From auth middleware
    title: "Senior Developer",
    company: "Microsoft",
    salary: 150000,
    stage: "applied",            // Default
    status: "active",            // Default
    dateApplied: new Date()      // Auto-set
  });

  // 2d. Save to MongoDB
  await newJob.save();
  // MongoDB generates: _id, createdAt, updatedAt

  // 2e. Return to frontend
  return res.status(201).json(newJob);
}

// 3. MONGODB stores document
{
  _id: ObjectId("674a1b2c3d4e5f6789012345"),
  userId: "user_2abc123xyz",
  title: "Senior Developer",
  company: "Microsoft",
  salary: 150000,
  stage: "applied",
  status: "active",
  dateApplied: ISODate("2025-11-17T10:30:00Z"),
  createdAt: ISODate("2025-11-17T10:30:00Z"),
  updatedAt: ISODate("2025-11-17T10:30:00Z")
}

// 4. FRONTEND receives response
{
  _id: "674a1b2c3d4e5f6789012345",
  userId: "user_2abc123xyz",
  title: "Senior Developer",
  company: "Microsoft",
  salary: 150000,
  stage: "applied",
  status: "active",
  dateApplied: "2025-11-17T10:30:00.000Z",
  createdAt: "2025-11-17T10:30:00.000Z",
  updatedAt: "2025-11-17T10:30:00.000Z"
}
```

---

## 🎯 Key MongoDB Concepts

### **Collections**

- Like SQL tables
- Your app has: `jobs`, `offers`, `applications`, `companies`, `notes`

### **Documents**

- Like SQL rows
- Each job is one document
- Format: JSON-like (BSON)

### **Schemas (Mongoose)**

- Defines structure and validation
- MongoDB is schema-less, but Mongoose adds schema
- Prevents invalid data from entering database

### **Models**

- JavaScript class representing a collection
- `Job.find()` → Search jobs collection
- `Offer.create()` → Add to offers collection

---

## 🚀 Performance Tips

### **1. Use Indexes**

```typescript
// Slow (no index)
await Job.find({ company: "Google" }); // Scans all documents

// Fast (with index)
JobSchema.index({ company: 1 });
await Job.find({ company: "Google" }); // Uses index
```

### **2. Use `.lean()`**

```typescript
// Slow (full Mongoose document)
const jobs = await Job.find({ userId });

// Fast (plain objects)
const jobs = await Job.find({ userId }).lean();
```

### **3. Select Only Needed Fields**

```typescript
// Returns full document (wasteful)
const jobs = await Job.find({ userId });

// Returns only title & company (efficient)
const jobs = await Job.find({ userId }).select("title company");
```

### **4. Limit Results**

```typescript
// Could return 10,000 jobs (slow)
const jobs = await Job.find({ userId });

// Returns max 50 jobs (fast)
const jobs = await Job.find({ userId }).limit(50);
```

---

## 📝 Common Operations Cheat Sheet

```typescript
// CREATE
const job = await Job.create({ userId, title, company });
const job = new Job({ userId, title }); await job.save();

// READ
const jobs = await Job.find({ userId });              // All user jobs
const job = await Job.findById(jobId);                // By _id
const job = await Job.findOne({ userId, title });     // First match
const count = await Job.countDocuments({ userId });   // Count only

// UPDATE
await Job.findByIdAndUpdate(id, { stage: "interview" });
await Job.findOneAndUpdate({ _id: id, userId }, { stage: "interview" });
await Job.updateMany({ status: "active" }, { status: "closed" });

// DELETE
await Job.findByIdAndDelete(id);
await Job.deleteOne({ _id: id, userId });
await Job.deleteMany({ status: "closed" });

// QUERY MODIFIERS
.sort({ createdAt: -1 })     // Newest first
.limit(10)                    // Max 10 results
.skip(20)                     // Skip first 20 (pagination)
.select('title company')      // Only these fields
.lean()                       // Plain objects
```

---

## 🔗 Your MongoDB Connection String

```
mongodb+srv://Hemang:blitzkrieg124@cluster1.jud7bgy.mongodb.net/trackiq?retryWrites=true&w=majority&appName=Cluster1

Components:
- Protocol: mongodb+srv://
- Username: Hemang
- Password: blitzkrieg124
- Host: cluster1.jud7bgy.mongodb.net
- Database: trackiq  ← Your data stored here
- Options: retryWrites=true&w=majority
```

---

## 📊 Your Current Collections

1. **jobs** - Job applications tracking
2. **offers** - Job offers received
3. **notes** - Personal notes
4. **applications** - Structured applications (ready for use)
5. **companies** - Company information (ready for use)
6. **userplans** - Subscription plans

This is your complete MongoDB backend! 🚀
