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
import { parseRTTM, RTTMSegment } from "@/utils/rttmParser";
import { Input } from "@/components/ui";
import { PlusIcon, MinusIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ChromePicker } from "react-color";
import { SkipBack, SkipForward, FastForward } from "lucide-react";
import { Loader2 } from "lucide-react";

ChartJS.register(...registerables);

// Add this constant at the top of the file, after the imports
const SPEAKER_COLORS = [
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
    "#81C784",
    "#64B5F6",
    "#FFB74D",
    "#A1887F",
    "#9575CD",
    "#4DB6AC",
    "#DCE775",
    "#4DD0E1",
    "#BA68C8",
    "#FF8A65",
    "#7986CB",
    "#81C784",
];

// Define the plugin
const GroundTruthPlugin: Plugin = {
    id: "groundTruthPlugin",
    beforeDraw(chart, args, options) {
        const { ctx, chartArea, scales } = chart;
        const { showGroundTruth, groundTruthData, speakerColors } = options;

        if (!showGroundTruth) return;

        const barHeight = 20;
        const yPosition = chartArea.top - barHeight - 5;

        groundTruthData.forEach((segment: RTTMSegment) => {
            const startX = scales.x.getPixelForValue(segment.start);
            const endX = scales.x.getPixelForValue(
                segment.start + segment.duration
            );

            ctx.fillStyle = speakerColors[segment.speaker];
            ctx.fillRect(startX, yPosition, endX - startX, barHeight);
        });
    },
};

