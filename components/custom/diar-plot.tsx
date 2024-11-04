"use client";

import React, {
    useEffect,
    useRef,
    useState,
    useMemo,
    useCallback,
} from "react";
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
    ChartEvent,
    ActiveElement,
    ChartType,
    Plugin,
    registerables,
    ChartConfiguration,
} from "chart.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX } from "lucide-react";
import annotationPlugin from "chartjs-plugin-annotation";
import {
    parseRTTM,
    RTTMSegment as ImportedRTTMSegment,
} from "@/utils/rttmParser";
import { Input } from "@/components/ui/input"; // Make sure this import is present
import { PlusIcon, MinusIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SkipBack, SkipForward, FastForward } from "lucide-react";
import { Loader2 } from "lucide-react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Check } from "lucide-react"; // Add this import
import { motion } from "framer-motion";

import { testSimpleEndpoint, transcribe_endpoint } from "@/app/api/transcribe";
import { SegmentsBySpeaker } from "@/components/custom/segbyspeaker";
import { SegmentTimeline } from "./segbytime";
import { DraggableSegmentTimeline } from "./dragndrop";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import Summarize from "./summarize";

ChartJS.register(...registerables);

const SPEAKER_COLORS = [
    "#D66B65", // Deep Coral (brightened)
    "#7B5DAE", // Royal Purple (brightened)
    "#3D7B54", // Forest Green (brightened)
    "#C86D33", // Burnt Orange (brightened)
    "#327676", // Deep Teal (brightened)
    "#9B3645", // Wine Red (brightened)
    "#6B7B3D", // Dark Olive (brightened)
    "#3D3D7B", // Deep Indigo (brightened)
];

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

// Add this debounce function after the imports
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number = 1000
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Export the Speaker type
export type Speaker = {
    originalLabel: string;
    currentLabel: string;
};

// Change transcriptionResult type name to TranscriptionResult and export it
export type TranscriptionResult = {
    segments: Array<{
        speaker: string;
        start: number;
        end: number;
        text: string;
    }>;
    og_file_name: string;
    file_name: string;
    rttm_lines: string[];
    rttm_merged: string[];
    speaker_colors: Record<string, string>;
    transcript: string;
    speakerLegend: Record<string, Speaker>;
    summary?: string;
    // Add other properties as needed
};

// Update the interface to use the new type
interface AudioWaveformProps {
    transcriptionResult: TranscriptionResult | null;
    setTranscriptionResult: (result: TranscriptionResult) => void;
}

