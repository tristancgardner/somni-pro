import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
    title: "Home",
    description: "Somni Pro brings you advanced speaker diarization...",
    icons: {
        icon: "/branding/Icon_White.svg",
    },
};

export default function LoginLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="login-container">
            {children}
        </div>
    );
}
