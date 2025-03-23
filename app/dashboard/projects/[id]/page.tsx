import { FileUpload } from "@/components/file-upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Headphones, ListMusic, Settings, Users } from 'lucide-react'

// Example project data - we'll connect this to your API later
const project = {
  id: "1",
  name: "Marketing Campaign",
  description: "Q2 Marketing Campaign Interviews",
  createdAt: "2023-04-15T10:00:00Z",
  updatedAt: "2023-06-20T15:45:00Z",
  fileCount: 12,
  transcriptionCount: 8,
  collaborators: [
    { id: "1", name: "Alex Johnson", email: "alex@example.com" },
    { id: "2", name: "Sam Smith", email: "sam@example.com" },
    { id: "3", name: "Taylor Wilson", email: "taylor@example.com" },
  ],
}

// Example files data - we'll connect this to your API later
const files = [
  {
    id: "1",
    name: "Interview_001.mp3",
    size: 24.5, // MB
    duration: "32:15",
    uploadedAt: "2023-04-16T10:30:00Z",
    status: "transcribed",
  },
  {
    id: "2",
    name: "Focus_Group_Session.wav",
    size: 56.2, // MB
    duration: "1:12:45",
    uploadedAt: "2023-04-18T14:20:00Z",
    status: "transcribed",
  },
  {
    id: "3",
    name: "Customer_Feedback_Call.mp3",
    size: 18.7, // MB
    duration: "24:30",
    uploadedAt: "2023-04-20T09:15:00Z",
    status: "processing",
  },
]

export default function ProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Users className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="transcriptions">Transcriptions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Files</CardTitle>
                <Headphones className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.fileCount}</div>
                <p className="text-xs text-muted-foreground">Last upload 2 days ago</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transcriptions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.transcriptionCount}</div>
                <p className="text-xs text-muted-foreground">
                  {project.fileCount - project.transcriptionCount} pending
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collaborators</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{project.collaborators.length}</div>
                <p className="text-xs text-muted-foreground">Last joined 1 week ago</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
                <ListMusic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2h 9m</div>
                <p className="text-xs text-muted-foreground">Across all audio files</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Audio Files</CardTitle>
              <CardDescription>Upload audio files to transcribe and analyze.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload projectId={params.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Files</CardTitle>
              <CardDescription>Recently uploaded audio files in this project.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Headphones className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{file.size} MB</span>
                          <span>•</span>
                          <span>{file.duration}</span>
                          <span>•</span>
                          <span>Uploaded {new Date(file.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8" asChild>
                        <a href={`/dashboard/projects/${params.id}/files/${file.id}`}>View</a>
                      </Button>
                      <div
                        className={`px-2 py-1 text-xs rounded-full ${
                          file.status === "transcribed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        }`}
                      >
                        {file.status === "transcribed" ? "Transcribed" : "Processing"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Files</CardTitle>
              <CardDescription>Manage all audio files in this project.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This tab would contain a more detailed file management interface.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transcriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transcriptions</CardTitle>
              <CardDescription>View and manage transcriptions for this project.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This tab would contain the transcription management interface.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
              <CardDescription>Analytics and insights from your transcriptions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This tab would contain analytics and insights derived from transcriptions.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 