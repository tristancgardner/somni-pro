import React, { useMemo } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Segment = {
  speaker: string
  start: number
  end: number
  text: string
}

type SegmentsBySpeakerProps = {
  segments: Segment[]
  speakerColors: Record<string, string>
  onSegmentClick: (startTime: number) => void
}

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function SegmentsBySpeaker({ segments, speakerColors, onSegmentClick }: SegmentsBySpeakerProps) {
  const groupedSegments = useMemo(() => {
    return segments.reduce((acc, segment) => {
      if (!acc[segment.speaker]) {
        acc[segment.speaker] = []
      }
      acc[segment.speaker].push(segment)
      return acc
    }, {} as Record<string, Segment[]>)
  }, [segments])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Object.entries(groupedSegments).map(([speaker, speakerSegments]) => (
        <Card key={speaker} className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold" style={{ color: speakerColors[speaker] }}>
              {speaker}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] w-full rounded-md">
              <div className="space-y-2 p-4">
                {speakerSegments.map((segment, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-md cursor-pointer transition-colors hover:bg-gray-700"
                    style={{ borderLeft: `4px solid ${speakerColors[speaker]}` }}
                    onClick={() => onSegmentClick(segment.start)}
                  >
                    <div className="text-xs text-gray-400 mb-1">
                      {formatTime(segment.start)} - {formatTime(segment.end)}
                    </div>
                    <p className="text-sm text-gray-200">{segment.text}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
