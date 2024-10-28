"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import Login from "@/components/login";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import { motion } from "framer-motion";

export default function Home() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <BackgroundWrapper imagePath='/images/electric_timeline.png'>
            <main className='flex min-h-screen flex-col items-center p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />
                    <div className='flex items-center justify-center mt-20'>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.3, duration: 0.5 }}
                        >
                            <Login />
                        </motion.div>
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}
