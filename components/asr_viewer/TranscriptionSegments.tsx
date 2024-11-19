"use client";

import React, { useRef, useEffect } from "react";
import { TranscriptionResult } from "@/types/types";

interface TranscriptionSegmentsProps {
    segments: TranscriptionResult["segments"];
    speakerColors: Record<string, string>;
    onSegmentClick: (startTime: number) => void;
    currentTime: number;
}

export const TranscriptionSegments: React.FC<TranscriptionSegmentsProps> = ({
    segments,
    speakerColors,
    onSegmentClick,
    currentTime,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastValidSegmentIndex = useRef<number>(-1);

    const getCurrentSegment = () => {
        return segments.findIndex(
            (segment) =>
                currentTime >= segment.start && currentTime <= segment.end
        );
    };

    const highlightIndex = getCurrentSegment();

    useEffect(() => {
        if (highlightIndex === -1) return;

        if (
            highlightIndex !== lastValidSegmentIndex.current &&
            containerRef.current
        ) {
            const container = containerRef.current;
            const segmentElement = container.children[0].children[
                highlightIndex
            ] as HTMLElement;

            if (segmentElement) {
                const viewportTop = container.scrollTop;
                const viewportBottom = viewportTop + container.clientHeight;
                const elementTop = segmentElement.offsetTop;

                if (elementTop < viewportTop || elementTop > viewportBottom) {
                    const newScrollTop = elementTop - 80;
                    const scrollBehavior =
                        Math.abs(viewportTop - newScrollTop) > 500
                            ? "auto"
                            : "smooth";

                    container.scrollTo({
                        top: newScrollTop,
                        behavior: scrollBehavior as ScrollBehavior,
                    });
                }
            }
            lastValidSegmentIndex.current = highlightIndex;
        }
    }, [highlightIndex]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
        <div ref={containerRef} className='overflow-y-auto h-full'>
            <div className='space-y-2'>
                {segments.map((segment, index) => (
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
