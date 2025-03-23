import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Download, FileText, Headphones, Share2 } from "lucide-react"

// Example file data - we'll connect this to your API later
const file = {
  id: "1",
  name: "Interview_001.mp3",
  size: 24.5, // MB
  duration: "32:15",
  uploadedAt: "2023-04-16T10:30:00Z",
  projectId: "1",
  status: "transcribed",
  transcription: `
INTERVIEWER: Good morning, and thank you for joining us today. Could you start by introducing yourself and telling us a bit about your role?

PARTICIPANT: Good morning. My name is Sarah Johnson. I'm the Marketing Director at TechSolutions, where I've been working for the past four years. My team is responsible for all our digital marketing strategies, campaign planning, and market research.

INTERVIEWER: Excellent. Thank you, Sarah. Let's talk about your experience with our product. When did you first start using it, and what were your initial impressions?

PARTICIPANT: We started using your platform about eight months ago. Initially, we were looking for a solution that could help us better organize our marketing assets and streamline our campaign planning process. I remember being impressed by the user interface right away—it was much more intuitive than other solutions we had tried.

INTERVIEWER: That's great to hear. Could you walk me through how you typically use our product in your day-to-day work?

PARTICIPANT: Sure. We primarily use it for three main purposes. First, for campaign planning—the collaborative features make it easy for my team to work together on campaign strategies, even when we're remote. Second, we use the analytics dashboard quite heavily to track campaign performance and make data-driven decisions. And third, the content calendar has become essential for us to coordinate our content across different channels.

INTERVIEWER: And what would you say are the biggest benefits you've experienced since implementing our solution?

PARTICIPANT: The biggest impact has definitely been on our efficiency. We've reduced the time spent on campaign planning by about 30%, which is significant. The automation features have also eliminated a lot of the manual work we used to do. And having everything centralized in one platform has improved communication across our team and with other departments.

INTERVIEWER: That's fantastic feedback. Now, I'm also interested in hearing about any challenges or limitations you've encountered with our product.

PARTICIPANT: There are a few areas that could use improvement. The mobile app is somewhat limited compared to the desktop version—we often find ourselves needing to switch to our laptops to complete certain tasks. Also, the reporting features, while good, don't allow for the level of customization we sometimes need. We often end up exporting the data and creating custom reports in other tools.`,
  speakers: [
    { id: "speaker_1", name: "INTERVIEWER" },
    { id: "speaker_2", name: "PARTICIPANT" },
  ],
  insights: [
    { type: "key_topic", text: "Marketing strategy and campaign planning", confidence: 0.92 },
    { type: "key_topic", text: "Product usability and interface", confidence: 0.87 },
    { type: "key_topic", text: "Efficiency improvements", confidence: 0.83 },
    { type: "sentiment", text: "Positive regarding user interface", confidence: 0.78 },
    { type: "sentiment", text: "Mixed regarding mobile app functionality", confidence: 0.81 },
    { type: "action_item", text: "Improve mobile app functionality", confidence: 0.75 },
    { type: "action_item", text: "Enhance reporting customization", confidence: 0.82 },
  ],
}

export default function FileDetailPage({
  params,
}: {
  params: { id: string; fileId: string }
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/projects/${params.id}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{file.name}</h1>
            <p className="text-muted-foreground">
              {file.size} MB • {file.duration} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <Tabs defaultValue="transcription" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transcription">Transcription</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="transcription" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Transcription</CardTitle>
                <CardDescription>Full transcription with speaker detection</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                <FileText className="h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[500px] font-mono text-sm"
                readOnly
                value={file.transcription}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audio Player</CardTitle>
              <CardDescription>Listen to the original audio recording</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Headphones className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground">
                Audio player will be implemented in a future update.
                <br />
                This will integrate with your existing audio player functionality.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
              <CardDescription>Key topics, sentiment analysis, and action items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Key Topics</h3>
                  <div className="space-y-2">
                    {file.insights
                      .filter(insight => insight.type === "key_topic")
                      .map((insight, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-muted">
                          <span>{insight.text}</span>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Sentiment Analysis</h3>
                  <div className="space-y-2">
                    {file.insights
                      .filter(insight => insight.type === "sentiment")
                      .map((insight, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-muted">
                          <span>{insight.text}</span>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Action Items</h3>
                  <div className="space-y-2">
                    {file.insights
                      .filter(insight => insight.type === "action_item")
                      .map((insight, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded bg-muted">
                          <span>{insight.text}</span>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 