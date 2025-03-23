import type { Metadata } from "next";
import "./styles/globals.css";
import BackgroundWrapper from "@/components/BackgroundWrapper";
import SessionProvider from "@/components/auth/session-provider";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
    title: "SOMNI Pro",
    description: "Advanced audio processing and analysis for filmmakers and content creators",
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
        <html lang='en' suppressHydrationWarning>
            <body className='antialiased bg-background text-foreground'>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <SessionProvider>
                        <BackgroundWrapper>
                            {children}
                        </BackgroundWrapper>
                        <Toaster />
                    </SessionProvider>
                </ThemeProvider>
            </body>
        </html>
    );
} 