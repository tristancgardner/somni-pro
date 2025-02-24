"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, HardDrive, Folder, FileText } from "lucide-react"
import React, { useEffect, useState } from "react"
import PageHeader from "@/components/PageHeader"
import BackgroundWrapper from "@/components/BackgroundWrapper"

interface Word {
  word: string
  start: number
  end: number
}

interface Segment {
  segment_id: number
  speaker: string
  text: string
  start: number
  end: number
  words: Word[]
  name: string
}

interface TranscriptData {
  file: string
  transcript: Segment[]
  num_speakers: number
}

export default function EightRollSummariesPage() {
  const [data, setData] = useState<TranscriptData[] | null>(null)

  // Fetch data from public/jsonFiles/example_ASR.json
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/jsonFiles/example_ASR.json")
        const jsonData = await res.json()
        // If the JSON contains only a single file, wrap it in an array for uniform handling
        setData(Array.isArray(jsonData) ? jsonData : [jsonData])
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [])

  if (!data) {
    return (
      <BackgroundWrapper imagePath="/images/electric_timeline.png">
        <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
          <div className='w-full max-w-7xl mx-auto relative'>
            <PageHeader />
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">Loading transcript data...</div>
              </CardContent>
            </Card>
          </div>
        </main>
      </BackgroundWrapper>
    )
  }

  // Helper to format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <BackgroundWrapper imagePath="/images/electric_timeline.png">
      <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
        <div className='w-full max-w-7xl mx-auto relative'>
          <PageHeader />
          <div className="container mx-auto space-y-6">
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="file">
                  <FileText className="w-4 h-4 mr-2" />
                  File View
                </TabsTrigger>
                <TabsTrigger value="folder">
                  <Folder className="w-4 h-4 mr-2" />
                  Folder View
                </TabsTrigger>
                <TabsTrigger value="drive">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Drive View
                </TabsTrigger>
              </TabsList>

              {/* FILE VIEW TAB */}
              <TabsContent value="file" className="space-y-4">
                {data.map((fileData, index) => {
                  // Build speaker stats
                  const speakerSegments = fileData.transcript.reduce((acc, seg) => {
                    if (!acc[seg.speaker]) acc[seg.speaker] = []
                    acc[seg.speaker].push(seg)
                    return acc
                  }, {} as Record<string, Segment[]>)

                  const speakerStats = Object.entries(speakerSegments).map(([speaker, segments]) => {
                    const totalDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0)
                    const wordCount = segments.reduce((sum, seg) => sum + (seg.words?.length || 0), 0)
                    return {
                      speaker,
                      name: segments[0].name || "Unknown",
                      duration: totalDuration,
                      segments: segments.length,
                      words: wordCount,
                    }
                  })

                  // Overall file duration might be the end time of the last segment
                  const fileDuration = fileData.transcript[fileData.transcript.length - 1]?.end || 0

                  return (
                    <Card key={index} className="bg-black/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                          <FileText className="w-5 h-5" />
                          {fileData.file}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <Card className="bg-black/30 border-gray-800">
                            <CardHeader className="p-4">
                              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                                <Clock className="w-4 h-4" />
                                Duration
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="text-2xl font-bold text-[#45b7aa]">
                                {formatTime(fileDuration)}
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-black/30 border-gray-800">
                            <CardHeader className="p-4">
                              <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                                <Users className="w-4 h-4" />
                                Speakers
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="text-2xl font-bold text-[#45b7aa]">{fileData.num_speakers}</div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="mt-6">
                          <h2 className="text-lg font-semibold mb-2 text-white">Speaker Analysis</h2>
                          <div className="grid gap-4">
                            {speakerStats.map((stat) => (
                              <div
                                key={stat.speaker}
                                className="flex items-start space-x-4 p-4 rounded-lg border border-gray-800 bg-black/30"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white">{stat.name}</h4>
                                    <Badge variant="secondary" className="bg-[#45b7aa] text-white">{stat.speaker}</Badge>
                                  </div>
                                  <div className="text-sm text-gray-400 mt-1">
                                    {stat.segments} segments · {stat.words} words ·{" "}
                                    {formatTime(stat.duration)} duration
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6">
                          <h2 className="text-lg font-semibold mb-2 text-white">Transcript Timeline</h2>
                          <ScrollArea className="h-[300px] md:h-[400px]">
                            <div className="space-y-4">
                              {fileData.transcript.map((segment) => (
                                <div
                                  key={segment.segment_id}
                                  className="p-4 rounded-lg border border-gray-800 bg-black/30"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-[#45b7aa] text-white">{segment.speaker}</Badge>
                                    <span className="text-sm text-gray-400">
                                      {formatTime(segment.start)} - {formatTime(segment.end)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-300">{segment.text}</p>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </TabsContent>

              {/* FOLDER VIEW TAB */}
              <TabsContent value="folder">
                <Card className="bg-black/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Folder Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">
                      Select a folder to view aggregated statistics across multiple files. (Placeholder)
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DRIVE VIEW TAB */}
              <TabsContent value="drive">
                <Card className="bg-black/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Drive Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">
                      Select a drive to view aggregated statistics across all files. (Placeholder)
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </BackgroundWrapper>
  )
} 