"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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
import { Range } from "../../components/ui/range";
import { Input } from "@/components/ui";

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
    const [zoomRange, setZoomRange] = useState<[number, number]>([0, duration]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const chartRef = useRef<ChartJS<"line", { x: number; y: number; }[], number> | null>(null);

    useEffect(() => {
        const audio = new Audio("/V40914AB1_1of2_pp.wav");
        audioRef.current = audio;

        const handleLoadedMetadata = () => {
            console.log("Audio loaded, duration:", audio.duration);
            setDuration(audio.duration);
            setZoomRange([0, audio.duration]);
        };
        const handleError = (e: ErrorEvent) => {
            console.error("Error loading audio:", e);
        };

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("error", handleError);

        // Load audio data for waveform
        fetch("/V40914AB1_1of2_pp.wav")
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) =>
                new AudioContext().decodeAudioData(arrayBuffer)
            )
            .then((audioBuffer) => {
                const waveform = generateWaveformData(audioBuffer, 10000); // Increased from 2000
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
                const colors = getSpeakerColors(parsedRttm);
                setSpeakerColors(colors);
                console.log("RTTM Data:", parsedRttm);
                console.log("Speaker Colors:", colors);
            });

        return () => {
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
                data: waveformData.flatMap((v, i) => [
                    { x: i * (duration / waveformData.length), y: -v },
                    { x: i * (duration / waveformData.length), y: v }
                ]),
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                tension: 0,
                segment: {
                    borderColor: (ctx: any) => colorMap[Math.floor(ctx.p0DataIndex / 2)] || "rgba(200, 200, 200, 0.5)",
                },
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
                min: zoomRange[0],
                max: zoomRange[1],
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
                grid: {
                    display: false,
                },
                border: {
                    display: false,
                },
            },
        },
        elements: {
            line: {
                borderWidth: 1,
            },
            point: {
                radius: 0,
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
    ): number[] => {
        const channelData = audioBuffer.getChannelData(0);
        const blockSize = Math.floor(channelData.length / samples);
        const filteredData: number[] = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channelData[blockStart + j]);
            }
            filteredData.push(sum / blockSize);
        }
        const maxAmplitude = Math.max(...filteredData);
        return filteredData.map(v => v / maxAmplitude);
    };

    const ZoomControls = ({
        min,
        max,
        value,
        onChange,
    }: {
        min: number;
        max: number;
        value: [number, number];
        onChange: (value: [number, number]) => void;
    }) => {
        const [inPoint, setInPoint] = useState(formatTime(value[0]));
        const [outPoint, setOutPoint] = useState(formatTime(value[1]));

        useEffect(() => {
            setInPoint(formatTime(value[0]));
            setOutPoint(formatTime(value[1]));
        }, [value]);

        const parseTime = (timeString: string): number => {
            const [minutes, seconds] = timeString.split(':').map(Number);
            return minutes * 60 + seconds;
        };

        const handleInPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setInPoint(e.target.value);
            const newInPoint = parseTime(e.target.value);
            if (!isNaN(newInPoint) && newInPoint >= min && newInPoint < value[1]) {
                onChange([newInPoint, value[1]]);
            }
        };

        const handleOutPointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setOutPoint(e.target.value);
            const newOutPoint = parseTime(e.target.value);
            if (!isNaN(newOutPoint) && newOutPoint > value[0] && newOutPoint <= max) {
                onChange([value[0], newOutPoint]);
            }
        };

        const resetZoom = () => {
            onChange([min, max]);
            setInPoint(formatTime(min));
            setOutPoint(formatTime(max));
        };

        return (
            <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <span className="w-8">In:</span>
                        <Input
                            type="text"
                            value={inPoint}
                            onChange={handleInPointChange}
                            placeholder="MM:SS"
                            className="w-20"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="w-8">Out:</span>
                        <Input
                            type="text"
                            value={outPoint}
                            onChange={handleOutPointChange}
                            placeholder="MM:SS"
                            className="w-20"
                        />
                    </div>
                </div>
                <Button onClick={resetZoom} variant="outline" size="sm">
                    Reset Zoom
                </Button>
            </div>
        );
    };

    // Add this memoized function to efficiently get colors for each data point
    const colorMap = useMemo(() => {
        if (waveformData.length === 0 || rttmData.length === 0) return [];
        
        const colors = new Array(waveformData.length).fill("rgba(200, 200, 200, 0.5)");
        const timeStep = duration / waveformData.length;

        rttmData.forEach((segment) => {
            const startIndex = Math.floor(segment.start / timeStep);
            const endIndex = Math.min(Math.floor((segment.start + segment.duration) / timeStep), waveformData.length);
            console.log(`Segment: ${segment.speaker}, Start: ${startIndex}, End: ${endIndex}, Color: ${speakerColors[segment.speaker]}`);
            for (let i = startIndex; i < endIndex; i++) {
                colors[i] = speakerColors[segment.speaker];
            }
        });

        console.log("Color Map (first 100 elements):", colors.slice(0, 100));
        return colors;
    }, [waveformData, rttmData, duration, speakerColors]);

    useEffect(() => {
        console.log("Color map updated:", colorMap);
    }, [colorMap]);

    useEffect(() => {
        console.log("Chart data updated:", chartData);
    }, [chartData]);

    const updateZoomRange = (currentTime: number) => {
        const zoomDuration = zoomRange[1] - zoomRange[0];
        if (currentTime >= zoomRange[1] - zoomDuration * 0.1) {
            const newStart = Math.max(currentTime - zoomDuration * 0.9, 0);
            const newEnd = Math.min(newStart + zoomDuration, duration);
            setZoomRange([newStart, newEnd]);
        }
    };

    // Add this useEffect hook to update the chart when zoomRange changes
    useEffect(() => {
        if (chartRef.current) {
            const chart = chartRef.current;
            if (chart.options && chart.options.scales && chart.options.scales.x) {
                chart.options.scales.x.min = zoomRange[0];
                chart.options.scales.x.max = zoomRange[1];
                chart.update();
            }
        }
    }, [zoomRange]);

    useEffect(() => {
        const handleTimeUpdate = () => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                updateZoomRange(audioRef.current.currentTime);
            }
        };

        if (audioRef.current) {
            audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
            }
        };
    }, [zoomRange, duration]);

    return (
        <Card className='w-full max-w-4xl'>
            <CardHeader>
                <CardTitle>Audio Waveform with Speaker Labels</CardTitle>
            </CardHeader>
            <CardContent>
                <div className='relative h-64'>
                    <Line data={chartData} options={chartOptions} ref={chartRef} />
                </div>
                <div className='mt-4 space-y-2'>
                    <div className='flex items-center space-x-4'>
                        <Button
                            onClick={togglePlayPause}
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? "Pause" : "Play"}
                        </Button>
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
                    <div className='space-y-1'>
                        <label htmlFor="full-file-slider" className="text-sm font-medium">
                            Full File Playback (Always shows entire file)
                        </label>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm">{formatTime(0)}</span>
                            <Slider
                                id="full-file-slider"
                                value={[currentTime]}
                                min={0}
                                max={duration}
                                step={0.1}
                                onValueChange={handleSliderChange}
                                className='flex-grow'
                            />
                            <span className="text-sm">{formatTime(duration)}</span>
                        </div>
                        <div className="text-center">
                            <span className="text-sm font-medium">{formatTime(currentTime)}</span>
                        </div>
                    </div>
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
                <ZoomControls
                    min={0}
                    max={duration}
                    value={zoomRange}
                    onChange={(value) => setZoomRange(value)}
                />
            </CardContent>
        </Card>
    );
}