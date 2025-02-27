"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navigation = () => {
    const pathname = usePathname();

    return (
        <nav className='flex items-center'>
            <ul className='flex gap-8 items-center'>
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
                {/* <li
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
                </li> */}
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
                        pathname === "/batch-upload"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/batch-upload'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        batch upload
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/summaries-storylines"
                            ? "text-[#45b7aa]"
                            : "text-white"
                    }
                >
                    <Link
                        href='/summaries-storylines'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        summaries
                    </Link>
                </li>
            </ul>
        </nav>
    );
};

export default Navigation;
