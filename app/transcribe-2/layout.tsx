import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Transcribe Multiple Files",
    description: "Upload and process multiple audio files for transcription and speaker diarization",
    icons: {
        icon: "/branding/Icon_White.svg",
    },
};

export default function Transcribe2Layout({
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