import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, FileText, Headphones, Plus, Users } from "lucide-react"

// Example data - we'll connect this to your API later
const stats = {
  totalProjects: 3,
  totalFiles: 25,
  totalTranscriptions: 18,
  transcriptionMinutes: 246,
}

// Example recent projects - we'll connect this to your API later
const recentProjects = [
  {
    id: "1",
    name: "Marketing Campaign",
    description: "Q2 Marketing Campaign Interviews",
    updatedAt: "2023-06-20T15:45:00Z",
    fileCount: 12,
  },
  {
    id: "2",
    name: "Product Research",
    description: "User Feedback Sessions for New Features",
    updatedAt: "2023-06-18T11:20:00Z",
    fileCount: 8,
  },
]

// Example recent files - we'll connect this to your API later
const recentFiles = [
  {
    id: "1",
    name: "Interview_001.mp3",
    duration: "32:15",
    uploadedAt: "2023-06-19T10:30:00Z",
    projectId: "1",
    projectName: "Marketing Campaign",
    status: "transcribed",
  },
  {
    id: "2",
    name: "Focus_Group_Session.wav",
    duration: "1:12:45",
    uploadedAt: "2023-06-18T14:20:00Z",
    projectId: "1",
    projectName: "Marketing Campaign",
    status: "transcribed",
  },
  {
    id: "3",
    name: "Customer_Feedback_Call.mp3",
    duration: "24:30",
    uploadedAt: "2023-06-17T09:15:00Z",
    projectId: "2",
    projectName: "Product Research",
    status: "processing",
  },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your transcription projects and recent activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalProjects} different workspaces
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audio Files</CardTitle>
            <Headphones className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalFiles - stats.totalTranscriptions} pending transcription
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transcriptions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTranscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.totalTranscriptions / stats.totalFiles) * 100)}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(stats.transcriptionMinutes / 60)}h {stats.transcriptionMinutes % 60}m
            </div>
            <p className="text-xs text-muted-foreground">
              Of transcribed audio content
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>
                Your most recently updated projects.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/projects">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between space-x-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {project.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Headphones className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{project.fileCount}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/projects">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Files</CardTitle>
              <CardDescription>
                Your most recently uploaded audio files.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between space-x-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Headphones className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Link
                        href={`/dashboard/projects/${file.projectId}/files/${file.id}`}
                        className="font-medium hover:underline"
                      >
                        {file.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {file.projectName} • {file.duration}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
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
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 