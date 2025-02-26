"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default function HomePage() {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <BackgroundWrapper imagePath="/images/electric_timeline.png">
            <main className='flex min-h-screen flex-col items-center justify-between p-6 sm:p-12 md:p-24 pt-9'>
                <div className="w-full max-w-7xl mx-auto">
                    <PageHeader />
                    <div className='flex flex-col items-center justify-center mt-[150px] text-center'>
                        <h1 className='text-4xl md:text-5xl font-bold text-white mb-4'>Welcome to Somni Pro</h1>
                        <p className='text-xl text-gray-300'>Your gateway to advanced speaker diarization and more.</p>
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}