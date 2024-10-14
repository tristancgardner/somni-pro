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
import { PlusIcon, MinusIcon } from "lucide-react";

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
    const chartRef = useRef<ChartJS<
        "line",
        { x: number; y: number }[],
        number
    > | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [groundTruthRTTM, setGroundTruthRTTM] = useState<File | null>(null);
    const [predictionRTTM, setPredictionRTTM] = useState<File | null>(null);
    const [groundTruthRTTMData, setGroundTruthRTTMData] = useState<
        RTTMSegment[]
    >([]);
    const [predictionRTTMData, setPredictionRTTMData] = useState<RTTMSegment[]>(
        []
    );
    const [isAudioUploaded, setIsAudioUploaded] = useState(false);
    const [isRTTMUploaded, setIsRTTMUploaded] = useState(false);
    const [verticalScale, setVerticalScale] = useState(1);

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
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text(); // Get the raw text first
            })
            .then((text) => {
                try {
                    return JSON.parse(text); // Try to parse it as JSON
                } catch (e) {
                    console.error("Failed to parse JSON:", text);
                    throw new Error("Invalid JSON response");
                }
            })
            .then((data) => {
                const parsedRttm = parseRTTM(data.content);
                setRttmData(parsedRttm);
                const colors = getSpeakerColors(parsedRttm);
                setSpeakerColors(colors);
                console.log("RTTM Data:", parsedRttm);
                console.log("Speaker Colors:", colors);
            })
            .catch((error) => {
                console.error("Error fetching or parsing RTTM data:", error);
                // Handle the error appropriately in your UI
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
                audioRef.current.play()
                    .then(() => console.log("Audio playing successfully"))
                    .catch((e) => {
                        console.error("Error playing audio:", e);
                        console.error("Audio error code:", audioRef.current?.error?.code);
                        console.error("Audio error message:", audioRef.current?.error?.message);
                    });
                console.log("Attempting to play audio");
            }
            setIsPlaying(!isPlaying);

            // Update chart options to maintain vertical scale
            if (chartRef.current) {
                const chart = chartRef.current;
                if (chart.options && chart.options.scales && chart.options.scales.y) {
                    chart.options.scales.y.min = -1 / verticalScale;
                    chart.options.scales.y.max = 1 / verticalScale;
                    chart.update();
                }
            }
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
                    { x: i * (duration / waveformData.length), y: v },
                ]),
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                tension: 0,
                segment: {
                    borderColor: (ctx: any) =>
                        isRTTMUploaded
                            ? colorMap[Math.floor(ctx.p0DataIndex / 2)] ||
                              "rgba(200, 200, 200, 0.5)"
                            : "rgba(200, 200, 200, 0.5)",
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
                min: -1 / verticalScale,
                max: 1 / verticalScale,
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
        return filteredData.map((v) => v / maxAmplitude);
    };

    const ZoomControls = ({
        min,
        max,
        value,
        onChange,
        currentTime,
    }: {
        min: number;
        max: number;
        value: [number, number];
        onChange: (value: [number, number]) => void;
        currentTime: number;
    }) => {
        const [inPoint, setInPoint] = useState(formatTime(value[0]));
        const [outPoint, setOutPoint] = useState(formatTime(value[1]));

        useEffect(() => {
            setInPoint(formatTime(value[0]));
            setOutPoint(formatTime(value[1]));
        }, [value]);

        const parseTime = (timeString: string): number => {
            const [minutes, seconds] = timeString.split(":").map(Number);
            return minutes * 60 + seconds;
        };

        const handleInPointChange = (
            e: React.ChangeEvent<HTMLInputElement>
        ) => {
            setInPoint(e.target.value);
            const newInPoint = parseTime(e.target.value);
            if (
                !isNaN(newInPoint) &&
                newInPoint >= min &&
                newInPoint < value[1]
            ) {
                onChange([newInPoint, value[1]]);
            }
        };

        const handleOutPointChange = (
            e: React.ChangeEvent<HTMLInputElement>
        ) => {
            setOutPoint(e.target.value);
            const newOutPoint = parseTime(e.target.value);
            if (
                !isNaN(newOutPoint) &&
                newOutPoint > value[0] &&
                newOutPoint <= max
            ) {
                onChange([value[0], newOutPoint]);
            }
        };

        const resetZoom = () => {
            onChange([min, max]);
            setInPoint(formatTime(min));
            setOutPoint(formatTime(max));
        };

        const zoomIn = () => {
            const currentDuration = value[1] - value[0];
            const newDuration = Math.max(currentDuration * 0.5, 5); // Zoom in by 50%, with a minimum duration of 5 seconds
            const center = currentTime;
            const newStart = Math.max(center - newDuration / 2, min);
            const newEnd = Math.min(newStart + newDuration, max);
            onChange([newStart, newEnd]);
        };

        const zoomOut = () => {
            const currentDuration = value[1] - value[0];
            const newDuration = Math.min(currentDuration * 2, max - min); // Zoom out by 100%, but not beyond the full duration
            const center = currentTime;
            const newStart = Math.max(center - newDuration / 2, min);
            const newEnd = Math.min(newStart + newDuration, max);
            onChange([newStart, newEnd]);
        };

        return (
            <div className='mt-4 space-y-2'>
                <div className='flex items-center space-x-4'>
                    <div className='flex items-center space-x-2'>
                        <span className='w-8'>In:</span>
                        <Input
                            type='text'
                            value={inPoint}
                            onChange={handleInPointChange}
                            placeholder='MM:SS'
                            className='w-20'
                        />
                    </div>
                    <div className='flex items-center space-x-2'>
                        <span className='w-8'>Out:</span>
                        <Input
                            type='text'
                            value={outPoint}
                            onChange={handleOutPointChange}
                            placeholder='MM:SS'
                            className='w-20'
                        />
                    </div>
                </div>
                <div className='flex items-center space-x-2'>
                    <Button onClick={zoomIn} variant='outline' size='sm'>
                        <PlusIcon className='h-4 w-4' />
                    </Button>
                    <Button onClick={zoomOut} variant='outline' size='sm'>
                        <MinusIcon className='h-4 w-4' />
                    </Button>
                    <Button onClick={resetZoom} variant='outline' size='sm'>
                        Reset Zoom
                    </Button>
                </div>
            </div>
        );
    };

    // Add this memoized function to efficiently get colors for each data point
    const colorMap = useMemo(() => {
        if (
            waveformData.length === 0 ||
            rttmData.length === 0 ||
            !isRTTMUploaded
        )
            return [];

        const colors = new Array(waveformData.length).fill(
            "rgba(200, 200, 200, 0.5)"
        );
        const timeStep = duration / waveformData.length;

        rttmData.forEach((segment) => {
            const startIndex = Math.floor(segment.start / timeStep);
            const endIndex = Math.min(
                Math.floor((segment.start + segment.duration) / timeStep),
                waveformData.length
            );
            for (let i = startIndex; i < endIndex; i++) {
                colors[i] = speakerColors[segment.speaker];
            }
        });

        return colors;
    }, [waveformData, rttmData, duration, speakerColors, isRTTMUploaded]);

    useEffect(() => {
        console.log("Color map updated:", colorMap);
    }, [colorMap]);

    useEffect(() => {
        console.log("Chart data updated:", chartData);
    }, [chartData]);

    const updateZoomRange = (currentTime: number) => {
        const zoomDuration = zoomRange[1] - zoomRange[0];
        if (currentTime < zoomRange[0] || currentTime > zoomRange[1]) {
            const newStart = Math.max(currentTime - zoomDuration / 2, 0);
            const newEnd = Math.min(newStart + zoomDuration, duration);
            setZoomRange([newStart, newEnd]);
        }
    };

    // Add this useEffect hook to update the chart when zoomRange changes
    useEffect(() => {
        if (chartRef.current) {
            const chart = chartRef.current;
            if (chart.options && chart.options.scales) {
                if (chart.options.scales.x) {
                    chart.options.scales.x.min = zoomRange[0];
                    chart.options.scales.x.max = zoomRange[1];
                }
                if (chart.options.scales.y) {
                    chart.options.scales.y.min = -1 / verticalScale;
                    chart.options.scales.y.max = 1 / verticalScale;
                }
                chart.update();
            }
        }
    }, [zoomRange, verticalScale]);

    useEffect(() => {
        const handleTimeUpdate = () => {
            if (audioRef.current) {
                const newCurrentTime = audioRef.current.currentTime;
                setCurrentTime(newCurrentTime);
                updateZoomRange(newCurrentTime);
            }
        };

        if (audioRef.current) {
            audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener(
                    "timeupdate",
                    handleTimeUpdate
                );
            }
        };
    }, [zoomRange, duration, verticalScale]); // Add verticalScale to the dependency array

    const handleAudioFileUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            setAudioFile(file);
            const audio = new Audio(URL.createObjectURL(file));
            audioRef.current = audio;

            audio.addEventListener("loadedmetadata", () => {
                console.log("Audio loaded, duration:", audio.duration);
                setDuration(audio.duration);
                setZoomRange([0, audio.duration]);
                setIsAudioUploaded(true); // Set this to true when audio is loaded
            });

            const reader = new FileReader();
            reader.onload = async (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const audioContext = new AudioContext();
                const audioBuffer = await audioContext.decodeAudioData(
                    arrayBuffer
                );
                const waveform = generateWaveformData(audioBuffer, 10000);
                setWaveformData(waveform);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleGroundTruthRTTMUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            setGroundTruthRTTM(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const parsedRttm = parseRTTM(content);
                setGroundTruthRTTMData(parsedRttm);
                const colors = getSpeakerColors(parsedRttm);
                setSpeakerColors(colors);
                setRttmData(parsedRttm); // Set the rttmData to be used for coloring
                setIsRTTMUploaded(true);
            };
            reader.readAsText(file);
        }
    };

    const handlePredictionRTTMUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            setPredictionRTTM(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const parsedRttm = parseRTTM(content);
                setPredictionRTTMData(parsedRttm);
                const colors = getSpeakerColors(parsedRttm);
                setSpeakerColors(colors);
                setRttmData(parsedRttm); // Set the rttmData to be used for coloring
                setIsRTTMUploaded(true);
            };
            reader.readAsText(file);
        }
    };

    const WaveformSizeControl = ({
        value,
        onChange,
    }: {
        value: number;
        onChange: (value: number) => void;
    }) => {
        return (
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Waveform Size:</span>
                <input
                    type="range"
                    min="0.2"
                    max="5"
                    step="0.1"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-32"
                />
                <span className="text-sm">{value.toFixed(1)}x</span>
            </div>
        );
    };

    useEffect(() => {
        if (chartRef.current) {
            const chart = chartRef.current;
            if (chart.options && chart.options.scales && chart.options.scales.y) {
                chart.options.scales.y.min = -1 / verticalScale;
                chart.options.scales.y.max = 1 / verticalScale;
                chart.update();
            }
        }
    }, [verticalScale]);

    return (
        <Card className='w-full max-w-4xl'>
            <CardHeader>
                <CardTitle>Audio Waveform with Speaker Labels</CardTitle>
            </CardHeader>
            <CardContent>
                <div className='flex flex-wrap gap-4 mb-4'>
                    <div className='flex-1 min-w-[200px]'>
                        <div className='text-sm font-medium mb-1'>
                            Upload Audio File (WAV)
                        </div>
                        <Input
                            id='audio-upload'
                            type='file'
                            accept='.wav'
                            onChange={handleAudioFileUpload}
                        />
                    </div>
                    <div className='flex-1 min-w-[200px]'>
                        <div className='text-sm font-medium mb-1'>
                            Upload Ground Truth RTTM (Optional)
                        </div>
                        <Input
                            id='ground-truth-upload'
                            type='file'
                            accept='.rttm'
                            onChange={handleGroundTruthRTTMUpload}
                        />
                    </div>
                    <div className='flex-1 min-w-[200px]'>
                        <div className='text-sm font-medium mb-1'>
                            Upload Prediction RTTM
                        </div>
                        <Input
                            id='prediction-upload'
                            type='file'
                            accept='.rttm'
                            onChange={handlePredictionRTTMUpload}
                        />
                    </div>
                </div>

                {isAudioUploaded && (
                    <>
                        <div className='flex justify-end mb-2'>
                            <WaveformSizeControl
                                value={verticalScale}
                                onChange={setVerticalScale}
                            />
                        </div>
                        <div className='relative h-64'>
                            <Line
                                data={chartData}
                                options={chartOptions}
                                ref={chartRef}
                            />
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
                                    aria-label={
                                        volume === 0 ? "Unmute" : "Mute"
                                    }
                                >
                                    {volume === 0 ? (
                                        <VolumeX className='h-4 w-4' />
                                    ) : (
                                        <Volume2 className='h-4 w-4' />
                                    )}
                                </Button>
                            </div>
                            <div className='space-y-1'>
                                <label
                                    htmlFor='full-file-slider'
                                    className='text-sm font-medium'
                                >
                                    Full File Playback (Always shows entire
                                    file)
                                </label>
                                <div className='flex items-center space-x-2'>
                                    <span className='text-sm'>
                                        {formatTime(0)}
                                    </span>
                                    <Slider
                                        id='full-file-slider'
                                        value={[currentTime]}
                                        min={0}
                                        max={duration}
                                        step={0.1}
                                        onValueChange={handleSliderChange}
                                        className='flex-grow'
                                    />
                                    <span className='text-sm'>
                                        {formatTime(duration)}
                                    </span>
                                </div>
                                <div className='text-center'>
                                    <span className='text-sm font-medium'>
                                        {formatTime(currentTime)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {isAudioUploaded && isRTTMUploaded && (
                            <div className='mt-4 flex flex-wrap justify-center gap-4'>
                                {Object.entries(speakerColors).map(
                                    ([speaker, color]) => (
                                        <div
                                            key={speaker}
                                            className='flex items-center'
                                        >
                                            <div
                                                className='w-4 h-4 mr-2 rounded-full'
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            ></div>
                                            <span>{speaker}</span>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                        <ZoomControls
                            min={0}
                            max={duration}
                            value={zoomRange}
                            onChange={(value) => setZoomRange(value)}
                            currentTime={currentTime}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}