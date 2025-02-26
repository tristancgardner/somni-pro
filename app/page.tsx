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
            <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />
                    <div className='flex items-center justify-center mt-[200px]'>
                        <h1 className='text-4xl font-bold text-white'>Welcome to Somni Pro</h1>
                        <p className='text-lg text-gray-300 mt-4'>Your gateway to advanced speaker diarization and more.</p>
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}