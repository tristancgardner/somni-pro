"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { ProjectNav } from "@/components/project-nav"
import { ModeToggle } from "@/components/mode-toggle"
import UserAuthStatus from "@/components/auth/user-auth-status"

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname()

  // Check if we're in a project context
  const projectPathMatch = pathname.match(/\/dashboard\/projects\/([^/]+)/)
  const projectId = projectPathMatch ? projectPathMatch[1] : null
  const isInProjectContext = !!projectId

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl font-bold">Somni Pro</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <UserAuthStatus />
        </div>
      </header>
      <div className="flex-1 items-start md:grid md:grid-cols-[250px_1fr]">
        <aside className="fixed top-16 z-30 hidden h-[calc(100vh-4rem)] w-full shrink-0 border-r bg-background md:sticky md:block">
          <div className="flex h-full flex-col gap-2 p-4">
            {isInProjectContext ? <ProjectNav projectId={projectId} /> : <DashboardNav />}
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden bg-background p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
} 