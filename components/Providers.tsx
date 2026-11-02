"use client";
import React from "react";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ui/Toast";
import { MotionProvider } from "./motion";
import { CheckoutReturnNotice } from "./CheckoutReturnNotice";
import { ThemeColorSync } from "./ThemeColorSync";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <MotionProvider>
                <ToastProvider>
                    {children}
                    <CheckoutReturnNotice />
                    <ThemeColorSync />
                </ToastProvider>
            </MotionProvider>
        </ThemeProvider>
    );
}
