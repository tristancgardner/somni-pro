"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle } from "lucide-react";

export default function UserAuthStatus() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse"></div>;
  }
  
  if (!session) {
    return null; // Don't show anything if not logged in
  }
  
  return (
    <div className="flex items-center px-3 py-1.5 rounded-lg bg-black/50 border border-gray-800 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <UserCircle className="h-5 w-5 text-[#45b7aa]" />
        <Badge variant="secondary" className="bg-[#45b7aa]/20 text-[#45b7aa] border border-[#45b7aa]/30 font-normal">
          {session.user?.name || session.user?.email}
        </Badge>
      </div>
      <Button 
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="ml-2 text-sm text-white hover:text-[#45b7aa] hover:bg-transparent transition-colors"
      >
        Sign out
      </Button>
    </div>
  );
} 