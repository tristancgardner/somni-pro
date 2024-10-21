import React, { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Segment = {
    speaker: string;
    start: number;
    end: number;
    text: string;
};

type SegmentTimelineProps = {
    segments: Segment[];
    speakerColors: Record<string, string>;
    onSegmentClick: (startTime: number) => void;
};

const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
};

export function SegmentTimeline({
    segments,
    speakerColors,
    onSegmentClick,
}: SegmentTimelineProps) {
    const [totalDuration, setTotalDuration] = useState(0);
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (segments.length > 0) {
            setTotalDuration(segments[segments.length - 1].end);
        }
    }, [segments]);

    const timeMarkers = [];
    for (let i = 0; i <= totalDuration; i += 60) {
        timeMarkers.push(
            <div
                key={i}
                className='absolute top-0 h-full'
                style={{ left: `${(i / totalDuration) * 100}%` }}
            >
                <div className='h-2 w-px bg-gray-600'></div>
                <div className='text-xs text-gray-400 mt-1'>
                    {formatTime(i)}
                </div>
            </div>
        );
    }

    return (
        <div className='w-full h-64 bg-gray-900 rounded-lg overflow-hidden'>
            <ScrollArea className='h-full'>
                <div
                    className='relative w-full h-full'
                    style={{ width: `${Math.max(totalDuration * 5, 100)}px` }}
                >
                    <div className='absolute top-0 left-0 w-full h-8'>
                        {timeMarkers}
                    </div>
                    <div
                        className='absolute top-8 left-0 w-full h-[calc(100%-2rem)]'
                        ref={timelineRef}
                    >
                        {segments.map((segment, index) => {
                            const width =
                                ((segment.end - segment.start) /
                                    totalDuration) *
                                100;
                            const left = (segment.start / totalDuration) * 100;
                            return (
                                <div
                                    key={index}
                                    className='absolute h-8 rounded overflow-hidden cursor-pointer transition-opacity hover:opacity-80'
                                    style={{
                                        width: `${width}%`,
                                        left: `${left}%`,
                                        backgroundColor:
                                            speakerColors[segment.speaker] ||
                                            "gray",
                                        top: `${(index % 6) * 40}px`,
                                    }}
                                    onClick={() =>
                                        onSegmentClick(segment.start)
                                    }
                                >
                                    <div className='p-1 text-xs text-white truncate'>
                                        <span className='font-bold'>
                                            {segment.speaker}:{" "}
                                        </span>
                                        {segment.text}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
