import { useState, useEffect, useRef } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { describeImage } from "@/app/api/llama";
import ReactMarkdown from "react-markdown";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Upload } from "lucide-react";
import Image from 'next/image';

interface MarkdownProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: ReactNode;
    [key: string]: any;
}

export default function DescribeImage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [description, setDescription] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [scanPosition, setScanPosition] = useState({ x: 0, y: 0 });
    const animationRef = useRef<number>();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setSelectedFile(file);
            setError("");
            
            // Create preview URL for the image
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    // Clean up object URL on component unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError("Please select an image first");
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            // Convert image to base64
            const base64Image = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    // Remove the data URI prefix
                    resolve(base64String.split(",")[1]);
                };
                reader.readAsDataURL(selectedFile);
            });

            // Get description from API
            const result = await describeImage(base64Image);
            setDescription(result as string);
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

        setScanPosition(prev => {
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
                <CardTitle>Describe Image</CardTitle>
                <CardDescription>
                    Upload an image to get a detailed description of the scene
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className='grid grid-cols-3 gap-4'>
                    {/* Image upload section - takes up 2/3 of space */}
                    <div className='col-span-2'>
                        {!previewUrl ? (
                            <div className='flex items-center justify-center w-full'>
                                <label
                                    htmlFor='image-upload'
                                    className='flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-900 border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200'
                                >
                                    <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                                        <Upload className='w-8 h-8 mb-4 text-gray-400' />
                                        <p className='mb-2 text-sm text-gray-400'>
                                            <span className='font-semibold'>
                                                Click to upload
                                            </span>{' '}
                                            or drag and drop
                                        </p>
                                        <p className='text-xs text-gray-400'>
                                            PNG, JPG, or WEBP (MAX. 10MB)
                                        </p>
                                    </div>
                                    <Input
                                        id='image-upload'
                                        type='file'
                                        accept='image/*'
                                        onChange={handleFileChange}
                                        disabled={isLoading}
                                        className='hidden'
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className='relative w-full flex justify-center'>
                                <div className='relative w-[300px] h-[300px] rounded-lg overflow-hidden bg-gray-900'>
                                    <Image
                                        src={previewUrl}
                                        alt="Preview"
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        className='rounded-lg'
                                    />
                                    {isLoading && (
                                        <>
                                            <div 
                                                className='absolute w-16 h-16 border-2 border-yellow-400/50 bg-yellow-400/20 rounded-lg transition-transform duration-75'
                                                style={{
                                                    left: `${scanPosition.x}px`,
                                                    top: `${scanPosition.y}px`,
                                                    transform: 'translate(-50%, 0)',
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                <div className='absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent animate-pulse'></div>
                                            </div>
                                        </>
                                    )}
                                    
                                    <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg'>
                                        <label
                                            htmlFor='image-upload'
                                            className='px-4 py-2 bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 transition-colors'
                                        >
                                            Change Image
                                        </label>
                                        <Input
                                            id='image-upload'
                                            type='file'
                                            accept='image/*'
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
                                    <p className='mb-4 text-gray-200' {...props} />
                                ),
                            }}
                        >
                            {description}
                        </ReactMarkdown>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
