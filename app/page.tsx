import AudioWaveform from "@/components/custom/diar-plot";
import Image from 'next/image';

export default function Home() {
    return (
        <div style={{
            backgroundImage: 'url("images/electric_timeline.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            minHeight: '100vh',
            position: 'relative',
            backgroundColor: '#000', // Dark background color
            overflow: 'auto',
        }}>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 70%, rgba(0, 0, 0, 1) 100%)',
                zIndex: 1,
            }} />
            <main className='relative z-10 flex min-h-screen flex-col items-center justify-between p-24'>
                <AudioWaveform />
            </main>
        </div>
    );
}
