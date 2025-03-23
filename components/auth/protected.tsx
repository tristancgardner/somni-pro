"use client";

import { useSession } from "next-auth/react";
import type React from "react";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from 'lucide-react'

export default function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  
  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (status === "authenticated") {
    return <>{children}</>;
  }
  
  return null;
} 