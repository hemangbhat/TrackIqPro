"use client";
// components/JobFormDrawer.tsx
//
// Accessible create/edit drawer for a job application. Presentation layer only:
// it renders a labeled, validated form and delegates persistence to the
// `onSubmit` callback supplied by the page (which wires useJobs().createJob or
// the PUT update). No API contract or data shape changes.
//
// Behavior (Requirement 8):
//   - 8.1 Labeled fields for title, company, location, stage, status, salary,
//         link, description, notes; title/company/stage/status required.
//   - 8.2 Create mode defaults stage="applied", status="active".
//   - 8.3 Validation: title/company >= 1 non-whitespace char, stage in the
//         stage set, status in {active, closed}, salary (if provided) >= 0.
//   - 8.4 Valid submit invokes the supplied mutation (onSubmit).
//   - 8.5 Success closes the drawer and shows an auto-dismissing success toast.
//   - 8.6 Invalid submit blocks the mutation, keeps the drawer open with the
//         entered values, focuses the first invalid input, and shows per-field
//         messages associated via aria-describedby (Field primitive).
//   - 8.7 Mutation failure keeps the drawer open with values and shows an
//         error toast.
//   - 8.8 Every input is associated with a visible label (Field + Label).
//
// Plan gating (Requirement 4.2): in create mode, when the user is at/over the
// free job limit and is not Pro, an inline upgrade prompt is shown and the
// submit control is disabled so it cannot initiate submission.
//
// Accessibility (Requirements 15.1, 15.8): inputs carry visible labels;
// validation moves focus to the first invalid input and surfaces a text error
// via aria-describedby while retaining entered values.
//
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 4.2, 15.1, 15.8

import React from "react";
import { Drawer } from "./ui/Drawer";
import {
    Button,
    Field,
    Input,
    Select,
    Textarea,
} from "./ui/primitives";
import { useToast } from "./ui/Toast";
import UpgradePrompt from "./UpgradePrompt";
import { JOB_LIMIT_UPGRADE_MESSAGE } from "../lib/plan-gate";
import type { Job } from "../types";
import type { JobInput } from "../hooks/useJobs";

/** Valid stage values (Requirement 8.3). */
export const JOB_STAGES: Job["stage"][] = [
    "applied",
    "screening",
    "interview",
    "offer",
    "rejected",
    "accepted",
    "withdrawn",
];

/** Valid status values (Requirement 8.3). */
export const JOB_STATUSES: Job["status"][] = ["active", "closed"];

export interface JobFormDrawerProps {
    /** Whether the drawer is open. */
    open: boolean;
    /** Create a new job or edit an existing one. */
    mode: "create" | "edit";
    /** Existing values to prefill when editing (or partial defaults). */
    initial?: Partial<Job>;
    /** Close the drawer without submitting. */
    onClose: () => void;
    /**
     * Persist the validated input. Resolves on success, rejects on failure.
     * The page wires this to useJobs().createJob or the PUT update.
     */
    onSubmit: (input: JobInput) => Promise<void>;
    /**
     * Advisory free-plan gate. When `atLimit && !isPro` in create mode, the
     * drawer shows an inline upgrade prompt and disables submit (Req 4.2).
     */
    planGate?: { atLimit: boolean; limit: number; isPro: boolean };
}

