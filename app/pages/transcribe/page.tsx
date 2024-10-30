"use client";

import AudioWaveform from "@/components/custom/diar-plot";
import PromptLlama from "@/components/custom/prompt-llama";
import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default function TranscribePage() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [transcription, setTranscription] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <BackgroundWrapper imagePath='/images/electric_timeline.png'>
            <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />
                    <div className='p-4'>
                        <AudioWaveform />
                    </div>
                    <div className='p-4'>
                        <PromptLlama />
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}
