import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Transcribe",
    description: "Somni Pro brings you advanced speaker diarization...",
    icons: {
        icon: "/branding/Icon_White.svg",
    },
};

export default function TranscribeLayout({
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
