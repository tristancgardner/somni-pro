"use client"

import { useEffect, useState } from "react"
import { FileText, Folder, HardDrive } from "lucide-react"
import Navigation from "@/components/Navigation"

interface SummaryData {
  [key: string]: any
}

interface RecursiveDisplayProps {
  data: any
}

// A recursive component to elegantly display nested JSON data
const RecursiveDisplay = ({ data }: RecursiveDisplayProps) => {
  if (data === null) return <span className="text-gray-400 text-sm">null</span>
  if (typeof data === 'undefined') return <span className="text-gray-400 text-sm">undefined</span>

  if (typeof data !== 'object') return <span className="text-gray-100 text-sm">{data.toString()}</span>

  if (Array.isArray(data)) {
    return (
      <ol className="list-decimal pl-5 mt-1">
        {data.map((item, idx) => (
          <li key={idx}>
            <RecursiveDisplay data={item} />
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ul className="list-disc pl-5 mt-1">
      {Object.entries(data).map(([key, value]) => (
        <li key={key} className="text-gray-400 text-sm">
          <span className="font-semibold text-gray-200">{key}: </span>
          <RecursiveDisplay data={value} />
        </li>
      ))}
    </ul>
  )
}

interface DataCardProps {
  title: string
  content: any
}

// A card component to display each summary or storyline
const DataCard = ({ title, content }: DataCardProps) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md">
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <div className="text-gray-300 text-sm">
        <RecursiveDisplay data={content} />
      </div>
    </div>
  )
}

export default function SummariesAndStorylines() {
  const [fileSummaries, setFileSummaries] = useState<SummaryData | null>(null)
  const [fileStorylines, setFileStorylines] = useState<SummaryData | null>(null)
  const [folderSummaries, setFolderSummaries] = useState<SummaryData | null>(null)
  const [folderStorylines, setFolderStorylines] = useState<SummaryData | null>(null)
  const [masterSummary, setMasterSummary] = useState<string | null>(null)
  const [masterStoryline, setMasterStoryline] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'file' | 'folder' | 'master'>('file')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [
          fileSummariesRes,
          fileStorylinesRes,
          folderSummariesRes,
          folderStorylinesRes,
          masterSummaryRes,
          masterStorylineRes,
        ] = await Promise.all([
          fetch("/json-summaries/file_summaries.json"),
          fetch("/json-summaries/file_storylines.json"),
          fetch("/json-summaries/folder_summaries.json"),
          fetch("/json-summaries/folder_storylines.json"),
          fetch("/json-summaries/master_summary.json"),
          fetch("/json-summaries/master_storyline.json"),
        ])

        const [
          fileSummariesData,
          fileStorylinesData,
          folderSummariesData,
          folderStorylinesData,
          masterSummaryData,
          masterStorylineData,
        ] = await Promise.all([
          fileSummariesRes.json(),
          fileStorylinesRes.json(),
          folderSummariesRes.json(),
          folderStorylinesRes.json(),
          masterSummaryRes.json(),
          masterStorylineRes.json(),
        ])

        setFileSummaries(fileSummariesData)
        setFileStorylines(fileStorylinesData)
        setFolderSummaries(folderSummariesData)
        setFolderStorylines(folderStorylinesData)
        setMasterSummary(masterSummaryData)
        setMasterStoryline(masterStorylineData)
      } catch (err) {
        console.error("Error fetching JSON data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, [])

  const renderDataTabs = () => {
    if (activeTab === 'master') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Master Summary</h2>
            <div className="bg-gray-800 rounded-lg p-4">
              {masterSummary ? (
                <p className="text-gray-300 text-sm">{masterSummary}</p>
              ) : (
                <p className="text-gray-400 text-sm">No summary available</p>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Master Storyline</h2>
            <div className="bg-gray-800 rounded-lg p-4">
              {masterStoryline ? (
                <p className="text-gray-300 text-sm">{masterStoryline}</p>
              ) : (
                <p className="text-gray-400 text-sm">No storyline available</p>
              )}
            </div>
          </div>
        </div>
      )
    }

    // For File and Folder tabs
    const summaries = activeTab === 'file' ? fileSummaries : folderSummaries
    const storylines = activeTab === 'file' ? fileStorylines : folderStorylines
    const tabLabel = activeTab === 'file' ? 'File' : 'Folder'

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">{tabLabel} Summaries (JSON)</h2>
          <div className="space-y-6">
            {summaries ? (
              Object.entries(summaries).map(([key, summary]) => (
                <DataCard key={key} title={key} content={summary} />
              ))
            ) : (
              <p className="text-gray-400 text-sm">No summaries available</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">{tabLabel} Storylines (JSON)</h2>
          <div className="space-y-6">
            {storylines ? (
              Object.entries(storylines).map(([key, storyline]) => (
                <DataCard key={key} title={key} content={storyline} />
              ))
            ) : (
              <p className="text-gray-400 text-sm">No storylines available</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <img src="/branding/Logo_White.svg" alt="Somni" className="h-8" />
          <Navigation />
        </div>
        <h1 className="text-4xl font-bold text-white mb-8">Summaries & Storylines</h1>
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${activeTab === 'file' ? "bg-teal-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
          >
            <FileText className="w-5 h-5" />
            <span>File Level</span>
          </button>
          <button
            onClick={() => setActiveTab('folder')}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${activeTab === 'folder' ? "bg-teal-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
          >
            <Folder className="w-5 h-5" />
            <span>Folder Level</span>
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${activeTab === 'master' ? "bg-teal-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
          >
            <HardDrive className="w-5 h-5" />
            <span>Master Level</span>
          </button>
        </div>
        {isLoading ? (
          <div className="text-white text-center py-8">Loading...</div>
        ) : (
          renderDataTabs()
        )}
      </div>
    </div>
  )
} 