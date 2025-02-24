"use client";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default function WebSocketPage() {
    const [isClient, setIsClient] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [status, setStatus] = useState<string>("");
    const [isProcessStarted, setIsProcessStarted] = useState<boolean>(false);

    // Add useEffect to handle client-side mounting
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient) return; // Don't run WebSocket logic until client-side
        
        console.log("Effect triggered, isProcessStarted:", isProcessStarted);
        if (isProcessStarted) {
            console.log("Attempting to connect to WebSocket");
            // Connect to the WebSocket server
            socketRef.current = new WebSocket("ws://localhost:62397/ws"); // Make sure this matches your FastAPI server address and port

            socketRef.current.onopen = () => {
                console.log("WebSocket connection opened");
                setStatus("Connected to WebSocket");
            };

            socketRef.current.onmessage = (event) => {
                console.log("Received message:", event.data);
                const message = event.data;
                if (message.startsWith("Progress:")) {
                    const progressValue = parseInt(message.split(":")[1]);
                    setProgress(progressValue);
                } else if (message === "Process completed!") {
                    setStatus("Process completed!");
                    setIsProcessStarted(false);
                }
            };

            socketRef.current.onclose = () => {
                console.log("WebSocket connection closed");
                setStatus("WebSocket connection closed");
                setIsProcessStarted(false);
            };

            socketRef.current.onerror = (error) => {
                console.error("WebSocket error:", error);
                setStatus("WebSocket error occurred");
                setIsProcessStarted(false);
            };
        }

        // Clean up the WebSocket connection when the component unmounts or when isProcessStarted becomes false
        return () => {
            if (socketRef.current) {
                console.log("Closing WebSocket connection");
                socketRef.current.close();
            }
        };
    }, [isProcessStarted, isClient]);

    const handleStartProcess = () => {
        console.log("Start Process button clicked");
        setIsProcessStarted(true);
        setProgress(0);
        setStatus("Starting process...");
    };

    // Modify the return statement to handle server-side rendering
    if (!isClient) {
        return <div className="p-4">Loading...</div>;
    }

    return (
        <BackgroundWrapper imagePath="/images/electric_timeline.png">
            <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
                <div className='w-full max-w-7xl mx-auto relative'>
                    <PageHeader />
                    <div className='p-4'>
                        <h1 className='text-2xl font-bold mb-4'>WebSocket Progress</h1>
                        {!isProcessStarted ? (
                            <Button onClick={handleStartProcess}>Start Process</Button>
                        ) : (
                            <div className='mb-4'>
                                <div className='w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700'>
                                    <div
                                        className='bg-blue-600 h-2.5 rounded-full'
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className='mt-2'>Progress: {progress}%</p>
                            </div>
                        )}
                        <p>Status: {status}</p>
                    </div>
                </div>
            </main>
        </BackgroundWrapper>
    );
} 