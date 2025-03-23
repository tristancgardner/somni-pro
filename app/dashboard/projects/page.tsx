import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, FileText, FolderPlus, Headphones, Plus, Users } from "lucide-react"

// Example projects data - we'll connect this to your API later
const projects = [
  {
    id: "1",
    name: "Marketing Campaign",
    description: "Q2 Marketing Campaign Interviews",
    createdAt: "2023-04-15T10:00:00Z",
    updatedAt: "2023-06-20T15:45:00Z",
    fileCount: 12,
    transcriptionCount: 8,
    collaborators: 3,
  },
  {
    id: "2",
    name: "Product Research",
    description: "User Feedback Sessions for New Features",
    createdAt: "2023-05-10T14:30:00Z",
    updatedAt: "2023-06-18T11:20:00Z",
    fileCount: 8,
    transcriptionCount: 7,
    collaborators: 4,
  },
  {
    id: "3",
    name: "Customer Interviews",
    description: "Q3 Customer Satisfaction Interviews",
    createdAt: "2023-06-05T09:15:00Z",
    updatedAt: "2023-06-15T16:30:00Z",
    fileCount: 5,
    transcriptionCount: 3,
    collaborators: 2,
  },
]

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your audio files and transcriptions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input id="project-name" placeholder="Enter project name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea id="project-description" placeholder="Enter project description" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center h-80 border-dashed">
          <CardContent className="flex flex-col items-center justify-center pt-6">
            <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium text-center mb-2">Create New Project</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Organize your audio files and transcriptions in a new project
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project to organize your audio files and transcriptions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name-dialog">Project Name</Label>
                    <Input id="project-name-dialog" placeholder="Enter project name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-description-dialog">Description</Label>
                    <Textarea id="project-description-dialog" placeholder="Enter project description" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Project</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        
        {projects.map((project) => (
          <Card key={project.id} className="flex flex-col h-80">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{project.fileCount} Files</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{project.transcriptionCount} Transcriptions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{project.collaborators} Collaborators</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button variant="outline" asChild className="w-full">
                <Link href={`/dashboard/projects/${project.id}`}>View Project</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
} 