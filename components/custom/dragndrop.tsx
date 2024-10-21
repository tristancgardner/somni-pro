import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
    DroppableProvided,
    DraggableProvided,
} from "react-beautiful-dnd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

type Segment = {
    id: string;
    speaker: string;
    start: number;
    end: number;
    text: string;
};

type DraggableSegmentTimelineProps = {
    segments: Segment[];
    speakerColors: Record<string, string>;
};

const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
};

export function DraggableSegmentTimeline({
    segments: initialSegments,
    speakerColors,
}: DraggableSegmentTimelineProps) {
    const [segments, setSegments] = useState(initialSegments);

    useEffect(() => {
        setSegments(initialSegments);
    }, [initialSegments]);

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(segments);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setSegments(items);
    };

    const downloadReorderedSegments = () => {
        const reorderedData = segments.map((segment, index) => ({
            ...segment,
            start: index > 0 ? segments[index - 1].end : 0,
            end:
                index > 0
                    ? segments[index - 1].end + (segment.end - segment.start)
                    : segment.end - segment.start,
        }));

        const jsonContent = JSON.stringify(reorderedData, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "reordered_segments.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className='w-full bg-gray-900 rounded-lg overflow-hidden p-4'>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId='segments'>
                    {(provided: DroppableProvided) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                        >
                            {segments.map((segment, index) => (
                                <Draggable
                                    key={segment.id}
                                    draggableId={segment.id}
                                    index={index}
                                >
                                    {(provided: DraggableProvided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className='mb-2'
                                        >
                                            <motion.div
                                                className='rounded overflow-hidden cursor-move'
                                                style={{
                                                    backgroundColor:
                                                        speakerColors[
                                                            segment.speaker
                                                        ] || "gray",
                                                }}
                                            >
                                                <ScrollArea className='h-full'>
                                                    <div className='p-3 text-sm text-white'>
                                                        <span className='font-bold'>
                                                            {segment.speaker}:{" "}
                                                        </span>
                                                        <span className='text-xs'>
                                                            (
                                                            {formatTime(
                                                                segment.start
                                                            )}{" "}
                                                            -{" "}
                                                            {formatTime(
                                                                segment.end
                                                            )}
                                                            )
                                                        </span>
                                                        <br />
                                                        {segment.text}
                                                    </div>
                                                </ScrollArea>
                                            </motion.div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <Button onClick={downloadReorderedSegments} className='mt-4'>
                Download Reordered Segments
            </Button>
        </div>
    );
}
