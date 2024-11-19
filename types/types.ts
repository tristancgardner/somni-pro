// types.ts
export type Speaker = {
    originalLabel: string;
    currentLabel: string;
};

export type TranscriptionResult = {
    file_name: string;
    num_speakers: number;
    rttm_lines: string[];
    rttm_merged: string[];
    segments: Array<{
        speaker: string;
        start: number;
        end: number;
        text: string;
    }>;
    speakers: string[];
    transcript: string;
    speaker_colors?: Record<string, string>;
    speakerLegend?: Record<string, Speaker>;
    summary?: string;
};