/** Internal string-based form state (all inputs are controlled strings). */
interface FormState {
    title: string;
    company: string;
    location: string;
    stage: Job["stage"];
    status: Job["status"];
    salary: string;
    link: string;
    jobDescription: string;
    notes: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

/** Fields in display order — used to focus the first invalid input (Req 15.8). */
const FIELD_ORDER: (keyof FormState)[] = [
    "title",
    "company",
    "location",
    "stage",
    "status",
    "salary",
    "link",
    "jobDescription",
    "notes",
];

function buildInitialState(initial?: Partial<Job>): FormState {
    return {
        title: initial?.title ?? "",
        company: initial?.company ?? "",
        location: initial?.location ?? "",
        // Create defaults: stage="applied", status="active" (Req 8.2).
        stage: initial?.stage ?? "applied",
        status: initial?.status ?? "active",
        salary:
            initial?.salary === undefined || initial?.salary === null
                ? ""
                : String(initial.salary),
        link: initial?.link ?? "",
        jobDescription: initial?.jobDescription ?? "",
        notes: initial?.notes ?? "",
    };
}

/**
 * Validate the form per Requirement 8.3. Returns a map of field -> message for
 * every invalid field (empty when the form is valid).
 */
function validate(form: FormState): FormErrors {
    const errors: FormErrors = {};

    if (form.title.trim().length < 1) {
        errors.title = "Title is required.";
    }
    if (form.company.trim().length < 1) {
        errors.company = "Company is required.";
    }
    if (!JOB_STAGES.includes(form.stage)) {
        errors.stage = "Select a valid stage.";
    }
    if (!JOB_STATUSES.includes(form.status)) {
        errors.status = "Select a valid status.";
    }

    const salaryRaw = form.salary.trim();
    if (salaryRaw !== "") {
        const salaryNum = Number(salaryRaw);
        if (!Number.isFinite(salaryNum) || salaryNum < 0) {
            errors.salary = "Salary must be a number greater than or equal to 0.";
        }
    }

    return errors;
}

/** Build the JobInput payload from validated form state. */
function toJobInput(form: FormState): JobInput {
    const input: JobInput = {
        title: form.title.trim(),
        company: form.company.trim(),
        stage: form.stage,
        status: form.status,
    };

    const location = form.location.trim();
    if (location) input.location = location;

    const link = form.link.trim();
    if (link) input.link = link;

    const jobDescription = form.jobDescription.trim();
    if (jobDescription) input.jobDescription = jobDescription;

    const notes = form.notes.trim();
    if (notes) input.notes = notes;

    const salaryRaw = form.salary.trim();
    if (salaryRaw !== "") input.salary = Number(salaryRaw);

    return input;
}

export default function JobFormDrawer({
    open,
    mode,
    initial,
    onClose,
    onSubmit,
    planGate,
}: JobFormDrawerProps) {
    const toast = useToast();
    const formId = React.useId();

    const [form, setForm] = React.useState<FormState>(() =>
        buildInitialState(initial)
    );
    const [errors, setErrors] = React.useState<FormErrors>({});
    const [submitting, setSubmitting] = React.useState(false);

    // Refs to focusable inputs, keyed by field name (Req 15.8 focus-to-first).
    const fieldRefs = React.useRef<
        Partial<Record<keyof FormState, HTMLElement | null>>
    >({});

    // Reset the form whenever the drawer (re)opens or the initial values change.
    React.useEffect(() => {
        if (open) {
            setForm(buildInitialState(initial));
            setErrors({});
            setSubmitting(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initial, mode]);

    // Advisory free-limit gate: only blocks creating new jobs (Req 4.2).
    const gated =
        mode === "create" && !!planGate && planGate.atLimit && !planGate.isPro;

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        // Clear a field's error as the user edits it.
        setErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const focusFirstInvalid = (errs: FormErrors) => {
        const firstInvalid = FIELD_ORDER.find((f) => errs[f]);
        if (firstInvalid) {
            fieldRefs.current[firstInvalid]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (gated || submitting) return;

        const validationErrors = validate(form);
        if (Object.keys(validationErrors).length > 0) {
            // Block the mutation, keep the drawer open with values, focus the
            // first invalid input, and show per-field messages (Req 8.6, 15.8).
            setErrors(validationErrors);
            focusFirstInvalid(validationErrors);
            return;
        }

        setErrors({});
        setSubmitting(true);
        try {
            await onSubmit(toJobInput(form));
            // Success: close the drawer + auto-dismissing success toast (Req 8.5).
            toast.success(
                mode === "create" ? "Job added." : "Job updated."
            );
            onClose();
        } catch (err) {
            // Failure: keep the drawer open with values + error toast (Req 8.7).
            toast.error(
                err instanceof Error && err.message
                    ? err.message
                    : "Couldn't save the job. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const title = mode === "create" ? "Add job" : "Edit job";

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <Button variant="secondary" type="button" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form={formId}
                        loading={submitting}
                        disabled={gated}
                    >
                        {mode === "create" ? "Add job" : "Save changes"}
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={handleSubmit} className="space-y-4" noValidate>
                <p className="font-mono-label text-[11px] uppercase text-[var(--text-muted)]">
                    {mode === "create" ? "New application" : "Update application"}
                </p>

                {gated && (
                    <UpgradePrompt
                        message={JOB_LIMIT_UPGRADE_MESSAGE}
                        variant="inline"
                    />
                )}

                <Field
                    label="Title"
                    htmlFor={`${formId}-title`}
                    error={errors.title}
                >
                    <Input
                        id={`${formId}-title`}
                        ref={(el) => {
                            fieldRefs.current.title = el;
                        }}
                        value={form.title}
                        onChange={(e) => setField("title", e.target.value)}
                        placeholder="Software Engineer"
                        required
                    />
                </Field>

                <Field
                    label="Company"
                    htmlFor={`${formId}-company`}
                    error={errors.company}
                >
                    <Input
                        id={`${formId}-company`}
                        ref={(el) => {
                            fieldRefs.current.company = el;
                        }}
                        value={form.company}
                        onChange={(e) => setField("company", e.target.value)}
                        placeholder="Acme Inc."
                        required
                    />
                </Field>

                <Field
                    label="Location (optional)"
                    htmlFor={`${formId}-location`}
                    error={errors.location}
                >
                    <Input
                        id={`${formId}-location`}
                        ref={(el) => {
                            fieldRefs.current.location = el;
                        }}
                        value={form.location}
                        onChange={(e) => setField("location", e.target.value)}
                        placeholder="Remote · San Francisco, CA"
                    />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                        label="Stage"
                        htmlFor={`${formId}-stage`}
                        error={errors.stage}
                    >
                        <Select
                            id={`${formId}-stage`}
                            ref={(el) => {
                                fieldRefs.current.stage = el;
                            }}
                            value={form.stage}
                            onChange={(e) =>
                                setField("stage", e.target.value as Job["stage"])
                            }
                            required
                        >
                            {JOB_STAGES.map((s) => (
                                <option key={s} value={s}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <Field
                        label="Status"
                        htmlFor={`${formId}-status`}
                        error={errors.status}
                    >
                        <Select
                            id={`${formId}-status`}
                            ref={(el) => {
                                fieldRefs.current.status = el;
                            }}
                            value={form.status}
                            onChange={(e) =>
                                setField("status", e.target.value as Job["status"])
                            }
                            required
                        >
                            {JOB_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <Field
                    label="Salary (optional)"
                    htmlFor={`${formId}-salary`}
                    hint="Annual base in your currency."
                    error={errors.salary}
                >
                    <Input
                        id={`${formId}-salary`}
                        ref={(el) => {
                            fieldRefs.current.salary = el;
                        }}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={form.salary}
                        onChange={(e) => setField("salary", e.target.value)}
                        placeholder="120000"
                    />
                </Field>

                <Field
                    label="Link (optional)"
                    htmlFor={`${formId}-link`}
                    error={errors.link}
                >
                    <Input
                        id={`${formId}-link`}
                        ref={(el) => {
                            fieldRefs.current.link = el;
                        }}
                        type="url"
                        value={form.link}
                        onChange={(e) => setField("link", e.target.value)}
                        placeholder="https://company.com/careers/123"
                    />
                </Field>

                <Field
                    label="Description (optional)"
                    htmlFor={`${formId}-description`}
                    error={errors.jobDescription}
                >
                    <Textarea
                        id={`${formId}-description`}
                        ref={(el) => {
                            fieldRefs.current.jobDescription = el;
                        }}
                        value={form.jobDescription}
                        onChange={(e) => setField("jobDescription", e.target.value)}
                        placeholder="Role responsibilities, requirements, etc."
                    />
                </Field>

                <Field
                    label="Notes (optional)"
                    htmlFor={`${formId}-notes`}
                    error={errors.notes}
                >
                    <Textarea
                        id={`${formId}-notes`}
                        ref={(el) => {
                            fieldRefs.current.notes = el;
                        }}
                        value={form.notes}
                        onChange={(e) => setField("notes", e.target.value)}
                        placeholder="Recruiter name, referral, next steps…"
                    />
                </Field>
            </form>
        </Drawer>
    );
}
