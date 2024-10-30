import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { summarize } from "@/app/api/llama";
import ReactMarkdown from "react-markdown";
import { ReactNode } from "react";
import { saveAs } from "file-saver";

interface MarkdownProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: ReactNode;
    [key: string]: any;
}

interface SummarizeProps {
    transcript: string;
    onSummaryGenerated: (summary: string) => void;
    existingSummary?: string;
    fileName?: string;
}

export default function Summarize({
    transcript,
    onSummaryGenerated,
    existingSummary,
    fileName = "transcript",
}: SummarizeProps) {
    const [summary, setSummary] = useState<string>(existingSummary || "");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSummary(existingSummary || "");
    }, [existingSummary]);

    const handleSummarize = async () => {
        try {
            setIsLoading(true);
            setSummary(""); // Clear existing summary
            const result = await summarize(transcript);
            const summaryText = result as string;
            setSummary(summaryText);
            onSummaryGenerated(summaryText); // Notify parent component
        } catch (error) {
            console.error("Error generating summary:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (summary && transcript) {
            const content = [
                "Interview Summary:",
                "================",
                "",
                summary,
                "",
                "Full Transcript:",
                "===============",
                "",
                transcript,
            ].join("\n");

            const blob = new Blob([content], {
                type: "text/plain;charset=utf-8",
            });
            saveAs(blob, `${fileName}_with_summary.txt`);
        }
    };

    const markdownComponents = {
        p: ({ node, className, children, ...props }: MarkdownProps) => {
            return (
                <p
                    className='text-base leading-7 my-6 first:mt-0 last:mb-0'
                    {...props}
                >
                    {children}
                </p>
            );
        },
        ul: ({ node, children, ...props }: MarkdownProps) => (
            <ul
                className='list-disc list-outside ml-6 my-6 space-y-2'
                {...props}
            >
                {children}
            </ul>
        ),
        li: ({ node, children, ...props }: MarkdownProps) => (
            <li className='leading-7' {...props}>
                {children}
            </li>
        ),
    };

    return (
        <Card className='mb-4'>
            <CardHeader>
                <CardTitle>Interview Summary</CardTitle>
                <CardDescription>
                    Generate a summary of your interview transcript
                </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                <div className='flex justify-end space-x-2'>
                    <Button
                        onClick={handleSummarize}
                        disabled={isLoading || !transcript}
                    >
                        {isLoading
                            ? "Generating Summary..."
                            : "Generate Summary"}
                    </Button>
                    {summary && (
                        <Button onClick={handleDownload} variant='outline'>
                            Download Transcript with Summary
                        </Button>
                    )}
                </div>
                {summary && (
                    <div className='mt-4'>
                        <div className='p-6 rounded-lg border border-border'>
                            <div className='prose prose-slate dark:prose-invert max-w-none'>
                                <ReactMarkdown
                                    components={markdownComponents}
                                    className='space-y-4'
                                >
                                    {summary}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
