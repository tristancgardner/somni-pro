"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Settings } from "lucide-react";
import Link from "next/link";

export default function UserAuthStatus() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse"></div>;
  }
  
  if (!session) {
    // Show Sign In button when user is not logged in
    return (
      <div className="flex items-center px-3 py-1.5 rounded-lg bg-black/50 border border-gray-800 backdrop-blur-sm">
        <Link href="/login">
          <Button 
            variant="ghost"
            size="sm"
            className="text-sm text-white hover:text-[#45b7aa] hover:bg-transparent transition-colors"
          >
            Sign In
          </Button>
        </Link>
      </div>
    );
  }
  
  // User is logged in, show full auth status
  return (
    <div className="flex items-center px-3 py-1.5 rounded-lg bg-black/50 border border-gray-800 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Link href="/account/settings" className="flex items-center hover:text-[#45b7aa] transition-colors">
          <UserCircle className="h-5 w-5 text-[#45b7aa]" />
        </Link>
        <Badge variant="secondary" className="bg-[#45b7aa]/20 text-[#45b7aa] border border-[#45b7aa]/30 font-normal">
          {session.user?.name || session.user?.email}
        </Badge>
      </div>
      <div className="flex items-center">
        <Link href="/account/settings">
          <Button 
            variant="ghost"
            size="sm"
            className="ml-1 text-sm text-white hover:text-[#45b7aa] hover:bg-transparent transition-colors"
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </Link>
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="ml-1 text-sm text-white hover:text-[#45b7aa] hover:bg-transparent transition-colors"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
} 