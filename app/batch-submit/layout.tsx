import React from 'react';

export const metadata = {
  title: 'Batch Transcription Jobs | SomniPro',
  description: 'Submit transcription jobs for all audio files in your S3 input directory',
};

export default function BatchSubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-gray-900 text-white">
      {children}
    </section>
  );
} 