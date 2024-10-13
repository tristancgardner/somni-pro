"use client";

import React, { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX } from "lucide-react";
import { ChartOptions } from "chart.js";
import { Chart } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { ScriptableContext } from "chart.js";
import { parseRTTM, RTTMSegment } from "@/utils/rttmParser";

Chart.register(annotationPlugin);

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    annotationPlugin
);

export default function AudioWaveform() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(600); // Total duration in seconds
    const [volume, setVolume] = useState(1);
    const [rttmData, setRttmData] = useState<RTTMSegment[]>([]);
    const [speakerColors, setSpeakerColors] = useState<Record<string, string>>(
        {}
    );
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio("/V40914AB1_1of2_pp.wav");
        audioRef.current = audio;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => {
            console.log("Audio loaded, duration:", audio.duration);
            setDuration(audio.duration);
        };
        const handleError = (e: ErrorEvent) => {
            console.error("Error loading audio:", e);
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("error", handleError);

        // Load audio data for waveform
        fetch("/V40914AB1_1of2_pp.wav")
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) =>
                new AudioContext().decodeAudioData(arrayBuffer)
            )
            .then((audioBuffer) => {
                const waveform = generateWaveformData(audioBuffer, 600);
                setWaveformData(waveform);
            })
            .catch((error) =>
                console.error("Error loading audio data:", error)
            );

        fetch("/api/rttm")
            .then((response) => response.json())
            .then((data) => {
                const parsedRttm = parseRTTM(data.content);
                setRttmData(parsedRttm);
                setSpeakerColors(getSpeakerColors(parsedRttm));
            });

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("error", handleError);
            audio.pause();
        };
    }, []);

    const getSpeakerColors = (
        rttmData: RTTMSegment[]
    ): Record<string, string> => {
        const speakers = Array.from(
            new Set(rttmData.map((segment) => segment.speaker))
        );
        const colors = [
            "#FF6B6B",
            "#4ECDC4",
            "#45B7D1",
            "#FFA07A",
            "#98D8C8",
            "#F06292",
            "#AED581",
            "#7986CB",
            "#FFD54F",
            "#4DB6AC",
            "#9575CD",
            "#F06292",
        ];
        return Object.fromEntries(
            speakers.map((speaker, index) => [
                speaker,
                colors[index % colors.length],
            ])
        );
    };

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                console.log("Audio paused");
            } else {
                audioRef.current
                    .play()
                    .then(() => console.log("Audio playing successfully"))
                    .catch((e) => {
                        console.error("Error playing audio:", e);
                        console.error(
                            "Audio error code:",
                            audioRef.current?.error?.code
                        );
                        console.error(
                            "Audio error message:",
                            audioRef.current?.error?.message
                        );
                    });
                console.log("Attempting to play audio");
            }
            setIsPlaying(!isPlaying);
        } else {
            console.error("Audio element not initialized");
        }
    };

    const handleSliderChange = (newValue: number[]) => {
        const newTime = newValue[0];
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !audioRef.current.muted;
            setVolume(audioRef.current.muted ? 0 : 1);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const chartData = {
        labels: Array.from(
            { length: waveformData.length },
            (_, i) => i * (duration / waveformData.length)
        ),
        datasets: [
            {
                data: waveformData,
                borderColor: (context: ScriptableContext<"line">) => {
                    const index = context.dataIndex;
                    const time = index * (duration / waveformData.length);
                    const segment = rttmData.find(
                        (seg) =>
                            time >= seg.start && time < seg.start + seg.duration
                    );
                    return segment ? speakerColors[segment.speaker] : "gray";
                },
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
            },
        ],
    };

    const chartOptions: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: "linear" as const,
                position: "bottom" as const,
                min: 0,
                max: duration,
                ticks: {
                    callback: (value: number | string) =>
                        formatTime(Number(value)),
                },
            },
            y: {
                min: -1,
                max: 1,
                ticks: {
                    display: false,
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: false,
            },
            annotation: {
                annotations: {
                    line1: {
                        type: "line",
                        xMin: currentTime,
                        xMax: currentTime,
                        borderColor: "red",
                        borderWidth: 2,
                    },
                },
            },
        },
        animation: {
            duration: 0,
        },
    };

    const generateWaveformData = (
        audioBuffer: AudioBuffer,
        samples: number
    ) => {
        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / samples);
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i;
            let blockSum = 0;
            for (let j = 0; j < blockSize; j++) {
                blockSum += Math.abs(channelData[blockStart + j]);
            }
            filteredData.push(blockSum / blockSize);
        }
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        return filteredData.map((n) => n * multiplier);
    };

    return (
        <Card className='w-full max-w-4xl'>
            <CardHeader>
                <CardTitle>Audio Waveform with Speaker Labels</CardTitle>
            </CardHeader>
            <CardContent>
                <div className='relative h-64'>
                    <Line data={chartData} options={chartOptions} />
                    {/*Removed old speaker label overlays*/}
                </div>
                <div className='mt-4 flex items-center space-x-4'>
                    <Button
                        onClick={togglePlayPause}
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? "Pause" : "Play"}
                    </Button>
                    <span className='text-sm'>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <Slider
                        value={[currentTime]}
                        min={0}
                        max={duration}
                        step={0.1}
                        onValueChange={handleSliderChange}
                        className='flex-grow'
                    />
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={toggleMute}
                        aria-label={volume === 0 ? "Unmute" : "Mute"}
                    >
                        {volume === 0 ? (
                            <VolumeX className='h-4 w-4' />
                        ) : (
                            <Volume2 className='h-4 w-4' />
                        )}
                    </Button>
                </div>
                <div className='mt-4 flex flex-wrap justify-center gap-4'>
                    {Object.entries(speakerColors).map(([speaker, color]) => (
                        <div key={speaker} className='flex items-center'>
                            <div
                                className='w-4 h-4 mr-2 rounded-full'
                                style={{ backgroundColor: color }}
                            ></div>
                            <span>{speaker}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
