"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navigation = () => {
    const pathname = usePathname();

    return (
        <nav className='flex items-center z-50 relative'>
            <ul className='flex flex-wrap gap-4 items-center'>
                <li
                    className={
                        pathname === "/" ? "text-[#45b7aa]" : "text-white"
                    }
                >
                    <Link
                        href='/'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        home
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/pages/transcribe"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/pages/transcribe'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        transcribe
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/pages/websocket"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/pages/websocket'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        websocket
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/pages/features"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/pages/features'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        features
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/pages/forge"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/pages/forge'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        forge
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/pulse" ? "text-[#45b7aa]" : "text-white"
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
