"use client";

import React, { useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";

interface AudioPlayerProps {
    audioFileUrl: string;
    currentTime: number;
    setCurrentTime: (time: number) => void;
    duration: number;
    setDuration: (duration: number) => void;
    playbackRate: number;
    setPlaybackRate: (rate: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
    audioFileUrl,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    playbackRate,
    setPlaybackRate,
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);

    useEffect(() => {
        if (audioFileUrl) {
            const audio = new Audio(audioFileUrl);
            audioRef.current = audio;

            audio.addEventListener("loadedmetadata", () => {
                setDuration(audio.duration);
            });

            audio.addEventListener("timeupdate", () => {
                setCurrentTime(audio.currentTime);
            });
        }
    }, [audioFileUrl]);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.playbackRate = playbackRate;
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSliderChange = (newValue: number[]) => {
        const newTime = newValue[0];
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
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

    const jumpToBeginning = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
        }
    };

    const jumpToEnd = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = duration;
            setCurrentTime(duration);
        }
    };

    const cyclePlaybackSpeed = () => {
        if (audioRef.current) {
            const newRate =
                playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
            audioRef.current.playbackRate = newRate;
            setPlaybackRate(newRate);
        }
    };

    return (
        <div>
            <div className='space-y-2'>
                <div className='space-y-1'>
                    <label
                        htmlFor='full-file-slider'
                        className='text-sm font-medium'
                    >
                        Global Timeline
                    </label>
                    <div className='flex items-center space-x-2'>
                        <span className='text-sm'>{formatTime(0)}</span>
                        <Slider
                            id='full-file-slider'
                            value={[currentTime]}
                            min={0}
                            max={duration}
                            step={0.1}
                            onValueChange={handleSliderChange}
                            className='flex-grow'
                        />
                        <span className='text-sm'>{formatTime(duration)}</span>
                    </div>
                    <div className='text-center'>
                        <span className='text-sm font-medium'>
                            {formatTime(currentTime)}
                        </span>
                    </div>
                </div>
                <div className='flex justify-center items-center space-x-4'>
                    <div className='flex items-center space-x-2'>
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
                            aria-label={isPlaying ? "Pause" : "Play"}
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
                            aria-label={volume === 0 ? "Unmute" : "Mute"}
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
        </div>
    );
};
