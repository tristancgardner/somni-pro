"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";

const Navigation = () => {
    const pathname = usePathname();

    return (
        <nav className='flex justify-between items-center w-full'>
            <ul className='flex gap-8 items-center'>
                <li
                    className={
                        pathname === "/" ? "text-[#45b7aa]" : "text-foreground"
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
                        pathname === "/upload-audio"
                            ? "text-[#45b7aa]"
                            : "text-foreground"
                    }
                >
                    <Link
                        href='/upload-audio'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        upload audio
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/file-viewer"
                            ? "text-[#45b7aa]"
                            : "text-foreground"
                    }
                >
                    <Link
                        href='/file-viewer'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        file-viewer
                    </Link>
                </li>
                <li
                    className={
                        pathname === "/features"
                            ? "text-[#45b7aa]"
                            : "text-foreground"
                    }
                >
                    <Link
                        href='/features'
                        className='hover:text-[#45b7aa] transition-colors drop-shadow-[0_12px_12px_rgba(0,0,0,0.9)]'
                    >
                        features
                    </Link>
                </li>
            </ul>
            
            <div className="flex items-center">
                <ModeToggle />
            </div>
        </nav>
    );
};

export default Navigation;
