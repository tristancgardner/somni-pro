"use client";

import React, { useState, useEffect, useRef } from "react";
import { DraggableCore, DraggableEvent, DraggableData } from "react-draggable";
import { ScrollArea } from "@/components/ui/scroll-area";

type Segment = {
    id: string;
    speaker: string;
    start: number;
    end: number;
    text: string;
    position: number;
};

type DraggableSegmentTimelineProps = {
    segments: Omit<Segment, "position">[];
    speakerColors: Record<string, string>;
};

const SEGMENT_HEIGHT = 80;
const SEGMENT_PADDING = 10;
const TOTAL_SEGMENT_HEIGHT = SEGMENT_HEIGHT + SEGMENT_PADDING;

export function DraggableSegmentTimeline({
    segments: initialSegments,
    speakerColors,
}: DraggableSegmentTimelineProps) {
    const [segments, setSegments] = useState<Segment[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const draggedSegmentRef = useRef<string | null>(null);

    useEffect(() => {
        setSegments(initialSegments.map((segment, index) => ({
            ...segment,
            position: index * TOTAL_SEGMENT_HEIGHT
        })));
    }, [initialSegments]);

    const handleDragStart = (id: string) => {
        draggedSegmentRef.current = id;
    };

    const handleDrag = (e: DraggableEvent, data: DraggableData) => {
        if (!draggedSegmentRef.current) return;

        const draggedId = draggedSegmentRef.current;
        const deltaY = data.deltaY;

        setSegments((prevSegments) => {
            const draggedIndex = prevSegments.findIndex(s => s.id === draggedId);
            const updatedSegments = [...prevSegments];
            const draggedSegment = { ...updatedSegments[draggedIndex] };
            draggedSegment.position += deltaY;

            // Find the new index based on the dragged position
            const newIndex = updatedSegments.findIndex(s => s.position > draggedSegment.position);
            const finalIndex = newIndex === -1 ? updatedSegments.length - 1 : newIndex - 1;

            // Remove the dragged segment from its original position
            updatedSegments.splice(draggedIndex, 1);
            // Insert it at the new position
            updatedSegments.splice(finalIndex, 0, draggedSegment);

            // Update positions for all segments
            return updatedSegments.map((segment, index) => ({
                ...segment,
                position: index * TOTAL_SEGMENT_HEIGHT
            }));
        });
    };

    const handleDragStop = () => {
        draggedSegmentRef.current = null;
    };

    return (
        <div
            ref={containerRef}
            className="w-full bg-gray-900 rounded-lg overflow-hidden p-4 relative"
            style={{ height: `${segments.length * TOTAL_SEGMENT_HEIGHT}px` }}
        >
            {segments.map((segment) => (
                <DraggableCore
                    key={segment.id}
                    onStart={() => handleDragStart(segment.id)}
                    onDrag={handleDrag}
                    onStop={handleDragStop}
                >
                    <div
                        className="absolute cursor-move left-0 right-0"
                        style={{
                            transform: `translateY(${segment.position}px)`,
                            height: `${SEGMENT_HEIGHT}px`,
                            transition: 'transform 0.2s ease-out',
                        }}
                    >
                        <div
                            className="rounded overflow-hidden mx-2 h-full"
                            style={{
                                backgroundColor: speakerColors[segment.speaker] || "gray",
                                userSelect: "none",
                            }}
                        >
                            <ScrollArea className="h-full">
                                <div className="p-2">
                                    <p className="font-semibold">{segment.speaker}</p>
                                    <p className="text-sm">{segment.text}</p>
                                    <p className="text-xs text-gray-400">
                                        {formatTime(segment.start)} - {formatTime(segment.end)}
                                    </p>
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </DraggableCore>
            ))}
        </div>
    );
}

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
