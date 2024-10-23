"use client";

import AudioWaveform from "@/components/custom/diar-plot";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function Home() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <div
            style={{
                backgroundImage: 'url("images/electric_timeline.png")',
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
                minHeight: "100vh",
                position: "relative",
                backgroundColor: "#000", // Dark background color
                overflow: "auto",
            }}
        >
            <div
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
            <main className='relative z-10 flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <div className='mb-20'>
                        {/* Logo Container */}
                        <motion.div
                            className='absolute top-0 left-0 flex items-center space-x-4'
                            initial={{ y: -30, opacity: 0 }}
                            animate={{ y: 0, opacity: isLoaded ? 1 : 0 }}
                            transition={{ delay: 0.15, duration: 0.6 }}
                        >
                            {/* Company Logo */}
                            <Image
                                src='/branding/Icon_White.svg'
                                alt='SOMNI DEV Logo'
                                width={40}
                                height={40}
                            />
                            {/* SOMNI DEV Wordmark */}
                            <div className='flex flex-col items-start'>
                                <span className='text-2xl font-bold tracking-tight leading-none text-white'>
                                    SOMNI
                                </span>
                                <span className='text-xs font-semibold tracking-wider text-white'>
                                    ASSEMBLE
                                </span>
                            </div>
                        </motion.div>
                    </div>
                    <AudioWaveform />
                </div>
            </main>
        </div>
    );
}
