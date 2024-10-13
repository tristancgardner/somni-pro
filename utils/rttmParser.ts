export interface RTTMSegment {
    start: number;
    duration: number;
    speaker: string;
}

export function parseRTTM(rttmContent: string): RTTMSegment[] {
    const lines = rttmContent.trim().split('\n');
    return lines.map(line => {
        const parts = line.split(' ');
        return {
            start: parseFloat(parts[3]),
            duration: parseFloat(parts[4]),
            speaker: parts[7]
        };
    });
}
