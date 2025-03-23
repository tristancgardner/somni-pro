"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, FolderOpen, CreditCard, BarChart2, HelpCircle, Settings, BookOpen } from 'lucide-react'

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start gap-2">
      <Link href="/dashboard" prefetch={false}>
        <Button
          variant="ghost"
          className={cn("w-full justify-start font-normal", pathname === "/dashboard" && "bg-muted font-medium")}
        >
          <LayoutDashboard className="mr-3 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/dashboard/projects" prefetch={false}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal",
            pathname?.startsWith("/dashboard/projects") && "bg-muted font-medium",
          )}
        >
          <FolderOpen className="mr-3 h-4 w-4" />
          Projects
        </Button>
      </Link>
      <Link href="/dashboard/billing" prefetch={false}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal",
            pathname?.startsWith("/dashboard/billing") && "bg-muted font-medium",
          )}
        >
          <CreditCard className="mr-3 h-4 w-4" />
          Billing
        </Button>
      </Link>
      <Link href="/dashboard/usage" prefetch={false}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal",
            pathname?.startsWith("/dashboard/usage") && "bg-muted font-medium",
          )}
        >
          <BarChart2 className="mr-3 h-4 w-4" />
          Usage
        </Button>
      </Link>
      <Link href="/dashboard/tutorials" prefetch={false}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal",
            pathname?.startsWith("/dashboard/tutorials") && "bg-muted font-medium",
          )}
        >
          <BookOpen className="mr-3 h-4 w-4" />
          Tutorials
        </Button>
      </Link>
      <Link href="/dashboard/help" prefetch={false}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal",
            pathname?.startsWith("/dashboard/help") && "bg-muted font-medium",
          )}
        >
          <HelpCircle className="mr-3 h-4 w-4" />
          Help & Support
        </Button>
      </Link>
      <Link href="/dashboard/settings" prefetch={false}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal",
            pathname?.startsWith("/dashboard/settings") && "bg-muted font-medium",
          )}
        >
          <Settings className="mr-3 h-4 w-4" />
          Settings
        </Button>
      </Link>
    </nav>
  )
} 