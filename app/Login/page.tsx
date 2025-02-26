"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import Login from "@/components/login";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <BackgroundWrapper imagePath='/images/electric_timeline.png'>
            <main className='flex min-h-screen flex-col items-center p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />
                    <div className='flex flex-col items-center justify-center mt-[150px]'>
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="mb-10 text-center"
                        >
                            <h1 className="text-3xl font-bold text-white mb-2">Welcome to Somni Pro</h1>
                            <p className="text-gray-300">Sign in with your social account to continue</p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            <Login />
                        </motion.div>
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}
