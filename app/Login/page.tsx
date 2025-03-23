"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Github } from 'lucide-react';
import Image from "next/image";
import { Logo } from "@/components/logo";

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const loginWithGoogle = async () => {
        setIsLoading(true);
        try {
            await signIn("google", { callbackUrl: "/dashboard" });
        } catch (error) {
            console.error("Login failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithGithub = async () => {
        setIsLoading(true);
        try {
            await signIn("github", { callbackUrl: "/dashboard" });
        } catch (error) {
            console.error("Login failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <Logo size={48} />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Sign in to SOMNI Pro</CardTitle>
                    <CardDescription>Choose your preferred sign in method</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Button
                        variant="outline"
                        onClick={loginWithGoogle}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2"
                    >
                        <Image src="/google-logo.svg" width={16} height={16} alt="Google" className="h-4 w-4" />
                        Sign in with Google
                    </Button>
                    <Button
                        variant="outline"
                        onClick={loginWithGithub}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2"
                    >
                        <Github className="h-4 w-4" />
                        Sign in with GitHub
                    </Button>
                </CardContent>
                <CardFooter className="flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">
                        By signing in, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
