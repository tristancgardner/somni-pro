"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import UserAuthStatus from "@/components/UserAuthStatus";
import { useState, useEffect } from "react";

export default function PageHeader() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <header className='w-full mb-20 pt-6'>
            <div className='max-w-7xl mx-auto px-4'>
                {/* Auth Status Bar */}
                <motion.div
                    className="flex justify-end w-full mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLoaded ? 1 : 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    <UserAuthStatus />
                </motion.div>
                
                {/* Main Header */}
                <motion.div
                    className='flex items-center justify-between w-full'
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: isLoaded ? 1 : 0 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                >
                    {/* Logo Container */}
                    <div className='flex items-center mr-8 relative z-10'>
                        {/* Company Logo */}
                        <Image
                            src='/branding/Icon_White.svg'
                            alt='SOMNI DEV Logo'
                            width={40}
                            height={40}
                            className="mr-4"
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
        </header>
    );
}