// Register the plugin
ChartJS.register(GroundTruthPlugin);

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
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

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
    const [showGroundTruthLegend, setShowGroundTruthLegend] = useState(false);
    const [showPredictionLegend, setShowPredictionLegend] = useState(false);
    const [showGroundTruth, setShowGroundTruth] = useState(true);
    const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
    const [originalSpeakerColors, setOriginalSpeakerColors] = useState<
        Record<string, string>
    >({});
    const [playbackRate, setPlaybackRate] = useState(1);
    const [useDefaultFiles, setUseDefaultFiles] = useState(true);
    const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);

    useEffect(() => {
        if (useDefaultFiles) {
            loadDefaultFiles();
        }
    }, [useDefaultFiles]);

    const getSpeakerColors = (
        rttmData: RTTMSegment[]
    ): Record<string, string> => {
        const speakers = Array.from(
            new Set(rttmData.map((segment) => segment.speaker))
        );
        return Object.fromEntries(
            speakers.map((speaker, index) => [
                speaker,
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
        if (
            waveformData.length === 0 ||
            predictionRTTMData.length === 0 ||
            !isRTTMUploaded
        )
            return [];

        const colors = new Array(waveformData.length).fill(
            "rgba(200, 200, 200, 0.5)"
        );
        const timeStep = duration / waveformData.length;

        predictionRTTMData.forEach((segment) => {
            const startIndex = Math.floor(segment.start / timeStep);
            const endIndex = Math.min(
                Math.floor((segment.start + segment.duration) / timeStep),
                waveformData.length
            );
            for (let i = startIndex; i < endIndex; i++) {
                colors[i] =
                    speakerColors[segment.speaker] ||
                    "rgba(200, 200, 200, 0.5)";
            }
        });

        console.log("Color map updated:", colors); // Add this line
        return colors;
    }, [
        waveformData,
        predictionRTTMData,
        duration,
        speakerColors,
        isRTTMUploaded,
    ]);

    // Update the chartData
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
            groundTruthPlugin: {
                showGroundTruth,
                groundTruthData: groundTruthRTTMData,
                speakerColors: Object.fromEntries(
                    groundTruthRTTMData.map((segment, index) => [
                        segment.speaker,
                        SPEAKER_COLORS[index % SPEAKER_COLORS.length],
                    ])
                ),
            },
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
                // Update the ground truth plugin options
                if (
                    chart.options.plugins &&
                    "groundTruthPlugin" in chart.options.plugins
                ) {
                    (chart.options.plugins.groundTruthPlugin as any) = {
                        showGroundTruth,
                        groundTruthData: groundTruthRTTMData,
                        speakerColors: Object.fromEntries(
                            groundTruthRTTMData.map((segment, index) => [
                                segment.speaker,
                                SPEAKER_COLORS[index % SPEAKER_COLORS.length],
                            ])
                        ),
                    };
                }
                chart.update();
            }
        }
    }, [zoomRange, verticalScale, groundTruthRTTMData, showGroundTruth]);

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
                setSpeakerColors((prevColors) => ({
                    ...prevColors,
                    ...colors,
                }));
                setShowGroundTruthLegend(true);
                setIsRTTMUploaded(true);

                // Update the chart to show ground truth bars
                if (chartRef.current) {
                    chartRef.current.update();
                }
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
                setOriginalSpeakerColors(colors);
                setRttmData(parsedRttm);
                setShowPredictionLegend(true);
                setIsRTTMUploaded(true);

                // Force chart update
                if (chartRef.current) {
                    chartRef.current.update();
                }
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

    // Update the updateSpeakerLabel function
    const updateSpeakerLabel = useCallback(
        (oldLabel: string, newLabel: string) => {
            setPredictionRTTMData((prevData) =>
                prevData.map((segment) =>
                    segment.speaker === oldLabel
                        ? { ...segment, speaker: newLabel }
                        : segment
                )
            );
            setRttmData((prevData) =>
                prevData.map((segment) =>
                    segment.speaker === oldLabel
                        ? { ...segment, speaker: newLabel }
                        : segment
                )
            );
            setSpeakerColors((prevColors) => {
                const { [oldLabel]: color, ...rest } = prevColors;
                return { ...rest, [newLabel]: color };
            });
        },
        []
    );

    // Add this useEffect to update the chart when predictionRTTMData or speakerColors change
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.update();
        }
    }, [predictionRTTMData, speakerColors]);

    // Update the RTTMLegend component
    const RTTMLegend = ({
        data,
        title,
        colors,
        editable = false,
        onResetColors,
        onUpdateSpeakerLabel,
    }: {
        data: RTTMSegment[];
        title: string;
        colors: Record<string, string>;
        editable?: boolean;
        onResetColors?: () => void;
        onUpdateSpeakerLabel: (oldLabel: string, newLabel: string) => void;
    }) => {
        console.log("RTTMLegend data:", data); // Add this line
        console.log("RTTMLegend colors:", colors); // Add this line

        const speakers = Array.from(
            new Set(data.map((segment) => segment.speaker))
        );

        const debouncedUpdateSpeakerLabel = useCallback(
            debounce((oldLabel: string, newLabel: string) => {
                onUpdateSpeakerLabel(oldLabel, newLabel);
            }, 300),
            [onUpdateSpeakerLabel]
        );

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
                                    <PopoverTrigger>
                                        <div
                                            className='w-6 h-6 mr-2 rounded-full cursor-pointer'
                                            style={{
                                                backgroundColor:
                                                    colors[speaker],
                                            }}
                                        />
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <ChromePicker
                                            color={colors[speaker]}
                                            onChange={(color) =>
                                                updateSpeakerColor(
                                                    speaker,
                                                    color.hex
                                                )
                                            }
                                        />
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <div
                                    className='w-4 h-4 mr-2 rounded-full'
                                    style={{ backgroundColor: colors[speaker] }}
                                />
                            )}
                            {editable ? (
                                <Input
                                    defaultValue={speaker}
                                    onChange={(e) =>
                                        debouncedUpdateSpeakerLabel(
                                            speaker,
                                            e.target.value
                                        )
                                    }
                                    className='w-24'
                                />
                            ) : (
                                <span>{speaker}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const toggleGroundTruth = () => {
        setShowGroundTruth(!showGroundTruth);
        if (chartRef.current) {
            chartRef.current.update();
        }
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

    const generateRTTMContent = () => {
        return predictionRTTMData
            .map((segment) => {
                return `SPEAKER file 1 ${segment.start.toFixed(
                    3
                )} ${segment.duration.toFixed(3)} <NA> <NA> ${
                    segment.speaker
                } <NA> <NA>`;
            })
            .join("\n");
    };

    const handleExportRTTM = () => {
        const content = generateRTTMContent();
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "updated_prediction.rttm";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const toggleDefaultFiles = () => {
        setUseDefaultFiles(!useDefaultFiles);
        if (!useDefaultFiles) {
            // Load default files
            loadDefaultFiles();
        } else {
            // Reset to uploaded files (if any)
            if (audioFile) {
                const dummyEvent = {
                    target: { files: [audioFile] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleAudioFileUpload(dummyEvent);
            }
            if (predictionRTTM) {
                const dummyEvent = {
                    target: { files: [predictionRTTM] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                handlePredictionRTTMUpload(dummyEvent);
            }
            if (groundTruthRTTM) {
                const dummyEvent = {
                    target: { files: [groundTruthRTTM] },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                handleGroundTruthRTTMUpload(dummyEvent);
            }
        }
    };

    const loadDefaultFiles = () => {
        // Load default audio file
        const audio = new Audio("/V40914AB1_1of2_pp.wav");
        audioRef.current = audio;
        audio.addEventListener("loadedmetadata", () => {
            setDuration(audio.duration);
            setZoomRange([0, audio.duration]);
            setIsAudioUploaded(true);
        });

        // Load audio data for waveform
        fetch("/V40914AB1_1of2_pp.wav")
            .then((response) => response.arrayBuffer())
            .then((arrayBuffer) =>
                new AudioContext().decodeAudioData(arrayBuffer)
            )
            .then((audioBuffer) => {
                const waveform = generateWaveformData(audioBuffer, 10000);
                setWaveformData(waveform);
            })
            .catch((error) =>
                console.error("Error loading audio data:", error)
            );

        // Load default prediction RTTM file
        fetch("/V40914AB1_PART1OF2_3dia_large-v3_min2max4.rttm")
            .then((response) => response.text())
            .then((content) => {
                const parsedRttm = parseRTTM(content);
                setPredictionRTTMData(parsedRttm);
                const colors = getSpeakerColors(parsedRttm);
                setSpeakerColors(colors);
                setOriginalSpeakerColors(colors);
                setRttmData(parsedRttm);
                setShowPredictionLegend(true);
                setIsRTTMUploaded(true);
                if (chartRef.current) {
                    chartRef.current.update();
                }
            })
            .catch((error) =>
                console.error("Error loading prediction RTTM:", error)
            );
    };

    const handleTranscriptionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setTranscriptionFile(file);
        }
    };

    const sendForTranscription = async () => {
        if (!transcriptionFile) {
            console.error("No file selected for transcription");
            return;
        }

        setIsTranscribing(true);

        const formData = new FormData();
        formData.append("file", transcriptionFile);

        try {
            const response = await fetch("http://your-fastapi-endpoint/transcribe", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log("Transcription result:", result);
            // Handle the transcription result as needed
        } catch (error) {
            console.error("Error sending file for transcription:", error);
        } finally {
            setIsTranscribing(false);
        }
    };

    return (
        <Card className='w-full max-w-full'>
            <CardHeader>
                <CardTitle>Audio Waveform with Speaker Labels</CardTitle>
            </CardHeader>
            <CardContent>
                <div className='flex justify-end mb-4'>
                    <Button
                        onClick={toggleDefaultFiles}
                        variant='outline'
                        size='sm'
                    >
                        {useDefaultFiles
                            ? "Use Uploaded Files"
                            : "Use Default Files"}
                    </Button>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4'>
                    <div>
                        <div className='text-sm font-medium mb-1'>
                            {useDefaultFiles
                                ? "Using Default Audio File"
                                : "Upload Audio File (WAV)"}
                        </div>
                        <Input
                            id='audio-upload'
                            type='file'
                            accept='.wav'
                            onChange={handleAudioFileUpload}
                            disabled={useDefaultFiles}
                        />
                    </div>
                    <div>
                        <div className='text-sm font-medium mb-1'>
                            {useDefaultFiles
                                ? "Using Default Prediction RTTM"
                                : "Upload Prediction RTTM"}
                        </div>
                        <Input
                            id='prediction-upload'
                            type='file'
                            accept='.rttm'
                            onChange={handlePredictionRTTMUpload}
                            disabled={useDefaultFiles}
                        />
                    </div>
                    <div>
                        <div className='text-sm font-medium mb-1'>
                            Upload File for Transcription
                        </div>
                        <div className='flex items-center space-x-2'>
                            <Input
                                id='transcription-upload'
                                type='file'
                                onChange={handleTranscriptionFileUpload}
                                disabled={isTranscribing}
                            />
                            <Button
                                onClick={sendForTranscription}
                                disabled={!transcriptionFile || isTranscribing}
                            >
                                {isTranscribing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Transcribing...
                                    </>
                                ) : (
                                    "Send"
                                )}
                            </Button>
                        </div>
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
                                            isPlaying ? "Pause" : "Play"
                                        }
                                    >
                                        {isPlaying ? "Pause" : "Play"}
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
                            </div>
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
                            <>
                                {showGroundTruthLegend && (
                                    <div className='mt-4 flex justify-between items-center'>
                                        <RTTMLegend
                                            data={groundTruthRTTMData}
                                            title='Ground Truth RTTM Labels'
                                            colors={speakerColors}
                                            onUpdateSpeakerLabel={
                                                updateSpeakerLabel
                                            }
                                        />
                                        <Button
                                            onClick={toggleGroundTruth}
                                            variant='outline'
                                            size='sm'
                                        >
                                            {showGroundTruth ? "Hide" : "Show"}{" "}
                                            Ground Truth
                                        </Button>
                                    </div>
                                )}
                                {showPredictionLegend && (
                                    <div className='mt-4'>
                                        <RTTMLegend
                                            data={predictionRTTMData}
                                            title='Prediction RTTM Labels'
                                            colors={speakerColors}
                                            editable={true}
                                            onResetColors={resetColors}
                                            onUpdateSpeakerLabel={
                                                updateSpeakerLabel
                                            }
                                        />
                                        <div className='mt-2 flex justify-end space-x-2'>
                                            <Button
                                                onClick={handleExportRTTM}
                                                variant='outline'
                                                size='lg'
                                            >
                                                Export w/ Speaker Labels
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}