"use client";
import React, { useEffect, useRef, useState } from "react";
import type { Seniority } from "../../lib/career-fit";
import type { CareerProfileData } from "../../hooks/useCareerProfile";
import { useToast } from "../ui/Toast";
import { Card, Button, Field, Label, Input, Select } from "../ui/primitives";
import { UserIcon, XIcon, SparklesIcon } from "../ui/icons";

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
    { value: "intern", label: "Intern" },
    { value: "junior", label: "Junior" },
    { value: "mid", label: "Mid" },
    { value: "senior", label: "Senior" },
    { value: "staff", label: "Staff" },
    { value: "lead", label: "Lead" },
];

/** Split raw text on commas, trim, and drop empties. */
function parseSkills(raw: string): string[] {
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Editor for the user's Career Profile. Skills are entered as chips (comma- or
 * Enter-separated), with a target role and seniority. On save it calls
 * `saveProfile` and surfaces a success/error toast. With no skills yet it shows
 * an elegant prompt — Job Fit depends on skills being present.
 */
export function CareerProfileEditor({
    profile,
    saveProfile,
    onSaved,
}: {
    profile: CareerProfileData;
    saveProfile: (input: CareerProfileData) => Promise<CareerProfileData>;
    onSaved?: (next: CareerProfileData) => void;
}) {
    const toast = useToast();
    const [skills, setSkills] = useState<string[]>(profile.skills);
    const [draft, setDraft] = useState("");
    const [targetRole, setTargetRole] = useState(profile.targetRole ?? "");
    const [seniority, setSeniority] = useState<Seniority>(profile.seniority ?? "mid");
    const [saving, setSaving] = useState(false);
    const skillInputRef = useRef<HTMLInputElement>(null);

    // Keep local form state in sync when the persisted profile loads/changes.
    useEffect(() => {
        setSkills(profile.skills);
        setTargetRole(profile.targetRole ?? "");
        setSeniority(profile.seniority ?? "mid");
    }, [profile]);

    function addSkill(value: string) {
        const parsed = parseSkills(value);
        if (parsed.length === 0) return;
        setSkills((prev) => {
            const seen = new Set(prev.map((s) => s.toLowerCase()));
            const next = [...prev];
            for (const s of parsed) {
                if (!seen.has(s.toLowerCase())) {
                    seen.add(s.toLowerCase());
                    next.push(s);
                }
            }
            return next;
        });
        setDraft("");
    }

    function removeSkill(skill: string) {
        setSkills((prev) => prev.filter((s) => s !== skill));
    }

    function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addSkill(draft);
        } else if (e.key === "Backspace" && draft === "" && skills.length > 0) {
            removeSkill(skills[skills.length - 1]);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // Fold any unsubmitted text in the input into the skills on save.
        const pending = parseSkills(draft);
        const finalSkills = [...skills];
        const seen = new Set(finalSkills.map((s) => s.toLowerCase()));
        for (const s of pending) {
            if (!seen.has(s.toLowerCase())) {
                seen.add(s.toLowerCase());
                finalSkills.push(s);
            }
        }

        setSaving(true);
        try {
            const next = await saveProfile({
                skills: finalSkills,
                targetRole: targetRole.trim(),
                seniority,
            });
            setDraft("");
            toast.success("Career profile saved");
            onSaved?.(next);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save your profile");
        } finally {
            setSaving(false);
        }
    }

    const isEmpty = skills.length === 0;

    return (
        <Card className="glass-panel gradient-border flex h-full flex-col p-6 sm:p-7">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                    <UserIcon size={20} />
                </span>
                <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--text)]">
                        Career Profile
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                        Powers your Job Fit scoring.
                    </p>
                </div>
            </div>

            {isEmpty && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 px-4 py-3">
                    <span className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-300">
                        <SparklesIcon size={18} />
                    </span>
                    <p className="text-sm text-[var(--text-muted)]">
                        Add your skills to unlock Job Fit. Even a handful (e.g. React, TypeScript, SQL)
                        lets us score how well each application matches you.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                <Field
                    label="Skills"
                    htmlFor="profile-skills"
                    hint="Type a skill and press Enter or comma to add it."
                >
                    <div
                        className="flex min-h-11 cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 transition-colors focus-within:border-transparent focus-within:ring-2 focus-within:ring-indigo-500"
                        onClick={() => skillInputRef.current?.focus()}
                    >
                        {skills.map((skill) => (
                            <span
                                key={skill}
                                className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-600 dark:text-indigo-300"
                            >
                                {skill}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeSkill(skill);
                                    }}
                                    aria-label={`Remove ${skill}`}
                                    className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-indigo-500 transition-colors hover:bg-indigo-500/20 hover:text-indigo-700 dark:text-indigo-300"
                                >
                                    <XIcon size={12} />
                                </button>
                            </span>
                        ))}
                        <input
                            ref={skillInputRef}
                            id="profile-skills"
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleSkillKeyDown}
                            onBlur={() => draft.trim() && addSkill(draft)}
                            placeholder={skills.length === 0 ? "e.g. React, TypeScript, SQL" : "Add a skill…"}
                            className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/70 focus:outline-none"
                        />
                    </div>
                </Field>

                <Field label="Target role" htmlFor="profile-target-role">
                    <Input
                        id="profile-target-role"
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Frontend Engineer"
                    />
                </Field>

                <Field label="Seniority" htmlFor="profile-seniority">
                    <Select
                        id="profile-seniority"
                        value={seniority}
                        onChange={(e) => setSeniority(e.target.value as Seniority)}
                    >
                        {SENIORITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </Select>
                </Field>

                <div className="flex justify-end">
                    <Button type="submit" loading={saving}>
                        Save profile
                    </Button>
                </div>
            </form>
        </Card>
    );
}
