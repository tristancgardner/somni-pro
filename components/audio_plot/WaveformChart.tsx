"use client";

import React, { useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, ChartConfiguration } from "chart.js";

interface WaveformChartProps {
    waveformData: number[];
    duration: number;
    currentTime: number;
    zoomRange: [number, number];
    setZoomRange: (range: [number, number]) => void;
    verticalScale: number;
    colorMap: string[];
    onPlayheadChange: (time: number) => void;
}

export const WaveformChart: React.FC<WaveformChartProps> = ({
    waveformData,
    duration,
    currentTime,
    zoomRange,
    setZoomRange,
    verticalScale,
    colorMap,
    onPlayheadChange,
}) => {
    const chartRef = useRef<ChartJS<
        "line",
        { x: number; y: number }[],
        number
    > | null>(null);

    const chartData = {
        labels: Array.from(
            { length: waveformData.length },
            (_, i) => i * (duration / waveformData.length)
        ),
        datasets: [
            {
                data: waveformData.flatMap((v, i) => [
                    { x: i * (duration / waveformData.length), y: -v },
                    { x: i * (duration / waveformData.length), y: v },
                ]),
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 0,
                fill: false,
                tension: 0,
                segment: {
                    borderColor: (ctx: any) =>
                        colorMap[Math.floor(ctx.p0DataIndex / 2)] ||
                        "rgba(200, 200, 200, 0.5)",
                },
            },
        ],
    };

    const chartOptions: ChartConfiguration<"line">["options"] = {
        responsive: true,
        maintainAspectRatio: false,
        // ... (other chart options as in your original code)
        // Be sure to handle zooming and playhead updates
    };

    useEffect(() => {
        if (chartRef.current) {
            const chart = chartRef.current;
            // Update chart scales and annotations based on props
        }
    }, [zoomRange, verticalScale, currentTime]);

    return (
        <div className='h-[300px] flex flex-col'>
            <div className='flex-grow relative'>
                <Line data={chartData} options={chartOptions} ref={chartRef} />
            </div>
        </div>
    );
};
