"use client";
import React from "react";
import Link from "next/link";
import { Button } from "./ui/primitives";
import { SparklesIcon } from "./ui/icons";

export default function UpgradeToProButton() {
    return (
        <Link href="/pricing">
            <Button>
                <SparklesIcon size={16} /> Upgrade to Pro
            </Button>
        </Link>
    );
}
