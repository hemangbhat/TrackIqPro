import React from "react";
import UpgradeToProButton from "./UpgradeToProButton";
import { EmptyState } from "./ui/primitives";
import { LockIcon } from "./ui/icons";

export default function LockedFeature({
    message = "This feature is available on the Pro plan.",
}: {
    message?: string;
}) {
    return (
        <EmptyState
            icon={<LockIcon />}
            title="Pro feature"
            description={message}
            action={<UpgradeToProButton />}
        />
    );
}
