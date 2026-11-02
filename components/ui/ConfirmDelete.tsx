"use client";
import React, { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./primitives";

/**
 * Asks before a permanent delete. Lists put the trash icon right beside edit,
 * and nothing can be restored afterwards, so a slip must cost one more tap,
 * not the record. Same wording and buttons as the job detail page's dialog.
 */
export function ConfirmDelete({
    target,
    title,
    onCancel,
    onConfirm,
}: {
    /** What will be deleted, as the user knows it ("Staff Engineer at Linear"); null when closed. */
    target: string | null;
    title: string;
    onCancel: () => void;
    onConfirm: () => Promise<void> | void;
}) {
    const [busy, setBusy] = useState(false);

    async function confirm() {
        setBusy(true);
        try {
            await onConfirm();
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            open={target !== null}
            onClose={() => {
                if (!busy) onCancel();
            }}
            title={title}
            footer={
                <>
                    <Button variant="secondary" onClick={onCancel} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={() => void confirm()} loading={busy}>
                        Delete
                    </Button>
                </>
            }
        >
            <p className="text-sm text-[var(--text-muted)] [overflow-wrap:anywhere]">
                This will permanently delete <span className="font-semibold text-[var(--text)]">{target}</span>. This
                action cannot be undone.
            </p>
        </Modal>
    );
}
