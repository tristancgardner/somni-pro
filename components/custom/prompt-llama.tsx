import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { promptLlama } from "@/app/api/llama";
import ReactMarkdown from "react-markdown";
import { ReactNode } from "react";

interface MarkdownProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: ReactNode;
    [key: string]: any;
}

export default function PromptLlama() {
    const [systemPrompt, setSystemPrompt] = useState(
        "You are a helpful assistant"
    );
    const [userPrompt, setUserPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string>("");

    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            setResponse("");
            const result = await promptLlama(systemPrompt, userPrompt);
            setResponse(result as string);
        } catch (error) {
            console.error("Error connecting to Llama:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const markdownComponents = {
        code: ({ node, inline, className, children, ...props }: MarkdownProps) => {
            if (inline) {
                return (
                    <code
                        className='bg-muted px-1 py-0.5 rounded text-sm'
                        {...props}
                    >
                        {children}
                    </code>
                );
            }
            return (
                <pre className='bg-muted p-4 rounded-lg overflow-x-auto my-4'>
                    <code className='text-sm' {...props}>
                        {children}
                    </code>
                </pre>
            );
        },
        a: ({ node, className, children, ...props }: MarkdownProps) => {
            return (
                <a
                    className='text-primary hover:underline'
                    target='_blank'
                    rel='noopener noreferrer'
                    {...props}
                >
                    {children}
                </a>
            );
        },
        p: ({ node, className, children, ...props }: MarkdownProps) => {
            return (
                <p className='text-base leading-7 my-6 first:mt-0 last:mb-0' {...props}>
                    {children}
                </p>
            );
        },
        h1: ({ node, children, ...props }: MarkdownProps) => (
            <h1 className='text-2xl font-bold tracking-tight mt-8 mb-4' {...props}>
                {children}
            </h1>
        ),
        h2: ({ node, children, ...props }: MarkdownProps) => (
            <h2 className='text-xl font-semibold tracking-tight mt-8 mb-4' {...props}>
                {children}
            </h2>
        ),
        h3: ({ node, children, ...props }: MarkdownProps) => (
            <h3 className='text-lg font-semibold tracking-tight mt-6 mb-4' {...props}>
                {children}
            </h3>
        ),
        ul: ({ node, children, ...props }: MarkdownProps) => (
            <ul className='list-disc list-outside ml-6 my-6 space-y-2' {...props}>
                {children}
            </ul>
        ),
        ol: ({ node, children, ...props }: MarkdownProps) => (
            <ol className='list-decimal list-outside ml-6 my-6 space-y-2' {...props}>
                {children}
            </ol>
        ),
        li: ({ node, children, ...props }: MarkdownProps) => (
            <li className='leading-7' {...props}>
                {children}
            </li>
        ),
    };

    return (
        <Card className='card mb-4'>
            <CardHeader>
                <CardTitle>Prompt Llama</CardTitle>
                <CardDescription>
                    Configure your system and user prompts
                </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                <div className='space-y-2'>
                    <Label htmlFor='system-prompt'>System Prompt</Label>
                    <Textarea
                        id='system-prompt'
                        placeholder='Enter system prompt...'
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className='min-h-[100px]'
                    />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor='user-prompt'>User Prompt</Label>
                    <Textarea
                        id='user-prompt'
                        placeholder='Enter user prompt...'
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        className='min-h-[100px]'
                    />
                </div>
                <div className='flex justify-end'>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Generating..." : "Submit"}
                    </Button>
                </div>
                {response && (
                    <div className='mt-6'>
                        <Label>Response:</Label>
                        <div className='mt-2 p-6 rounded-lg border border-border'>
                            <div className='prose prose-slate dark:prose-invert max-w-none'>
                                <ReactMarkdown 
                                    components={markdownComponents}
                                    className='space-y-4'
                                >
                                    {response}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
