"use client";

import React, { useState, useEffect } from 'react';
import PageHeader from "@/components/PageHeader";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, HardDrive, Folder, FileText } from "lucide-react";

interface AudioFileWithDuration extends File {
  duration?: number;
}

interface Word {
  word: string;
  start: number;
  end: number;
}

interface Segment {
  segment_id: number;
  speaker: string;
  text: string;
  start: number;
  end: number;
  words: Word[];
  name: string;
}

interface TranscriptData {
  file: string;
  transcript: Segment[];
  num_speakers: number;
}

interface FolderStats {
  totalFiles: number;
  totalDuration: number;
  totalSegments: number;
  totalWords: number;
  uniqueSpeakers: {
    name: string;
    speaker: string;
    totalDuration: number;
    totalSegments: number;
    totalWords: number;
    filesAppearingIn: string[];
  }[];
}

export default function Transcribe2Page() {
  const [files, setFiles] = useState<AudioFileWithDuration[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [emailNotification, setEmailNotification] = useState(false);
  const [transcriptionData, setTranscriptionData] = useState<TranscriptData[] | null>(null);
  const [folderStats, setFolderStats] = useState<FolderStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Estimation function for transcription processing time
  const estimateProcessingTime = (durationInSeconds: number): number => {
    // Base processing time using logarithmic scaling with adjusted parameters
    // New reference points:
    // 2min (120s) total -> 4min (240s) processing
    // 25min (1500s) total -> 12min (720s) processing
    const baseTime = Math.log(durationInSeconds + 1) * 45;
    
    // Add GPU instance spin-up time and file transfer overhead (60 seconds)
    return baseTime + 60;
  };

  const getTotalEstimatedTime = (): number => {
    // Calculate individual processing times
    const processingTimes = files.map(file => 
      estimateProcessingTime(file.duration || 0)
    );
    
    // Files will be processed in parallel on the GPU, so we take the maximum time
    const maxProcessingTime = Math.max(...processingTimes, 0);
    
    return maxProcessingTime;
  };

  const getAudioDuration = async (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target?.result) {
          audio.src = e.target.result as string;
          audio.onloadedmetadata = () => {
            resolve(audio.duration);
          };
        }
      };
      
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileArray = Array.from(event.target.files);
      const filesWithDuration: AudioFileWithDuration[] = [];
      let total = 0;

      for (const file of fileArray) {
        const duration = await getAudioDuration(file);
        filesWithDuration.push(Object.assign(file, { duration }));
        total += duration;
      }

      setFiles(filesWithDuration);
      setTotalDuration(total);
    }
  };

  const calculateFolderStats = (transcripts: TranscriptData[]): FolderStats => {
    const stats: FolderStats = {
      totalFiles: transcripts.length,
      totalDuration: 0,
      totalSegments: 0,
      totalWords: 0,
      uniqueSpeakers: []
    };

    const speakerMap = new Map<string, {
      name: string;
      speaker: string;
      totalDuration: number;
      totalSegments: number;
      totalWords: number;
      filesAppearingIn: Set<string>;
    }>();

    transcripts.forEach(file => {
      // Get file duration from last segment's end time
      const fileDuration = file.transcript[file.transcript.length - 1]?.end || 0;
      stats.totalDuration += fileDuration;
      stats.totalSegments += file.transcript.length;
      
      file.transcript.forEach(segment => {
        stats.totalWords += segment.words?.length || 0;
        
        const existingSpeaker = speakerMap.get(segment.speaker);
        if (existingSpeaker) {
          existingSpeaker.totalDuration += segment.end - segment.start;
          existingSpeaker.totalSegments += 1;
          existingSpeaker.totalWords += segment.words?.length || 0;
          existingSpeaker.filesAppearingIn.add(file.file);
        } else {
          speakerMap.set(segment.speaker, {
            name: segment.name || "Unknown",
            speaker: segment.speaker,
            totalDuration: segment.end - segment.start,
            totalSegments: 1,
            totalWords: segment.words?.length || 0,
            filesAppearingIn: new Set([file.file])
          });
        }
      });
    });

    stats.uniqueSpeakers = Array.from(speakerMap.values()).map(speaker => ({
      ...speaker,
      filesAppearingIn: Array.from(speaker.filesAppearingIn)
    }));

    return stats;
  };

  const handleUpload = async () => {
    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(async () => {
      try {
        // Get list of all JSON files in the directory
        const filesResponse = await fetch('/api/list-transcripts');
        const { files } = await filesResponse.json();
        
        if (!files || files.length === 0) {
          throw new Error("No transcription files found in directory");
        }

        const transcripts: TranscriptData[] = [];
        
        // Load each transcription file
        for (const file of files) {
          try {
            const res = await fetch(`/json-transcription/${file}`);
            if (!res.ok) {
              console.error(`Failed to load ${file}: ${res.status} ${res.statusText}`);
              continue;
            }
            const jsonData = await res.json();
            if (jsonData) {
              transcripts.push(jsonData);
            }
          } catch (error) {
            console.error(`Error loading ${file}:`, error);
          }
        }

        if (transcripts.length === 0) {
          throw new Error("No transcription files could be loaded");
        }

        setTranscriptionData(transcripts);
        
        // Calculate folder stats
        const stats = calculateFolderStats(transcripts);
        setFolderStats(stats);
      } catch (error) {
        console.error("Error loading transcriptions:", error);
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  return (
    <BackgroundWrapper imagePath="/images/electric_timeline.png">
      <main className='flex min-h-screen flex-col items-center justify-between p-24 pt-9'>
        <div className='w-full max-w-7xl mx-auto relative'>
          <PageHeader />
          <div className='p-4'>
            <h1 className='text-2xl font-bold mb-4 text-white'>Upload Audio Files</h1>
            <div className="space-y-4">
              <input 
                type="file" 
                multiple 
                accept="audio/*" 
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-300
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100"
              />
              {files.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-lg font-semibold text-white mb-2">Selected Files:</h2>
                  <ul className="space-y-2 text-gray-300">
                    {files.map((file, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span>{file.name}</span>
                        <span className="text-[#45b7aa]">{formatDuration(file.duration || 0)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                    <p className="text-white flex justify-between items-center">
                      <span>Total Duration:</span>
                      <span className="text-[#45b7aa] font-semibold">{formatDuration(totalDuration)}</span>
                    </p>
                    <p className="text-white flex justify-between items-center">
                      <span>Estimated Processing Time:</span>
                      <span className="text-[#45b7aa] font-semibold">~{formatDuration(getTotalEstimatedTime())}</span>
                    </p>
                  </div>
                  
                  <div className="mt-8 text-center text-gray-300">
                    <p>Feel free to wait here or check back a little later.</p>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <Checkbox 
                      id="email-notification"
                      checked={emailNotification}
                      onCheckedChange={(checked: boolean) => setEmailNotification(checked)}
                    />
                    <label
                      htmlFor="email-notification"
                      className="text-sm text-gray-300 cursor-pointer"
                    >
                      Email me when transcriptions are complete
                    </label>
                  </div>
                  
                  <div className="mt-8 flex justify-center">
                    <Button 
                      onClick={handleUpload}
                      className="w-full md:w-auto"
                      disabled={files.length === 0 || isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Upload Files"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Transcript Analysis Section */}
            {transcriptionData && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-6 text-white">Transcription Results</h2>
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
                    {transcriptionData.map((fileData, index) => {
                      // Build speaker stats
                      const speakerSegments = fileData.transcript.reduce((acc, seg) => {
                        if (!acc[seg.speaker]) acc[seg.speaker] = [];
                        acc[seg.speaker].push(seg);
                        return acc;
                      }, {} as Record<string, Segment[]>);

                      const speakerStats = Object.entries(speakerSegments).map(([speaker, segments]) => {
                        const totalDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
                        const wordCount = segments.reduce((sum, seg) => sum + (seg.words?.length || 0), 0);
                        return {
                          speaker,
                          name: segments[0].name || "Unknown",
                          duration: totalDuration,
                          segments: segments.length,
                          words: wordCount,
                        };
                      });

                      const fileDuration = fileData.transcript[fileData.transcript.length - 1]?.end || 0;

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
                                    {formatDuration(fileDuration)}
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {speakerStats.map((stat) => (
                                  <div
                                    key={stat.speaker}
                                    className="flex items-center space-x-3 p-3 rounded-lg border border-gray-800 bg-black/30"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-semibold text-white">{stat.name}</h4>
                                        <Badge variant="secondary" className="bg-[#45b7aa] text-white">{stat.speaker}</Badge>
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {stat.segments} segments · {stat.words} words · {formatDuration(stat.duration)}
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
                                          {formatDuration(segment.start)} - {formatDuration(segment.end)}
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
                      );
                    })}
                  </TabsContent>

                  {/* FOLDER VIEW TAB */}
                  <TabsContent value="folder" className="space-y-4">
                    {folderStats && (
                      <Card className="bg-black/50 border-gray-800">
                        <CardHeader>
                          <CardTitle className="text-white">Folder Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Overall Stats */}
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="bg-black/30 border-gray-800">
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                                  <FileText className="w-4 h-4" />
                                  Total Files
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-[#45b7aa]">
                                  {folderStats.totalFiles}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-black/30 border-gray-800">
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                                  <Clock className="w-4 h-4" />
                                  Total Duration
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-[#45b7aa]">
                                  {formatDuration(folderStats.totalDuration)}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-black/30 border-gray-800">
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                                  <Users className="w-4 h-4" />
                                  Unique Speakers
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-[#45b7aa]">
                                  {folderStats.uniqueSpeakers.length}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-black/30 border-gray-800">
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
                                  <FileText className="w-4 h-4" />
                                  Total Words
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-[#45b7aa]">
                                  {folderStats.totalWords}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Speaker Analysis */}
                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-white">Speakers Across Files</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {folderStats.uniqueSpeakers.map((speaker) => (
                                <div
                                  key={speaker.speaker}
                                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-800 bg-black/30"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <h4 className="font-semibold text-white">{speaker.name}</h4>
                                      <Badge variant="secondary" className="bg-[#45b7aa] text-white">{speaker.speaker}</Badge>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {speaker.totalSegments} segments · {speaker.totalWords} words · {formatDuration(speaker.totalDuration)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Appears in {speaker.filesAppearingIn.length} file(s)
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* DRIVE VIEW TAB */}
                  <TabsContent value="drive">
                    <Card className="bg-black/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white">Drive Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-400">
                          Select a drive to view aggregated statistics across all files. (Coming soon)
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </main>
    </BackgroundWrapper>
  );
} 