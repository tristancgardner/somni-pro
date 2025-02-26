"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  
  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>;
  }
  
  if (status === "authenticated") {
    return <>{children}</>;
  }
  
  return null;
} 