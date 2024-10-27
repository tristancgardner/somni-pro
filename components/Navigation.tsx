"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation = () => {
    const pathname = usePathname();

    return (
        <nav className="flex items-center">
            <ul className="flex space-x-4">
                <li className={pathname === '/transcribe' ? 'text-blue-500' : 'text-white'}>
                    <Link href="/transcribe" className="hover:text-blue-300 transition-colors">Transcribe</Link>
                </li>
                <li className={pathname === '/websocket' ? 'text-blue-500' : 'text-white'}>
                    <Link href="/websocket" className="hover:text-blue-300 transition-colors">WebSocket</Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navigation;
