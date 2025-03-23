"use client";
import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

interface BackgroundWrapperProps {
    children: ReactNode;
}

export default function BackgroundWrapper({
    children,
}: BackgroundWrapperProps) {
    // Use client-side only rendering to avoid hydration mismatch
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Return a placeholder with the same structure but without styles that could cause hydration issues
        return (
            <div style={{ minHeight: "100vh", position: "relative", backgroundColor: "var(--background)" }}>
                <div className="relative z-10">{children}</div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
                minHeight: "100vh",
                position: "relative",
                backgroundColor: "var(--background)",
                overflow: "auto",
            }}
        >
            {/* Content */}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}
