import AudioWaveform from "@/components/custom/diar-plot";

export default function Home() {
    return (
        <main className='flex min-h-screen flex-col items-center justify-between p-24'>
            <AudioWaveform />
        </main>
    );
}
