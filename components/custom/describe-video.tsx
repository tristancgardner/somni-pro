import { useState, useEffect, useRef } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { describeImage } from "@/app/api/llama";
import ReactMarkdown from "react-markdown";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Upload } from "lucide-react";
import { Video } from "lucide-react";
import Image from "next/image";

interface MarkdownProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: ReactNode;
    [key: string]: any;
}

export default function DescribeVideo() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [scanPosition, setScanPosition] = useState({ x: 0, y: 0 });
    const animationRef = useRef<number>();
    const [videoUrl, setVideoUrl] = useState<string>("");
    const [frameUrls, setFrameUrls] = useState<string[]>([]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];

            // Check file size (1GB = 1024 * 1024 * 1024 bytes)
            const maxSize = 1024 * 1024 * 1024; // 1GB in bytes
            if (file.size > maxSize) {
                setError("File size exceeds 1GB limit");
                return;
            }

            setSelectedFile(file);
            setError("");

            // Create preview URL for the video
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
        }
    };

    // Clean up object URL on component unmount
    useEffect(() => {
        return () => {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [videoUrl]);

    const extractFrames = async (video: HTMLVideoElement): Promise<string[]> => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const frames: string[] = [];

        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Calculate time intervals for 10 frames with padding
        const duration = video.duration;
        const padding = 2; // 2 seconds padding at start and end
        
        // Check if video is long enough for padding
        if (duration <= 4) {
            // If video is too short, just divide it evenly without padding
            const interval = duration / 9;
            for (let i = 0; i < 10; i++) {
                video.currentTime = i * interval;
                await new Promise((resolve) => {
                    video.onseeked = resolve;
                });
                context?.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push(canvas.toDataURL("image/jpeg"));
            }
        } else {
            // Calculate intervals with padding
            const usableDuration = duration - (padding * 2);
            const interval = usableDuration / 9; // 9 intervals for 10 frames

            // Extract frames at calculated intervals
            for (let i = 0; i < 10; i++) {
                // Start at padding, end before padding
                const currentTime = padding + (i * interval);
                video.currentTime = currentTime;
                
                await new Promise((resolve) => {
                    video.onseeked = resolve;
                });

                context?.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push(canvas.toDataURL("image/jpeg"));
            }
        }

        return frames;
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError("Please select a video first");
            return;
        }

        try {
            setIsLoading(true);
            setError("");
            setFrameUrls([]); // Clear previous frames

            // Create a video element to extract frames
            const video = document.createElement("video");
            video.src = videoUrl;

            // Wait for video metadata to load
            await new Promise((resolve) => {
                video.onloadedmetadata = resolve;
            });

            // Extract frames
            const frames = await extractFrames(video);
            setFrameUrls(frames);

            // Convert first frame to base64 for API call
            const base64Image = frames[0].split(",")[1];

            /// Send to API
            // const result = await describeImage(base64Image);
            // setDescription(result as string);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const animateScan = () => {
        const boxHeight = 64; // Height of scanning box
        const containerWidth = 300;
        const containerHeight = 300;
        const numRows = Math.floor(containerHeight / boxHeight);

        setScanPosition((prev) => {
            // Move right by 10px each frame
            let newX = prev.x + 10;
            let newY = prev.y;

            // When reaching the right edge, move to next row
            if (newX >= containerWidth) {
                newX = 0;
                newY = prev.y + boxHeight;

                // If we've scanned all rows, reset to top
                if (newY >= containerHeight - boxHeight) {
                    newY = 0;
                }
            }

            return { x: newX, y: newY };
        });

        animationRef.current = requestAnimationFrame(animateScan);
    };

    useEffect(() => {
        if (isLoading) {
            animationRef.current = requestAnimationFrame(animateScan);
        }
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isLoading]);

    return (
        <Card className='card mb-4'>
            <CardHeader>
                <CardTitle>Describe Video</CardTitle>
                <CardDescription>
                    Upload a video to get a detailed description of the scene
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className='grid grid-cols-3 gap-4'>
                    {/* Video upload section - takes up 2/3 of space */}
                    <div className='col-span-2'>
                        {!videoUrl ? (
                            <div className='flex items-center justify-center w-full'>
                                <label
                                    htmlFor='video-upload'
                                    className='flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-900 border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200'
                                >
                                    <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                                        <Video className='w-8 h-8 mb-4 text-gray-400' />
                                        <p className='mb-2 text-sm text-gray-400'>
                                            <span className='font-semibold'>
                                                Click to upload
                                            </span>{" "}
                                            or drag and drop a video file
                                        </p>
                                        <p className='text-xs text-gray-400'>
                                            (Max Upload Size: 1GB)
                                        </p>
                                    </div>
                                    <Input
                                        id='video-upload'
                                        type='file'
                                        accept='video/*'
                                        onChange={handleFileChange}
                                        disabled={isLoading}
                                        className='hidden'
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className='relative w-full flex justify-center'>
                                <div className='relative w-[300px] h-[300px] rounded-lg overflow-hidden bg-gray-900'>
                                    <video
                                        src={videoUrl}
                                        controls
                                        className='w-full h-full object-contain rounded-lg'
                                    />
                                    {isLoading && (
                                        <>
                                            <div
                                                className='absolute w-16 h-16 border-2 border-yellow-400/50 bg-yellow-400/20 rounded-lg transition-transform duration-75'
                                                style={{
                                                    left: `${scanPosition.x}px`,
                                                    top: `${scanPosition.y}px`,
                                                    transform:
                                                        "translate(-50%, 0)",
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent animate-pulse'></div>
                                            </div>
                                        </>
                                    )}

                                    <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg'>
                                        <label
                                            htmlFor='video-upload'
                                            className='px-4 py-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors'
                                        >
                                            Change Video
                                        </label>
                                        <Input
                                            id='video-upload'
                                            type='file'
                                            accept='video/*'
                                            onChange={handleFileChange}
                                            disabled={isLoading}
                                            className='hidden'
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Button section - takes up 1/3 of space */}
                    <div className='flex flex-col justify-center'>
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedFile || isLoading}
                            className='w-full h-16 text-lg transition-colors'
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className='mr-2 h-6 w-6 animate-spin' />
                                    Analyzing...
                                </>
                            ) : (
                                "Get Description"
                            )}
                        </Button>

                        {error && (
                            <div className='text-red-500 text-sm mt-2 p-2 rounded-lg bg-red-950/50'>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description section - full width below */}
                {description && (
                    <div className='mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700'>
                        <ReactMarkdown
                            components={{
                                p: ({ node, ...props }: MarkdownProps) => (
                                    <p
                                        className='mb-4 text-gray-200'
                                        {...props}
                                    />
                                ),
                            }}
                        >
                            {description}
                        </ReactMarkdown>
                    </div>
                )}

                {frameUrls.length > 0 && (
                    <div className='mt-4'>
                        <h3 className='text-lg font-semibold mb-2'>
                            Extracted Frames
                        </h3>
                        <div className='overflow-x-auto'>
                            <div className='flex gap-2 pb-2'>
                                {frameUrls.map((frame, index) => (
                                    <div
                                        key={index}
                                        className='flex-shrink-0 w-[150px] h-[150px] relative rounded-lg overflow-hidden border border-gray-700'
                                    >
                                        <Image
                                            src={frame}
                                            alt={`Frame ${index + 1}`}
                                            fill
                                            className='object-cover'
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
