
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
    title: "Home",
    description: "Somni Pro brings you advanced speaker diarization...",
    icons: {
        icon: "/branding/Icon_White.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang='en'>
            <body className='antialiased'>{children}</body>
        </html>
    );
}
