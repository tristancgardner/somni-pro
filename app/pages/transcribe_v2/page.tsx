"use client";

import AudioWaveform, {
    TranscriptionResult,
} from "@/components/custom/diar-plot";
import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default function TranscribePage() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [transcriptionResult, setTranscriptionResult] =
        useState<TranscriptionResult | null>(null);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    const handleTranscriptionResult = (result: TranscriptionResult) => {
        console.log("Parent received updated transcription result:", result);
        setTranscriptionResult(result);
    };

    return (
        <BackgroundWrapper imagePath='/images/electric_timeline.png'>
            <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
                
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />
                    <div className='p-4'>
                        <AudioWaveform
                            transcriptionResult={transcriptionResult}
                            setTranscriptionResult={handleTranscriptionResult}
                        />
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}
