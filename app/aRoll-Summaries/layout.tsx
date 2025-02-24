import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Eight Roll Summaries",
    description: "View and analyze transcription data across files, folders, and drives",
    icons: {
        icon: "/branding/Icon_White.svg",
    },
};

export default function EightRollSummariesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>
            {children}
        </div>
    );
} 