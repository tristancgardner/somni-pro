"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileText, Headphones, BarChart, Users, Settings, ArrowLeft } from 'lucide-react'

interface ProjectNavProps {
  projectId: string
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      <div className="px-4 py-2">
        <Link href="/dashboard/projects" prefetch={false}>
          <Button variant="ghost" size="sm" className="mb-4 pl-0 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>

      <nav className="grid items-start gap-2">
        <Link href={`/dashboard/projects/${projectId}`} prefetch={false}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              pathname === `/dashboard/projects/${projectId}` && "bg-muted font-medium",
            )}
          >
            <FileText className="mr-3 h-4 w-4" />
            Overview
          </Button>
        </Link>
        <Link href={`/dashboard/projects/${projectId}/files`} prefetch={false}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              pathname?.startsWith(`/dashboard/projects/${projectId}/files`) && "bg-muted font-medium",
            )}
          >
            <FileText className="mr-3 h-4 w-4" />
            Files
          </Button>
        </Link>
        <Link href={`/dashboard/projects/${projectId}/transcripts`} prefetch={false}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              pathname?.startsWith(`/dashboard/projects/${projectId}/transcripts`) && "bg-muted font-medium",
            )}
          >
            <Headphones className="mr-3 h-4 w-4" />
            Transcripts
          </Button>
        </Link>
        <Link href={`/dashboard/projects/${projectId}/insights`} prefetch={false}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              pathname?.startsWith(`/dashboard/projects/${projectId}/insights`) && "bg-muted font-medium",
            )}
          >
            <BarChart className="mr-3 h-4 w-4" />
            Insights
          </Button>
        </Link>
        <Link href={`/dashboard/projects/${projectId}/speaker-id`} prefetch={false}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              pathname?.startsWith(`/dashboard/projects/${projectId}/speaker-id`) && "bg-muted font-medium",
            )}
          >
            <Users className="mr-3 h-4 w-4" />
            Speaker ID
          </Button>
        </Link>
        <Link href={`/dashboard/projects/${projectId}/settings`} prefetch={false}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              pathname?.startsWith(`/dashboard/projects/${projectId}/settings`) && "bg-muted font-medium",
            )}
          >
            <Settings className="mr-3 h-4 w-4" />
            Project Settings
          </Button>
        </Link>
      </nav>
    </div>
  )
} 