"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "./ui/primitives";
import { useReducedMotion } from "./useReducedMotion";
import { staggerItemPreset } from "./motion";

type Activity = {
    id: string;
    stage: string;
    title: string;
    company: string;
    timestamp: string;
};

export default function RecentActivity({ activities }: { activities: Activity[] }) {
    const reduced = useReducedMotion();
    if (activities.length === 0) {
        return (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                No recent activity yet. Add your first application to get started.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {activities.map((activity, idx) => {
                const ts = new Date(activity.timestamp);
                const valid = !isNaN(ts.getTime());
                const motionProps = staggerItemPreset(reduced, idx);
                return (
                    <motion.div
                        key={activity.id}
                        initial={motionProps.initial}
                        animate={motionProps.animate}
                        transition={motionProps.transition}
                        className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-[var(--surface-2)]"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="truncate text-sm font-semibold text-[var(--text)]">
                                {activity.title}
                            </div>
                            <div className="truncate text-xs text-[var(--text-muted)]">
                                {activity.company}
                            </div>
                        </div>
                        <Badge tone={activity.stage}>{activity.stage}</Badge>
                        <div className="w-24 shrink-0 text-right text-xs text-[var(--text-muted)]">
                            {valid ? formatDistanceToNow(ts, { addSuffix: true }) : "—"}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
