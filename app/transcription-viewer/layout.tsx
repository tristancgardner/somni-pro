import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transcription Viewer',
  description: 'View detailed transcription results',
};

export default function TranscriptionViewerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
} 