"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FaGoogle, FaGithub } from "react-icons/fa";

export default function Login() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSocialLogin = async (provider: "google" | "github") => {
        setIsLoading(true);
        try {
            await signIn(provider, { callbackUrl: "/transcribe" });
        } catch (error) {
            console.error("Failed to sign in:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='w-full max-w-md mx-auto'>
            <Card>
                <CardHeader>
                    <CardTitle className='text-white'>Sign In</CardTitle>
                    <CardDescription>
                        Choose a social provider to sign in
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='grid grid-cols-1 gap-4'>
                        <Button
                            variant='outline'
                            onClick={() => handleSocialLogin("google")}
                            disabled={isLoading}
                            className='py-6'
                        >
                            <FaGoogle className='mr-2 h-5 w-5' />
                            Continue with Google
                        </Button>
                        <Button
                            variant='outline'
                            onClick={() => handleSocialLogin("github")}
                            disabled={isLoading}
                            className='py-6'
                        >
                            <FaGithub className='mr-2 h-5 w-5' />
                            Continue with GitHub
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
