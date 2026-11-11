"use client";
import React from "react";
import { ButtonLink } from "./ui/primitives";
import { SparklesIcon } from "./ui/icons";

export default function UpgradeToProButton() {
    return (
        <ButtonLink href="/pricing">
            <SparklesIcon size={16} /> Upgrade to Pro
        </ButtonLink>
    );
}
