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
import { saveAs } from "file-saver";
import JSZip from "jszip";

import { testSimpleEndpoint, transcribe_endpoint } from "@/app/api/transcribe";

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
    const [duration, setDuration] = useState(600);
    const [volume, setVolume] = useState(1);
    const [rttmData, setRttmData] = useState<ImportedRTTMSegment[]>([]);
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
    const [isAudioUploaded, setIsAudioUploaded] = useState(false);
    const [verticalScale, setVerticalScale] = useState(1);
    const [showPredictionLegend, setShowPredictionLegend] = useState(false);
    const [originalSpeakerColors, setOriginalSpeakerColors] = useState<
        Record<string, string>
    >({});
    const [playbackRate, setPlaybackRate] = useState(1);
    const [transcriptionFile, setTranscriptionFile] = useState<File | null>(
        null
    );
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
    const [transcriptionSegments, setTranscriptionSegments] = useState<any[]>(
        []
    );

    //#region ---------- chart controls/updates
    const getSpeakerColors = (
        rttmData: ImportedRTTMSegment[]
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
        if (waveformData.length === 0 || rttmData.length === 0) {
            return [];
        }

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
                colors[i] =
                    speakerColors[segment.speaker] ||
                    "rgba(200, 200, 200, 0.5)";
            }
        });

        // console.log("Color map updated:", colors);
        return colors;
    }, [waveformData, rttmData, duration, speakerColors]);

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
    }, [rttmData, speakerColors]);

    // Update the RTTMLegend component
    const RTTMLegend = ({
        data,
        title,
        colors,
        editable = false,
        onResetColors,
        onUpdateSpeakerLabel,
    }: {
        data: ImportedRTTMSegment[];
        title: string;
        colors: Record<string, string>;
        editable?: boolean;
        onResetColors?: () => void;
        onUpdateSpeakerLabel: (oldLabel: string, newLabel: string) => void;
    }) => {
        // console.log("RTTMLegend data:", data); // Add this line
        // console.log("RTTMLegend colors:", colors); // Add this line

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
        setDuration(600); // Reset to default duration
        setZoomRange([0, 600]); // Reset zoom range to default
        setTranscriptionSegments([]);
        setTranscriptionResult(null);
        if (chartRef.current) {
            chartRef.current.update();
        }
    };

    // Update the handleTranscriptionFileUpload function
    const handleTranscriptionFileUpload = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            // Check file size (e.g., max 100MB)
            if (file.size > 100 * 1024 * 1024) {
                alert(
                    "File is too large. Please select a file smaller than 100MB."
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

    const handleTestTranscribeEndpoint = async () => {
        console.log("handleTestTranscribeEndpoint called");
        if (!transcriptionFile) {
            console.error("No transcription file selected");
            alert("Please select a file first");
            return;
        }
        try {
            console.log("Calling transcribe_endpoint");
            setIsTranscribing(true);
            const result = await transcribe_endpoint(transcriptionFile);
            console.log("transcribe() endpoint returned: ", result);

            const session_filename = result.file_name;
            const splitIndex = session_filename.indexOf("_");
            const ogFilename =
                splitIndex !== -1
                    ? session_filename.slice(splitIndex + 1)
                    : session_filename;
            result.og_file_name = ogFilename;

            setTranscriptionResult(result);

            const parsedRttm = parseRTTM(result.rttm_lines);
            setRttmData(parsedRttm as ImportedRTTMSegment[]);
            const colors = getSpeakerColors(
                parsedRttm as ImportedRTTMSegment[]
            );
            setSpeakerColors(colors);
            setOriginalSpeakerColors(colors);
            setShowPredictionLegend(true);

            // Set the transcription segments
            setTranscriptionSegments(result.segments || []);

            // Force chart update
            if (chartRef.current) {
                chartRef.current.update();
            }
        } catch (error) {
            console.error("Error in handleTestTranscribeEndpoint:", error);
            alert(
                `Error: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        } finally {
            setIsTranscribing(false);
        }
    };

    const TranscriptionSegments = ({ segments }: { segments: any[] }) => {
        return (
            <div className='space-y-2'>
                {segments.map((segment, index) => (
                    <div key={index} className='border p-2 rounded'>
                        <p className='text-sm text-gray-500'>
                            {formatTime(segment.start)} -{" "}
                            {formatTime(segment.end)}
                        </p>
                        <p>
                            <strong>{segment.speaker}:</strong> {segment.text}
                        </p>
                    </div>
                ))}
            </div>
        );
    };

    const handleTestSimpleEndpoint = () => {
        testSimpleEndpoint();
    };

    const downloadRTTM = () => {
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
    };

    const downloadJSON = () => {
        if (transcriptionResult) {
            const blob = new Blob(
                [JSON.stringify(transcriptionResult, null, 4)],
                { type: "application/json" }
            );
            saveAs(blob, "transcription_result.json");
        }
    };

    useEffect(() => {
        if (transcriptionResult) {
            console.log(
                "Updated transcriptionResult state:",
                transcriptionResult
            );
        }
    }, [transcriptionResult]);

    return (
        <div className='w-full max-w-full'>
            <Card className='w-full max-w-full mb-4'>
                <CardHeader>
                    <CardTitle>Dev Utility</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='flex items-center space-x-2'>
                        <Button
                            onClick={handleTestSimpleEndpoint}
                            variant='secondary'
                        >
                            Test API Connection
                        </Button>
                        {/* <Button
                            onClick={handleTestTranscribeEndpoint}
                            variant='secondary'
                        >
                            Test Transcribe Endpoint
                        </Button> */}
                    </div>
                </CardContent>
            </Card>
            <Card className='w-full max-w-full mb-4'>
                <CardHeader>
                    <CardTitle>Audio Waveform with Speaker Labels</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className='mb-4'>
                        <div className='text-sm font-medium mb-1'>
                            Upload Audio File for Transcription
                        </div>
                        <div className='flex items-center space-x-2'>
                            <Input
                                id='transcription-upload'
                                type='file'
                                accept='audio/*'
                                onChange={handleTranscriptionFileUpload}
                                disabled={isTranscribing}
                            />
                            <Button
                                onClick={handleTestTranscribeEndpoint}
                                disabled={!transcriptionFile || isTranscribing}
                            >
                                {isTranscribing ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        Transcribing...
                                    </>
                                ) : (
                                    "Send"
                                )}
                            </Button>
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
                            {showPredictionLegend && (
                                <div className='mt-4'>
                                    <RTTMLegend
                                        data={rttmData}
                                        title='Transcription RTTM Labels'
                                        colors={speakerColors}
                                        editable={true}
                                        onResetColors={resetColors}
                                        onUpdateSpeakerLabel={
                                            updateSpeakerLabel
                                        }
                                    />
                                    <div className='mt-2 flex justify-end space-x-2'>
                                        <Button
                                            onClick={downloadRTTM}
                                            variant='outline'
                                            size='lg'
                                        >
                                            Download RTTM
                                        </Button>
                                        <Button
                                            onClick={downloadJSON}
                                            variant='outline'
                                            size='lg'
                                        >
                                            Download JSON
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
            <Card className='w-full max-w-full'>
                <CardHeader>
                    <CardTitle>Transcription Segments</CardTitle>
                </CardHeader>
                <CardContent>
                    <TranscriptionSegments segments={transcriptionSegments} />
                </CardContent>
            </Card>
        </div>
    );
}
