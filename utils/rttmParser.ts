export interface RTTMSegment {
    start: number;
    duration: number;
    speaker: string;
}

export function parseRTTM(rttmLines: string[]): RTTMSegment[] {
    return rttmLines.map(line => {
        const parts = line.trim().split(' ');
        return {
            start: parseFloat(parts[3]),
            duration: parseFloat(parts[4]),
            speaker: parts[7]
        };
    });
}
