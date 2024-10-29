"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Check, Square } from "lucide-react"; // For checkbox icons

export default function FeaturesPage() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    return (
        <BackgroundWrapper imagePath='/images/electric_timeline.png'>
            <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />

                    <div className='mt-20'>
                        <h2 className='text-3xl font-bold text-white mb-8'>
                            Track Beta Features
                        </h2>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            {/* Interactive Features Card */}
                            <Card className='card'>
                                <CardHeader>
                                    <CardTitle className='text-white'>
                                        Interactive Features
                                    </CardTitle>
                                    <CardDescription className='text-gray-400'>
                                        Enhanced user interaction capabilities
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='text-gray-300'>
                                    <ul className='space-y-3'>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Check className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Clicking segments jumps to time
                                                in audio playback
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Hover on waveforms with speaker
                                                identification
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Timecode with frame rate support
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Feature requests & issue
                                                reporting
                                            </span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Progress Tracking Card */}
                            <Card className='card'>
                                <CardHeader>
                                    <CardTitle className='text-white'>
                                        Tracking & Usability
                                    </CardTitle>
                                    <CardDescription className='text-gray-400'>
                                        Batch processing & user accounts
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='text-gray-300'>
                                    <ul className='space-y-3'>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Live progress updates during
                                                transcription & diarization
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Process multiple files in batch with speaker identification
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Auto-suggest speaker labels
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Save files persistently in user
                                                account
                                            </span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Interview Analysis Card */}
                            <Card className='card'>
                                <CardHeader>
                                    <CardTitle className='text-white'>
                                        Interview Analysis
                                    </CardTitle>
                                    <CardDescription className='text-gray-400'>
                                        AI-powered interview insights
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='text-gray-300'>
                                    <ul className='space-y-3'>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Check className='h-4 w-4' />
                                            </div>
                                            <span>
                                                View segments in a timeline
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Check className='h-4 w-4' />
                                            </div>
                                            <span>
                                                View segments per speaker
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Interview summary generation
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Topic/answer classification
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>Interview Q&A viewer </span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Production Tools Card */}
                            <Card className='card'>
                                <CardHeader>
                                    <CardTitle className='text-white'>
                                        Production Tools
                                    </CardTitle>
                                    <CardDescription className='text-gray-400'>
                                        Professional video review features
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='text-gray-300'>
                                    <ul className='space-y-3'>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Production insights by file,
                                                day, shoot (A-Roll)
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <div className='w-5 h-5 flex items-center justify-center flex-shrink-0'>
                                                <Square className='h-4 w-4' />
                                            </div>
                                            <span>
                                                Production insights by file,
                                                day, shoot (B-Roll)
                                            </span>
                                        </li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
}
