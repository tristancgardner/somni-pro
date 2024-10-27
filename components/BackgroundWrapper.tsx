"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface BackgroundWrapperProps {
    children: ReactNode;
    imagePath?: string;
}

export default function BackgroundWrapper({
    children,
    imagePath = "/images/electric_timeline.png",
}: BackgroundWrapperProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
                backgroundImage: `url("${imagePath}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
                minHeight: "100vh",
                position: "relative",
                backgroundColor: "#000",
                overflow: "auto",
            }}
        >
            {/* Gradient Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0, duration: 0.25 }}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background:
                        "linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 70%, rgba(0, 0, 0, 1) 100%)",
                    zIndex: 1,
                }}
            />
            {/* Additional Black Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 0, duration: 0.25 }}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#000",
                    zIndex: 2,
                }}
            />
            {/* Content */}
            <div className='relative z-10'>{children}</div>
        </motion.div>
    );
}