export default function AudioWaveform({
    transcriptionResult,
    setTranscriptionResult
}: AudioWaveformProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(600);
    const [volume, setVolume] = useState(1);
    const [rttmData, setRttmData] = useState<ImportedRTTMSegment[]>([]);
    const [speakerColors, setSpeakerColors] = useState<Record<string, string>>({});
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [zoomRange, setZoomRange] = useState<[number, number]>([0, duration]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const chartRef = useRef<ChartJS<"line", { x: number; y: number }[], number> | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [isAudioUploaded, setIsAudioUploaded] = useState(false);
    const [verticalScale, setVerticalScale] = useState(1);
    const [showPredictionLegend, setShowPredictionLegend] = useState(false);
    const [originalSpeakerColors, setOriginalSpeakerColors] = useState<Record<string, string>>({});
    const [playbackRate, setPlaybackRate] = useState(1);
    const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [fileSize, setFileSize] = useState<number | null>(null);
    const [showSegmentTimeline, setShowSegmentTimeline] = useState(false);
    const [showSegmentsBySpeaker, setShowSegmentsBySpeaker] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const audioWaveformRef = useRef<HTMLDivElement>(null);
    const transcriptionSegmentsRef = useRef<HTMLDivElement>(null);

    const [transcriptionSegments, setTranscriptionSegments] = useState<TranscriptionResult['segments']>([]);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            if (audioWaveformRef.current && transcriptionSegmentsRef.current) {
                transcriptionSegmentsRef.current.style.height = `${audioWaveformRef.current.offsetHeight}px`;
            }
        });

        if (audioWaveformRef.current) {
            resizeObserver.observe(audioWaveformRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    //#region ---------- chart controls/updates
    const getSpeakerColors = (
        rttmData: ImportedRTTMSegment[],
        existingColors?: Record<string, string>
    ): Record<string, string> => {
        const speakers = Array.from(
            new Set(rttmData.map((segment) => segment.speaker))
        );
        return Object.fromEntries(
            speakers.map((speaker, index) => [
                speaker,
                existingColors?.[speaker] ||
                    SPEAKER_COLORS[index % SPEAKER_COLORS.length],
            ])
        );
    };

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                console.log("Audio paused");
            } else {
                audioRef.current.playbackRate = playbackRate; // Set the current playback rate
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

            // Update chart options to maintain vertical scale
            if (chartRef.current) {
                const chart = chartRef.current;
                if (
                    chart.options &&
                    chart.options.scales &&
                    chart.options.scales.y
                ) {
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
        updatePlayhead(newTime);
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

    // Update the colorMap useMemo
    const colorMap = useMemo(() => {
        if (waveformData.length === 0 || !transcriptionResult?.rttm_merged) {
            return [];
        }

        const colors = new Array(waveformData.length).fill("rgba(200, 200, 200, 0.5)");
        const timeStep = duration / waveformData.length;

        // Parse RTTM merged lines to get speaker segments
        transcriptionResult.rttm_merged.forEach((line: string) => {
            const parts = line.split(' ');
            // RTTM format: SPEAKER file 1 start duration <NA> <NA> speaker <NA> <NA>
            if (parts.length >= 8) {
                const start = parseFloat(parts[3]);
                const duration = parseFloat(parts[4]);
                const speaker = parts[7];
                
                const startIndex = Math.floor(start / timeStep);
                const endIndex = Math.min(
                    Math.floor((start + duration) / timeStep),
                    waveformData.length
                );

                for (let i = startIndex; i < endIndex; i++) {
                    colors[i] = speakerColors[speaker] || "rgba(200, 200, 200, 0.5)";
                }
            }
        });

        return colors;
    }, [waveformData, transcriptionResult?.rttm_merged, duration, speakerColors]);

    // Update the chartData to use the new colorMap
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
                pointHoverRadius: 0,
                fill: false,
                tension: 0,
                segment: {
                    borderColor: (ctx: any) =>
                        colorMap[Math.floor(ctx.p0DataIndex / 2)] ||
                        "rgba(200, 200, 200, 0.5)",
                },
            },
        ],
    };

    const chartOptions: ChartConfiguration<"line">["options"] = {
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
                enabled: true,
                mode: "nearest",
                intersect: false,
                position: "nearest",
                yAlign: "bottom",
                callbacks: {
                    label: function (context) {
                        const timeValue = context.parsed.x;
                        
                        // Find the corresponding speaker from rttm_merged
                        const segment = transcriptionResult?.rttm_merged.find((line: string) => {
                            const parts = line.split(' ');
                            if (parts.length >= 8) {
                                const start = parseFloat(parts[3]);
                                const duration = parseFloat(parts[4]);
                                return timeValue >= start && timeValue <= (start + duration);
                            }
                            return false;
                        });

                        if (segment) {
                            const parts = segment.split(' ');
                            return parts[7]; // Return speaker label
                        }
                        return "";
                    },
                    title: function () {
                        return "";
                    },
                },
                displayColors: false,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                padding: 8,
                bodyFont: {
                    size: 14,
                },
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
        hover: {
            mode: "nearest",
            intersect: false,
        },
        animation: {
            duration: 0,
        },
        onClick: (
            event: ChartEvent,
            elements: ActiveElement[],
            chart: ChartJS<ChartType>
        ) => {
            if (!chart.canvas) return;
            const rect = chart.canvas.getBoundingClientRect();
            const x = (event.native as MouseEvent)?.clientX ?? 0;
            const canvasX = x - rect.left;
            const xValue = chart.scales.x.getValueForPixel(canvasX);
            if (xValue !== undefined) {
                updatePlayhead(xValue);
            }
        },
        layout: {
            padding: {
                top: 30, // Increase top padding to make room for ground truth bars
            },
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

    // useEffect(() => {
    //     console.log("Color map updated");
    // }, [colorMap]);

    // useEffect(() => {
    //     console.log("Chart data updated");
    // }, [chartData]);

    // First, let's move the updateZoomRange function outside of the useEffect
    const updateZoomRange = useCallback(
        (currentTime: number) => {
            const zoomDuration = zoomRange[1] - zoomRange[0];
            if (currentTime < zoomRange[0] || currentTime > zoomRange[1]) {
                const newStart = Math.max(currentTime - zoomDuration / 2, 0);
                const newEnd = Math.min(newStart + zoomDuration, duration);
                setZoomRange([newStart, newEnd]);
            }
        },
        [zoomRange, duration]
    );

    // Now, update the useEffect that was causing the warning
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
    }, [updateZoomRange]); // Add updateZoomRange to the dependency array

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

    const WaveformSizeControl = ({
        value,
        onChange,
    }: {
        value: number;
        onChange: (value: number) => void;
    }) => {
        return (
            <div className='flex items-center space-x-2'>
                <span className='text-sm font-medium'>Waveform Size:</span>
                <input
                    type='range'
                    min='0.2'
                    max='5'
                    step='0.1'
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className='w-32'
                />
                <span className='text-sm'>{value.toFixed(1)}x</span>
            </div>
        );
    };

    useEffect(() => {
        if (chartRef.current) {
            const chart = chartRef.current;
            if (
                chart.options &&
                chart.options.scales &&
                chart.options.scales.y
            ) {
                chart.options.scales.y.min = -1 / verticalScale;
                chart.options.scales.y.max = 1 / verticalScale;
                chart.update();
            }
        }
    }, [verticalScale]);

    const updatePlayhead = (newTime: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
            updateZoomRange(newTime);
        }
    };

    // Update the updateSpeakerColor function
    const updateSpeakerColor = (speaker: string, color: string) => {
        setSpeakerColors((prevColors) => {
            const newColors = {
                ...prevColors,
                [speaker]: color,
            };
            // Force chart update
            if (chartRef.current) {
                chartRef.current.update();
            }
            return newColors;
        });
    };

    // Update the updateSpeakerLabel function to use props directly
    const updateSpeakerLabel = useCallback(
        (oldLabel: string, newLabel: string) => {
            if (!transcriptionResult) return;

            const updatedResult: TranscriptionResult = {
                ...transcriptionResult,
                segments: transcriptionResult.segments.map((segment: TranscriptionResult['segments'][0]) => 
                    segment.speaker === oldLabel 
                        ? { ...segment, speaker: newLabel }
                        : segment
                ),
                rttm_lines: transcriptionResult.rttm_lines.map((line: string) => 
                    line.includes(` ${oldLabel} `)
                        ? line.replace(` ${oldLabel} `, ` ${newLabel} `)
                        : line
                ),
                rttm_merged: transcriptionResult.rttm_merged.map((line: string) => 
                    line.includes(` ${oldLabel} `)
                        ? line.replace(` ${oldLabel} `, ` ${newLabel} `)
                        : line
                ),
                transcript: transcriptionResult.transcript.replace(
                    new RegExp(`\\b${oldLabel}\\b`, "g"),
                    newLabel
                ),
                speaker_colors: {
                    ...(transcriptionResult.speaker_colors || {}),
                    [newLabel]: transcriptionResult.speaker_colors?.[oldLabel]
                },
                speakerLegend: {
                    ...(transcriptionResult.speakerLegend || {}),
                    [newLabel]: {
                        originalLabel: transcriptionResult.speakerLegend?.[oldLabel]?.originalLabel || oldLabel,
                        currentLabel: newLabel
                    }
                }
            };

            // Remove old speaker color and legend entries
            delete updatedResult.speaker_colors[oldLabel];
            delete updatedResult.speakerLegend[oldLabel];

            setTranscriptionResult(updatedResult);
        },
        [transcriptionResult, setTranscriptionResult]
    );

    // Add this useEffect to update the chart when predictionRTTMData or speakerColors change
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.update();
        }
    }, [rttmData, speakerColors, transcriptionResult?.segments]);

    // Update the RTTMLegend component
    const RTTMLegend = ({
        data,
        title,
        colors,
        editable = false,
        onResetColors,
        onUpdateSpeakerLabel,
        speakerLegend,
    }: {
        data: ImportedRTTMSegment[];
        title: string;
        colors: Record<string, string>;
        editable?: boolean;
        onResetColors?: () => void;
        onUpdateSpeakerLabel: (oldLabel: string, newLabel: string) => void;
        speakerLegend: Record<string, Speaker>;
    }) => {
        const speakers = useMemo(
            () => Array.from(new Set(data.map((segment) => segment.speaker))),
            [data]
        );

        const [localLabels, setLocalLabels] = useState<Record<string, string>>(
            () => {
                return Object.fromEntries(
                    speakers.map((speaker) => [
                        speaker,
                        speakerLegend[speaker]?.currentLabel || speaker,
                    ])
                );
            }
        );

        useEffect(() => {
            setLocalLabels(
                Object.fromEntries(
                    speakers.map((speaker) => [
                        speaker,
                        speakerLegend[speaker]?.currentLabel || speaker,
                    ])
                )
            );
        }, [speakers, speakerLegend]);

        const debouncedUpdateSpeakerLabel = useCallback(
            debounce((oldLabel: string, newLabel: string) => {
                onUpdateSpeakerLabel(oldLabel, newLabel);
            }, 1000),
            [onUpdateSpeakerLabel]
        );

        const handleInputChange = (speaker: string, value: string) => {
            setLocalLabels((prev) => ({ ...prev, [speaker]: value }));
        };

        const handleInputBlur = (speaker: string, value: string) => {
            if (value !== speaker) {
                debouncedUpdateSpeakerLabel(speaker, value);
            }
        };

        const handleKeyDown = (
            e: React.KeyboardEvent<HTMLInputElement>,
            speaker: string,
            value: string
        ) => {
            if (e.key === "Enter" && value !== speaker) {
                debouncedUpdateSpeakerLabel(speaker, value);
            }
        };

        const handleColorChange = (speaker: string, color: string) => {
            updateSpeakerColor(speaker, color);
        };

        return (
            <div className='mt-4'>
                <div className='flex justify-between items-center mb-2'>
                    <h3 className='text-sm font-semibold'>{title}</h3>
                    {editable && onResetColors && (
                        <Button
                            onClick={onResetColors}
                            variant='outline'
                            size='sm'
                        >
                            Reset Colors
                        </Button>
                    )}
                </div>
                <div className='flex flex-wrap justify-center gap-4'>
                    {speakers.map((speaker) => (
                        <div key={speaker} className='flex items-center'>
                            {editable ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant='outline'
                                            className='w-8 h-8 p-0 rounded-full'
                                            style={{
                                                backgroundColor:
                                                    colors[speaker],
                                            }}
                                        />
                                    </PopoverTrigger>
                                    <PopoverContent className='w-64'>
                                        <div className='grid grid-cols-4 gap-2'>
                                            {SPEAKER_COLORS.map((color) => (
                                                <Button
                                                    key={color}
                                                    className='w-8 h-8 p-0 rounded-full relative'
                                                    style={{
                                                        backgroundColor: color,
                                                    }}
                                                    onClick={() =>
                                                        handleColorChange(
                                                            speaker,
                                                            color
                                                        )
                                                    }
                                                >
                                                    {color ===
                                                        colors[speaker] && (
                                                        <Check
                                                            className='absolute inset-0 m-auto text-white'
                                                            size={16}
                                                        />
                                                    )}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <div
                                    className='w-6 h-6 mr-2 rounded-full'
                                    style={{ backgroundColor: colors[speaker] }}
                                />
                            )}
                            {editable ? (
                                <Input
                                    value={localLabels[speaker]}
                                    onChange={(e) =>
                                        handleInputChange(
                                            speaker,
                                            e.target.value
                                        )
                                    }
                                    onBlur={(e) =>
                                        handleInputBlur(speaker, e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                        handleKeyDown(
                                            e,
                                            speaker,
                                            e.currentTarget.value
                                        )
                                    }
                                    className='w-32 text-sm p-2'
                                />
                            ) : (
                                <span className='text-sm'>
                                    {localLabels[speaker]}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const resetColors = () => {
        setSpeakerColors(originalSpeakerColors);
        if (chartRef.current) {
            chartRef.current.update();
        }
    };

    const jumpToBeginning = () => {
        updatePlayhead(0);
    };

    const jumpToEnd = () => {
        updatePlayhead(duration);
    };

    const cyclePlaybackSpeed = () => {
        if (audioRef.current) {
            const newRate =
                playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
            audioRef.current.playbackRate = newRate;
            setPlaybackRate(newRate);
        }
    };

    // Add these functions at the component level
    const zoomIn = () => {
        const currentDuration = zoomRange[1] - zoomRange[0];
        const newDuration = Math.max(currentDuration * 0.5, 5); // Zoom in by 50%, with a minimum duration of 5 seconds
        const center = currentTime;
        const newStart = Math.max(center - newDuration / 2, 0);
        const newEnd = Math.min(newStart + newDuration, duration);
        setZoomRange([newStart, newEnd]);
    };

    const zoomOut = () => {
        const currentDuration = zoomRange[1] - zoomRange[0];
        const newDuration = Math.min(currentDuration * 2, duration); // Zoom out by 100%, but not beyond the full duration
        const center = currentTime;
        const newStart = Math.max(center - newDuration / 2, 0);
        const newEnd = Math.min(newStart + newDuration, duration);
        setZoomRange([newStart, newEnd]);
    };

    const resetZoom = () => {
        setZoomRange([0, duration]);
    };

    // Add this new function to reset RTTM data and speaker colors
    const resetRTTMDataAndColors = () => {
        setRttmData([]);
        setSpeakerColors({});
        setOriginalSpeakerColors({});
        setShowPredictionLegend(false);
        if (chartRef.current) {
            chartRef.current.update();
        }
    };

    //#endregion -- Chart controls/updates

    // Add this function near the top of your component
    const resetAllState = () => {
        setRttmData([]);
        setSpeakerColors({});
        setOriginalSpeakerColors({});
        setShowPredictionLegend(false);
        setWaveformData([]);
        setCurrentTime(0);
        setDuration(600);
        setZoomRange([0, 600]);
        setTranscriptionSegments([]);
        setTranscriptionResult({
            segments: [],
            og_file_name: '',
            file_name: '',
            rttm_lines: [],
            rttm_merged: [],
            speaker_colors: {},
            transcript: '',
            speakerLegend: {}
        });
        if (chartRef.current) {
            chartRef.current.update();
        }
    };

    // Add this function to compress the audio file
    const compressAudio = async (file: File): Promise<File> => {
        setIsCompressing(true);
        const ffmpeg = new FFmpeg();
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd";
        await ffmpeg.load({
            coreURL: await toBlobURL(
                `${baseURL}/ffmpeg-core.js`,
                "text/javascript"
            ),
            wasmURL: await toBlobURL(
                `${baseURL}/ffmpeg-core.wasm`,
                "application/wasm"
            ),
        });

        await ffmpeg.writeFile("input", await fetchFile(file));
        await ffmpeg.exec([
            "-i",
            "input",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "64k",
            "output.mp3",
        ]);
        const data = await ffmpeg.readFile("output.mp3");
        setIsCompressing(false);
        return new File([data], file.name.replace(/\.[^/.]+$/, ".mp3"), {
            type: "audio/mpeg",
        });
    };

    // Update the handleTranscriptionFileUpload function
    const handleTranscriptionFileUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            // Check file size (e.g., max 1GB)
            if (file.size > 1.5 * 1024 * 1024 * 1024) {
                alert(
                    "File is too large. Please select a file smaller than 1GB."
                );
                return;
            }

            // Check file type
            if (!file.type.startsWith("audio/")) {
                alert("Please select an audio file.");
                return;
            }

            // Reset all state
            resetAllState();

            setTranscriptionFile(file);
            setFileSize(file.size);

            // Handle audio file
            const audio = new Audio(URL.createObjectURL(file));
            audioRef.current = audio;

            audio.addEventListener("loadedmetadata", () => {
                console.log("Audio loaded, duration:", audio.duration);
                setDuration(audio.duration);
                setZoomRange([0, audio.duration]);
                setIsAudioUploaded(true);
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

    // Update handleTestTranscribeEndpoint to use setTranscriptionResult directly
    const handleTestTranscribeEndpoint = async () => {
        if (!transcriptionFile) {
            console.error("No transcription file selected");
            alert("Please select a file first");
            return;
        }
        try {
            setIsTranscribing(true);

            let fileToSend = transcriptionFile;
            if (fileSize && fileSize > 250 * 1024 * 1024) {
                setIsCompressing(true);
                fileToSend = await compressAudio(transcriptionFile);
                setIsCompressing(false);
            }

            const result = await transcribe_endpoint(fileToSend);
            
            // Process result and update parent state
            setTranscriptionResult(result);
            
            // Update local states for visualization
            setTranscriptionSegments(result.segments);
            const parsedRttm = parseRTTM(result.rttm_lines);
            setRttmData(parsedRttm as ImportedRTTMSegment[]);
            const colors = getSpeakerColors(parsedRttm as ImportedRTTMSegment[]);
            setSpeakerColors(colors);
            setOriginalSpeakerColors(colors);
            setShowPredictionLegend(true);

        } catch (error) {
            console.error("Error in handleTestTranscribeEndpoint:", error);
            alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsTranscribing(false);
            setIsCompressing(false);
        }
    };

    const handleSegmentClick = (startTime: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = startTime;
            setCurrentTime(startTime);
            updateZoomRange(startTime);
        }
    };

    // Add this helper function to find the current segment
    const getCurrentSegment = (
        segments: TranscriptionResult['segments'],
        currentTime: number
    ) => {
        return segments.findIndex(
            (segment) =>
                currentTime >= segment.start && currentTime <= segment.end
        );
    };

    // Update the TranscriptionSegments component
    const TranscriptionSegments = ({
        segments,
        speakerColors,
        onSegmentClick,
        currentTime,
    }: {
        segments: TranscriptionResult['segments'];
        speakerColors: Record<string, string>;
        onSegmentClick: (startTime: number) => void;
        currentTime: number;
    }) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const lastValidSegmentIndex = useRef<number>(-1);
        const currentSegmentIndex = getCurrentSegment(segments, currentTime);

        useEffect(() => {
            // Skip any updates if we're in an unlabeled section
            if (currentSegmentIndex === -1) return;

            // Only update if this is a different valid segment
            if (
                currentSegmentIndex !== lastValidSegmentIndex.current &&
                containerRef.current
            ) {
                const container = containerRef.current;
                const segmentElement = container.children[0].children[
                    currentSegmentIndex
                ] as HTMLElement;

                if (segmentElement) {
                    const viewportTop = container.scrollTop;
                    const viewportBottom = viewportTop + container.clientHeight;
                    const elementTop = segmentElement.offsetTop;

                    if (
                        elementTop < viewportTop ||
                        elementTop > viewportBottom
                    ) {
                        const newScrollTop = elementTop - 80;
                        const scrollBehavior =
                            Math.abs(viewportTop - newScrollTop) > 500
                                ? "auto"
                                : "smooth";

                        container.scrollTo({
                            top: newScrollTop,
                            behavior: scrollBehavior,
                        });
                    }
                }
                lastValidSegmentIndex.current = currentSegmentIndex;
            }
        }, [currentSegmentIndex]);

        // Only highlight if we have a valid segment
        const highlightIndex = currentSegmentIndex;

        return (
            <div ref={containerRef} className='overflow-y-auto h-full'>
                <div className='space-y-2'>
                    {segments.map((segment: TranscriptionResult['segments'][0], index: number) => (
                        <div
                            key={index}
                            className={`border p-2 rounded cursor-pointer transition-colors ${
                                index === highlightIndex
                                    ? "bg-accent/50 border-accent"
                                    : "hover:bg-gray-700"
                            }`}
                            onClick={() => onSegmentClick(segment.start)}
                        >
                            <p className='text-sm text-gray-500'>
                                {formatTime(segment.start)} -{" "}
                                {formatTime(segment.end)}
                            </p>
                            <p>
                                <strong
                                    style={{
                                        color:
                                            speakerColors[segment.speaker] ||
                                            "white",
                                    }}
                                >
                                    {segment.speaker}:
                                </strong>{" "}
                                {segment.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const handleTestSimpleEndpoint = () => {
        testSimpleEndpoint();
    };

    const downloadRTTM = useCallback(() => {
        if (rttmData.length > 0 && transcriptionResult) {
            const rttmContent = rttmData
                .map(
                    (segment) =>
                        `SPEAKER ${
                            transcriptionResult.og_file_name || "unknown"
                        } 1 ${segment.start.toFixed(
                            3
                        )} ${segment.duration.toFixed(3)} <NA> <NA> ${
                            segment.speaker
                        } <NA> <NA>`
                )
                .join("\n");
            const blob = new Blob([rttmContent], {
                type: "text/plain",
            });
            saveAs(blob, `${transcriptionResult.og_file_name}.rttm`);
        } else {
            console.error("No RTTM data or transcription result available");
        }
    }, [rttmData, transcriptionResult]);

    const downloadJSON = useCallback(() => {
        if (transcriptionResult) {
            // Create a copy of the transcriptionResult and add speaker_colors
            const resultWithColors = {
                ...transcriptionResult,
                speaker_colors: speakerColors,
                file_name: transcriptionResult.og_file_name, // Update file_name to og_file_name
            };

            const blob = new Blob([JSON.stringify(resultWithColors, null, 4)], {
                type: "application/json",
            });
            saveAs(blob, `${transcriptionResult.og_file_name}.json`);
        }
    }, [transcriptionResult, speakerColors]);

    // Modify the downloadTranscript function
    const downloadTranscript = useCallback(() => {
        if (transcriptionResult) {
            const headerText = `Transcript for file: ${transcriptionResult.og_file_name}\n\n`;

            const formattedTranscript =
                transcriptionResult.transcript
                    .split("\n")
                    .join("\n\n");

            const fullTranscript = headerText + formattedTranscript;

            const blob = new Blob([fullTranscript], {
                type: "text/plain;charset=utf-8",
            });
            saveAs(
                blob,
                `${transcriptionResult.og_file_name}_transcript.txt`
            );
        }
    }, []);

    // Add this new function after the downloadTranscript function
    const copyTranscriptToClipboard = useCallback(() => {
        if (transcriptionResult?.transcript) {
            navigator.clipboard
                .writeText(transcriptionResult.transcript)
                .then(() => {
                    // You could add a toast notification here if you want
                    console.log("Transcript copied to clipboard");
                })
                .catch((err) => {
                    console.error("Failed to copy transcript:", err);
                });
        }
    }, []);

    useEffect(() => {
        if (transcriptionResult) {
            console.log(
                "Updated transcriptionResult state:",
                transcriptionResult
            );
        }
    }, [transcriptionResult]);

    const loadDevFiles = async () => {
        try {
            // Load JSON file
            const jsonResponse = await fetch("/dev_files/V40914AB1_2of2.json");
            const jsonData = await jsonResponse.json();
            setTranscriptionResult(jsonData);
            setTranscriptionSegments(jsonData.segments);

            // Parse RTTM data
            const parsedRttm = parseRTTM(jsonData.rttm_lines);

            // Update RTTM data with correct speaker labels from segments
            const updatedRttm = parsedRttm.map((segment) => {
                const matchingSegment = jsonData.segments.find(
                    (s: TranscriptionResult['segments'][0]) =>
                        s.start <= segment.start &&
                        s.start + s.end >= segment.start + segment.duration
                );
                return matchingSegment
                    ? { ...segment, speaker: matchingSegment.speaker }
                    : segment;
            });

            setRttmData(updatedRttm as ImportedRTTMSegment[]);

            // Set speaker colors
            let colors: Record<string, string>;
            if (jsonData.speaker_colors) {
                colors = jsonData.speaker_colors;
            } else {
                colors = getSpeakerColors(updatedRttm as ImportedRTTMSegment[]);
            }
            setSpeakerColors(colors);
            setOriginalSpeakerColors(colors);

            // Load audio file
            const audio = new Audio("/dev_files/V40914AB1_2of2.mp3");
            audioRef.current = audio;

            audio.addEventListener("loadedmetadata", () => {
                setDuration(audio.duration);
                setZoomRange([0, audio.duration]);
                setIsAudioUploaded(true);
            });

            // Generate waveform data (you might need to adjust this part)
            const response = await fetch("/dev_files/V40914AB1_2of2.mp3");
            const arrayBuffer = await response.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const waveform = generateWaveformData(audioBuffer, 10000);
            setWaveformData(waveform);

            setShowPredictionLegend(true);
        } catch (error) {
            console.error("Error loading dev files:", error);
        }
    };

    return (
        <div className='w-full'>
            <Card className='card'>
                <CardHeader>
                    <CardTitle>Dev Utility</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='flex items-center space-x-2'>
                        {/* <Button
                            onClick={handleTestSimpleEndpoint}
                            variant='secondary'
                        >
                            Test API Connection
                        </Button> */}
                        <Button onClick={loadDevFiles} variant='secondary'>
                            Load Example
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <div className='flex space-x-4'>
                <motion.div
                    className='w-2/3'
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: isLoaded ? 1 : 0 }}
                    transition={{ delay: 0.75, duration: 0.6 }}
                >
                    <Card className='card' ref={audioWaveformRef}>
                        <CardHeader>
                            <CardTitle>Audio Viewer</CardTitle>
                        </CardHeader>
                        <CardContent className='flex flex-col space-y-4'>
                            <div>
                                <div className='text-sm font-medium mb-1'>
                                    Upload Audio File for Transcription
                                </div>
                                <div className='flex items-center space-x-2 max-w-md'>
                                    <Input
                                        id='transcription-upload'
                                        type='file'
                                        accept='audio/*'
                                        onChange={handleTranscriptionFileUpload}
                                        disabled={
                                            isTranscribing || isCompressing
                                        }
                                        className='text-white file:text-white file:bg-secondary hover:file:bg-secondary/80 file:mr-4 file:ml-2 pl-2'
                                    />
                                    <Button
                                        onClick={handleTestTranscribeEndpoint}
                                        disabled={
                                            !transcriptionFile ||
                                            isTranscribing ||
                                            isCompressing
                                        }
                                    >
                                        {isTranscribing ? (
                                            <>
                                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                Transcribing...
                                            </>
                                        ) : isCompressing ? (
                                            <>
                                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                Compressing...
                                            </>
                                        ) : (
                                            "Send"
                                        )}
                                    </Button>
                                </div>
                                {fileSize && (
                                    <div className='text-sm mt-2'>
                                        File size:{" "}
                                        {(fileSize / (1024 * 1024)).toFixed(2)}{" "}
                                        MB
                                    </div>
                                )}
                            </div>

                            <div className='h-[300px] flex flex-col'>
                                {" "}
                                {/* Reduced height */}
                                {isAudioUploaded ? (
                                    <>
                                        <div className='flex justify-end mb-2'>
                                            <WaveformSizeControl
                                                value={verticalScale}
                                                onChange={setVerticalScale}
                                            />
                                        </div>
                                        <div className='flex-grow relative'>
                                            <Line
                                                data={chartData}
                                                options={chartOptions}
                                                ref={chartRef}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className='flex-grow flex items-center justify-center'>
                                        <p className='text-gray-500'>
                                            No audio file uploaded yet
                                        </p>
                                    </div>
                                )}
                            </div>

                            {isAudioUploaded && (
                                <>
                                    <div className='space-y-2'>
                                        <div className='space-y-1'>
                                            <label
                                                htmlFor='full-file-slider'
                                                className='text-sm font-medium'
                                            >
                                                Global Timeline
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
                                                    onValueChange={
                                                        handleSliderChange
                                                    }
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
                                        <div className='flex justify-center items-center space-x-4'>
                                            {/* Zoom controls */}
                                            <div className='flex items-center space-x-2'>
                                                <Button
                                                    onClick={zoomIn}
                                                    variant='outline'
                                                    size='sm'
                                                >
                                                    <PlusIcon className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    onClick={zoomOut}
                                                    variant='outline'
                                                    size='sm'
                                                >
                                                    <MinusIcon className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    onClick={resetZoom}
                                                    variant='outline'
                                                    size='sm'
                                                >
                                                    Reset Zoom
                                                </Button>
                                            </div>

                                            {/* Playback controls */}
                                            <div className='flex items-center space-x-4'>
                                                <Button
                                                    onClick={jumpToBeginning}
                                                    variant='outline'
                                                    size='icon'
                                                    aria-label='Jump to beginning'
                                                >
                                                    <SkipBack className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    onClick={togglePlayPause}
                                                    aria-label={
                                                        isPlaying
                                                            ? "Pause"
                                                            : "Play"
                                                    }
                                                >
                                                    {isPlaying
                                                        ? "Pause"
                                                        : "Play"}
                                                </Button>
                                                <Button
                                                    onClick={jumpToEnd}
                                                    variant='outline'
                                                    size='icon'
                                                    aria-label='Jump to end'
                                                >
                                                    <SkipForward className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    onClick={cyclePlaybackSpeed}
                                                    variant='outline'
                                                    size='sm'
                                                    aria-label={`Playback speed: ${playbackRate}x`}
                                                >
                                                    {playbackRate}x
                                                </Button>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    onClick={toggleMute}
                                                    aria-label={
                                                        volume === 0
                                                            ? "Unmute"
                                                            : "Mute"
                                                    }
                                                >
                                                    {volume === 0 ? (
                                                        <VolumeX className='h-4 w-4' />
                                                    ) : (
                                                        <Volume2 className='h-4 w-4' />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    {showPredictionLegend && (
                                        <div>
                                            <RTTMLegend
                                                data={rttmData}
                                                title='Transcription RTTM Labels'
                                                colors={speakerColors}
                                                editable={true}
                                                onResetColors={resetColors}
                                                onUpdateSpeakerLabel={
                                                    updateSpeakerLabel
                                                }
                                                speakerLegend={transcriptionResult?.speakerLegend || {}}
                                            />
                                            <div className='mt-3 flex justify-between w-full'>
                                                <Button
                                                    onClick={
                                                        copyTranscriptToClipboard
                                                    }
                                                    variant='outline'
                                                    size='sm'
                                                >
                                                    Copy Transcript
                                                </Button>
                                                <div className='space-x-2'>
                                                    <Button
                                                        onClick={downloadRTTM}
                                                        variant='outline'
                                                        size='sm'
                                                    >
                                                        Download RTTM
                                                    </Button>
                                                    <Button
                                                        onClick={downloadJSON}
                                                        variant='outline'
                                                        size='sm'
                                                    >
                                                        Download JSON
                                                    </Button>
                                                    <Button
                                                        onClick={
                                                            downloadTranscript
                                                        }
                                                        variant='outline'
                                                        size='sm'
                                                    >
                                                        Download Transcript
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    className='w-1/3'
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: isLoaded ? 1 : 0 }}
                    transition={{ delay: 0.85, duration: 0.6 }}
                >
                    <Card
                        className='card h-[calc(100vh-200px)] flex flex-col'
                        ref={transcriptionSegmentsRef}
                    >
                        <CardHeader className='pb-2'>
                            <CardTitle>Transcription Segments</CardTitle>
                        </CardHeader>
                        <CardContent className='pt-2 px-4 pb-4 flex-1 overflow-hidden'>
                            {!isAudioUploaded ||
                            transcriptionResult?.segments.length === 0 ? (
                                <div className='flex items-center justify-center h-full'>
                                    <p className='text-gray-500'>
                                        No transcription available
                                    </p>
                                </div>
                            ) : (
                                <TranscriptionSegments
                                    segments={transcriptionSegments}
                                    speakerColors={speakerColors}
                                    onSegmentClick={handleSegmentClick}
                                    currentTime={currentTime}
                                />
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Interview Summary Card */}
            <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: isLoaded ? 1 : 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className='mb-4'
            >
                <Summarize
                    transcript={transcriptionResult?.transcript || ""}
                    onSummaryGenerated={(summary) => {
                        // Handle the generated summary if needed
                        console.log("Summary generated:", summary);
                        if (transcriptionResult) {
                            const updatedResult = {
                                ...transcriptionResult,
                                summary,
                            };
                            setTranscriptionResult(updatedResult);
                        }
                    }}
                    fileName={transcriptionResult?.og_file_name}
                />
            </motion.div>

            {/* Segment Timeline Card */}
            <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: isLoaded ? 1 : 0 }}
                transition={{ delay: 0.95, duration: 0.6 }}
                className='mb-4'
            >
                <Card className='card'>
                    <CardHeader
                        className='cursor-pointer hover:bg-accent/50 transition-colors'
                        onClick={() =>
                            setShowSegmentTimeline(!showSegmentTimeline)
                        }
                    >
                        <div className='flex justify-between items-center'>
                            <CardTitle>Segment Timeline</CardTitle>
                            <Button variant='ghost' size='sm'>
                                {showSegmentTimeline ? "▼" : "▶"}
                            </Button>
                        </div>
                    </CardHeader>
                    <motion.div
                        initial={false}
                        animate={{
                            height: showSegmentTimeline ? "auto" : 0,
                            opacity: showSegmentTimeline ? 1 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: "hidden" }}
                    >
                        <CardContent>
                            {isAudioUploaded && transcriptionResult && transcriptionResult.segments && transcriptionResult.segments.length > 0 ? (
                                <SegmentTimeline
                                    segments={transcriptionResult.segments}
                                    speakerColors={speakerColors}
                                    onSegmentClick={handleSegmentClick}
                                    currentTime={currentTime}
                                />
                            ) : (
                                <div className='text-center text-gray-500'>
                                    No segments available. Please upload and transcribe an audio file.
                                </div>
                            )}
                        </CardContent>
                    </motion.div>
                </Card>
            </motion.div>

            {/* Segments by Speaker Card */}
            <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: isLoaded ? 1 : 0 }}
                transition={{ delay: 1.05, duration: 0.6 }}
                className='mb-4'
            >
                <Card className='card'>
                    <CardHeader
                        className='cursor-pointer hover:bg-accent/50 transition-colors'
                        onClick={() =>
                            setShowSegmentsBySpeaker(!showSegmentsBySpeaker)
                        }
                    >
                        <div className='flex justify-between items-center'>
                            <CardTitle>Segments by Speaker</CardTitle>
                            <Button variant='ghost' size='sm'>
                                {showSegmentsBySpeaker ? "▼" : "▶"}
                            </Button>
                        </div>
                    </CardHeader>
                    <motion.div
                        initial={false}
                        animate={{
                            height: showSegmentsBySpeaker ? "auto" : 0,
                            opacity: showSegmentsBySpeaker ? 1 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: "hidden" }}
                    >
                        <CardContent>
                            {isAudioUploaded && transcriptionResult && transcriptionResult.segments && transcriptionResult.segments.length > 0 ? (
                                <SegmentsBySpeaker
                                    segments={transcriptionResult.segments}
                                    speakerColors={speakerColors}
                                    onSegmentClick={handleSegmentClick}
                                />
                            ) : (
                                <div className='text-center text-gray-500'>
                                    No segments available. Please upload and transcribe an audio file.
                                </div>
                            )}
                        </CardContent>
                    </motion.div>
                </Card>
            </motion.div>

            {/* Add the new DraggableSegmentTimeline component */}
            {/* <Card className='w-full mb-4'>
                <CardHeader>
                    <CardTitle>Reorderable Segment Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    {isAudioUploaded && transcriptionResult?.segments.length > 0 ? (
                        <DraggableSegmentTimeline
                            segments={transcriptionResult?.segments.map((segment, index) => ({
                                ...segment,
                                id: `segment-${index}`
                            }))}
                            speakerColors={speakerColors}
                        />
                    ) : (
                        <div className='text-center text-gray-500'>
                            No segments available. Please upload and transcribe an audio file.
                        </div>
                    )}
                </CardContent>
            </Card> */}
        </div>
    );
}
