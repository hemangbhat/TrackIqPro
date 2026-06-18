# TrackIQ — Data Schema

Database: MongoDB (Mongoose). All user-owned collections store the Clerk
`userId` (string) and are queried with it for isolation.

## 1. Job (`models/Job.ts`) — canonical application record
| Field | Type | Notes |
|-------|------|-------|
| userId | string | required, indexed |
| title | string | required |
| company | string | required |
| location | string | optional |
| stage | enum | `applied \| screening \| interview \| offer \| rejected \| accepted \| withdrawn` (default `applied`) |
| status | enum | `active \| closed` (default `active`) |
| link | string | optional |
| salary | number | optional, min 0 |
| jobDescription | string | optional |
| notes | string | optional |
| dateApplied | Date | default now |
| createdAt/updatedAt | Date | timestamps |

Indexes: `{userId, createdAt}`, `{userId, stage}`, `{userId, company}`.

## 2. Note (`models/Note.ts`)
| Field | Type | Notes |
|-------|------|-------|
| userId | string | required, indexed |
| jobId | string\|null | optional link to a Job, indexed |
| title | string | required |
| content | string | required |
| round | string | optional (e.g., "Phone screen", "Onsite") |
| createdAt/updatedAt | Date | timestamps |

Indexes: `{userId, createdAt}`, `{userId, jobId}`.

## 3. Offer (`models/Offer.ts`)
| Field | Type | Notes |
|-------|------|-------|
| offerId | string | unique app-generated id |
| userId | string | required, indexed |
| appId | string\|null | optional link |
| company | string | required |
| title | string | required |
| location | string | optional |
| salaryBase | number | required, min 0 |
| bonus | number | default 0 |
| equity | number | default 0 |
| signingBonus | number | default 0 |
| ptoDays | number | default 0 |
| remoteType | enum | `onsite \| hybrid \| remote` |
| benefits | string | optional |
| techStack | string[] | optional |
| growthScore | number | 0–10, default 7 |
| brandScore | number | 0–10, default 7 |
| deadlineDate | Date | optional |
| status | enum | `pending \| accepted \| rejected` (default pending) |
| notes | string | optional |
| createdAt/updatedAt | Date | timestamps |

Index: `{userId, createdAt}`.

## 4. UserPlan (`models/UserPlan.ts`) — billing/entitlement| Field | Type | Notes |
|-------|------|-------|
| userId | string | one per user |
| plan | string | `free \| pro` (default free) |
| customerId | string | Stripe customer id |
| status | string | `active \| past_due \| canceled \| trialing` |
| trialEnd | Date\|null | optional |
| createdAt | Date | |

## 5. CareerProfile (`models/CareerProfile.ts`) — Career Intelligence inputs
| Field | Type | Notes |
|-------|------|-------|
| userId | string | required, indexed, unique (one per user) |
| skills | string[] | self-reported skills (powers Job Fit) |
| targetRole | string | e.g. "Senior Frontend Engineer" |
| seniority | enum | `intern\|junior\|mid\|senior\|staff\|lead` (default mid) |
| createdAt/updatedAt | Date | timestamps |

Contains no identity/entitlement data. Consumed by `lib/career-fit` for Job Fit
scoring via the `/api/career-profile` route and `useCareerProfile` hook.

## 6. Auxiliary (not in v1 UI flow)
- **Company** (`models/Company.ts`): normalized company metadata.
- **Application** (`models/Application.ts`): legacy application concept; superseded
  by `Job` for v1. Retained for potential normalization; not wired to UI.

## 6. Relationships
```
UserPlan (1) ─── (1) User[Clerk]
Job (N) ─── (1) User
Note (N) ─── (1) User,  Note (N) ─── (0..1) Job   [via jobId]
Offer (N) ─── (1) User
```

## 7. Shared TS Types (`types/index.ts`)
`Job`, `Offer`, `Note`, `Application`, `Company` interfaces mirror the schemas
and drive client typing.
