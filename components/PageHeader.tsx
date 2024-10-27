"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { useState, useEffect } from "react";

export default function PageHeader() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <div className='mb-20'>
            <motion.div
                className='absolute top-0 left-0 flex items-center justify-between w-full'
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: isLoaded ? 1 : 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
            >
                {/* Gradient background with blurred edges */}
                <div
                    className='absolute top-0 right-0 w-full h-full bg-gradient-to-l from-black/60 via-black/0 to-transparent filter blur-xl'
                    style={{ backgroundPosition: "66.67% 0" }}
                ></div>

                {/* Logo Container */}
                <div className='flex items-center space-x-4 relative z-10'>
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
                </div>

                {/* Navigation */}
                <Navigation />
            </motion.div>
        </div>
    );
}
