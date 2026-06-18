"use client";
import React from "react";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ui/Toast";
import { MotionProvider } from "./motion";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <MotionProvider>
                <ToastProvider>{children}</ToastProvider>
            </MotionProvider>
        </ThemeProvider>
    );
}
