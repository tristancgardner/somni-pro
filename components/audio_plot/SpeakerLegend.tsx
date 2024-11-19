"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@/components/ui/popover";
import { Check } from "lucide-react";
import { SPEAKER_COLORS } from "@/components/audio_plot/constants";

interface SpeakerLegendProps {
    speakers: string[];
    speakerColors: Record<string, string>;
    updateSpeakerColor: (speaker: string, color: string) => void;
    updateSpeakerLabel: (oldLabel: string, newLabel: string) => void;
}

export const SpeakerLegend: React.FC<SpeakerLegendProps> = ({
    speakers,
    speakerColors,
    updateSpeakerColor,
    updateSpeakerLabel,
}) => {
    const [localLabels, setLocalLabels] = useState<Record<string, string>>({});

    useEffect(() => {
        setLocalLabels(
            Object.fromEntries(speakers.map((speaker) => [speaker, speaker]))
        );
    }, [speakers]);

    const handleInputChange = (speaker: string, value: string) => {
        setLocalLabels((prev) => ({ ...prev, [speaker]: value }));
    };

    const handleInputBlur = (speaker: string, value: string) => {
        const trimmedValue = value.trim();
        if (trimmedValue !== speaker) {
            updateSpeakerLabel(speaker, trimmedValue);
        }
    };

    return (
        <div className='mt-4'>
            <h3 className='text-sm font-semibold'>Speaker Labels</h3>
            <div className='flex flex-wrap justify-center gap-4'>
                {speakers.map((speaker) => (
                    <div key={speaker} className='flex items-center'>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant='outline'
                                    className='w-8 h-8 p-0 rounded-full'
                                    style={{
                                        backgroundColor: speakerColors[speaker],
                                    }}
                                />
                            </PopoverTrigger>
                            <PopoverContent className='w-64'>
                                <div className='grid grid-cols-4 gap-2'>
                                    {SPEAKER_COLORS.map((color) => (
                                        <Button
                                            key={color}
                                            className='w-8 h-8 p-0 rounded-full relative'
                                            style={{ backgroundColor: color }}
                                            onClick={() =>
                                                updateSpeakerColor(
                                                    speaker,
                                                    color
                                                )
                                            }
                                        >
                                            {color ===
                                                speakerColors[speaker] && (
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
                        <Input
                            value={localLabels[speaker] || ""}
                            onChange={(e) =>
                                handleInputChange(speaker, e.target.value)
                            }
                            onBlur={(e) =>
                                handleInputBlur(speaker, e.target.value)
                            }
                            className='w-32 text-sm p-2'
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
