"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navigation = () => {
    const pathname = usePathname();

    return (
        <nav className='flex items-center'>
            <ul className='flex space-x-4'>
                <li
                    className={
                        pathname === "/transcribe"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/transcribe'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        transcribe
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/websocket"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/websocket'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        websocket
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/features"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/features'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        features
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/procull"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/procull'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        assemble
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/pulse"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/pulse'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        pulse
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/deeplens"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/deeplens'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        DeepLens
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/quicksight"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/quicksight'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        QuickSight
                    </Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navigation;
