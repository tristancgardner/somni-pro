"use client";

import AudioWaveform from "@/components/custom/diar-plot";
import PromptLlama from "@/components/custom/prompt-llama";
import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import Summarize from "@/components/custom/summarize";
import { Speaker } from "@/components/custom/diar-plot";

// Update the type definition to include summary
type TranscriptionResult = {
    segments: Array<{
        speaker: string;
        start: number;
        end: number;
        text: string;
    }>;
    og_file_name: string;
    file_name: string;
    rttm_lines: string[];
    speaker_colors?: Record<string, string>;
    transcript: string;
    speakerLegend?: Record<string, Speaker>;
    summary?: string;
};

export default function TranscribePage() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // Handler to update transcriptionResult
    const handleTranscriptionResult = (result: TranscriptionResult) => {
        setTranscriptionResult(result);
    };

    // Add handler for summary updates
    const handleSummaryUpdate = (summary: string) => {
        if (transcriptionResult) {
            setTranscriptionResult({
                ...transcriptionResult,
                summary
            });
        }
    };

    return (
        <BackgroundWrapper imagePath='/images/electric_timeline.png'>
            <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />
                    <div className='p-4'>
                        <AudioWaveform 
                            onTranscriptionResult={handleTranscriptionResult}
                        />
                    </div>
                    <div className='p-4'>
                        <Summarize 
                            transcript={transcriptionResult?.transcript || ""} 
                            onSummaryGenerated={handleSummaryUpdate}
                            existingSummary={transcriptionResult?.summary}
                            fileName={transcriptionResult?.og_file_name}
                        />
                    </div>
                    <div className='p-4'>
                        <PromptLlama />
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}
