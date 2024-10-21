import React, { useRef, useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

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
    const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

    useEffect(() => {
        if (segments.length > 0) {
            setTotalDuration(segments[segments.length - 1].end);
        }
    }, [segments]);

    const calculateSegmentPositions = (segments: Segment[]) => {
        let currentPosition = 0;
        const positions: { left: number; width: number }[] = [];
        const timeScaling: { start: number; end: number; scale: number }[] = [];
        const padding = 10; // Padding between segments in pixels

        segments.forEach((segment, index) => {
            const segmentDuration = segment.end - segment.start;
            const minWidth = 300;
            const idealWidth = Math.max(segmentDuration * 10, minWidth);

            if (segment.start > currentPosition) {
                // Add scaling factor for gap
                timeScaling.push({
                    start: currentPosition,
                    end: segment.start,
                    scale: 1,
                });
            }

            // Add scaling factor for segment
            const scale = idealWidth / segmentDuration;
            timeScaling.push({
                start: segment.start,
                end: segment.end,
                scale: scale,
            });

            positions.push({
                left: currentPosition,
                width: idealWidth,
            });

            currentPosition += idealWidth + padding; // Add padding after each segment
        });

        return { positions, timeScaling, totalWidth: currentPosition };
    };

    const { positions, timeScaling, totalWidth } = calculateSegmentPositions(segments);

    const getScaledPosition = (time: number) => {
        let scaledPosition = 0;
        for (const scale of timeScaling) {
            if (time <= scale.start) break;
            if (time < scale.end) {
                scaledPosition += (time - scale.start) * scale.scale;
                break;
            }
            scaledPosition += (scale.end - scale.start) * scale.scale;
        }
        return (scaledPosition / totalWidth) * 100;
    };

    const timeMarkers = [];
    for (let i = 0; i <= totalDuration; i += 60) {
        const position = getScaledPosition(i);
        timeMarkers.push(
            <div
                key={i}
                className='absolute top-0 h-full'
                style={{ left: `${position}%` }}
            >
                <div className='h-2 w-px bg-gray-600'></div>
                <div className='text-xs text-gray-400 mt-1'>
                    {formatTime(i)}
                </div>
            </div>
        );
    }

    const [segmentHeights, setSegmentHeights] = useState<number[]>([]);

    useEffect(() => {
        // Calculate heights based on text length
        const heights = segments.map(segment => {
            const baseHeight = 80; // Minimum height
            const textLength = segment.text.length;
            const additionalHeight = Math.floor(textLength / 50) * 20; // Add 20px for every 50 characters
            return Math.min(baseHeight + additionalHeight, 200); // Cap at 200px
        });
        setSegmentHeights(heights);
    }, [segments]);

    const maxHeight = Math.max(...segmentHeights, 100); // Ensure minimum timeline height

    return (
        <div className='w-full bg-gray-900 rounded-lg overflow-hidden' style={{ height: `${maxHeight + 40}px` }}>
            <ScrollArea className='h-full w-full'>
                <div
                    className='relative h-full'
                    style={{ width: `${Math.max(totalWidth, 1000)}px` }}
                >
                    <div className='absolute top-0 left-0 w-full h-8'>
                        {timeMarkers}
                    </div>
                    <div
                        className='absolute top-8 left-0 w-full'
                        style={{ height: `${maxHeight}px` }}
                        ref={timelineRef}
                    >
                        {segments.map((segment, index) => {
                            const { left, width } = positions[index];
                            const segmentHeight = segmentHeights[index];
                            return (
                                <motion.div
                                    key={index}
                                    className='absolute rounded overflow-hidden cursor-pointer'
                                    style={{
                                        width: `${(width / totalWidth) * 100}%`,
                                        left: `${(left / totalWidth) * 100}%`,
                                        backgroundColor: speakerColors[segment.speaker] || "gray",
                                        top: '0px',
                                        height: `${segmentHeight}px`,
                                        marginRight: '10px', // Add right margin for spacing
                                    }}
                                    onClick={() => onSegmentClick(segment.start)}
                                    onMouseEnter={() => setHoveredSegment(index)}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    animate={{
                                        zIndex: hoveredSegment === index ? 10 : 1,
                                    }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ScrollArea className='h-full'>
                                        <div className='p-3 text-sm text-white'>
                                            <span className='font-bold'>{segment.speaker}: </span>
                                            {segment.text}
                                        </div>
                                    </ScrollArea>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
