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
            const result = await promptLlama(systemPrompt, userPrompt);
            setResponse(result as string);
        } catch (error) {
            console.error("Error connecting to Llama:", error);
        } finally {
            setIsLoading(false);
        }
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
                        <Label>Response</Label>
                        <div className='mt-2 p-4 rounded-lg bg-secondary border border-border'>
                            <div className='prose prose-slate dark:prose-invert max-w-none'>
                                <p className='text-sm leading-relaxed whitespace-pre-wrap'>
                                    {response}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
