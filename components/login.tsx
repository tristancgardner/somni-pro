"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FaGoogle, FaGithub } from "react-icons/fa";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (result?.error) {
                throw new Error(result.error);
            }

            router.push("/transcribe");
        } catch (error) {
            console.error("Failed to sign in:", error);
            // Here you would typically show an error message to the user
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: "google" | "github") => {
        setIsLoading(true);
        try {
            await signIn(provider, { callbackUrl: "/transcribe" });
        } catch (error) {
            console.error("Failed to sign in:", error);
            // Here you would typically show an error message to the user
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
                        Sign in to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='email'>Email</Label>
                            <Input
                                id='email'
                                type='email'
                                placeholder='Enter your email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='password'>Password</Label>
                            <Input
                                id='password'
                                type='password'
                                placeholder='Enter your password'
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button
                            type='submit'
                            className='w-full'
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>

                    <div className='relative my-4'>
                        <div className='absolute inset-0 flex items-center'>
                            <span className='w-full border-t' />
                        </div>
                        <div className='relative flex justify-center text-xs uppercase'>
                            <span className='bg-background px-2 text-muted-foreground'>
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <Button
                            variant='outline'
                            onClick={() => handleSocialLogin("google")}
                            disabled={isLoading}
                        >
                            <FaGoogle className='mr-2 h-4 w-4' />
                            Google
                        </Button>
                        <Button
                            variant='outline'
                            onClick={() => handleSocialLogin("github")}
                            disabled={isLoading}
                        >
                            <FaGithub className='mr-2 h-4 w-4' />
                            GitHub
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className='text-sm text-muted-foreground text-center w-full'>
                        Don't have an account?{" "}
                        <a
                            href='/signup'
                            className='text-primary hover:underline'
                        >
                            Sign up
                        </a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
