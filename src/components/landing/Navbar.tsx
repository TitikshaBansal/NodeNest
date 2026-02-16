'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <nav className="sticky top-0 z-[9999] bg-transparent backdrop-blur-md transition-colors duration-300">
            <div className="w-full px-8 flex items-center justify-between h-[64px]">
                {/* Left: Logo and App Name */}
                <Link href="/" className="flex items-center gap-3 min-w-[160px]">
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">N</span>
                    </div>
                    <span className="text-black font-semibold text-sm tracking-wider uppercase">
                        NodeNest
                    </span>
                    <div className="border-l border-[#bbb] pl-3 ml-1">
                        <span className="text-[#666] text-xs uppercase tracking-wider">
                            AI Workflows
                        </span>
                    </div>
                </Link>
                {/* Right: Menu Items */}
                <div className="flex items-center gap-0">
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="#"
                            className="text-[#333] text-sm font-medium uppercase tracking-wide"
                        >
                            Collective
                        </Link>
                        <Link
                            href="#"
                            className="text-[#333] text-sm font-medium uppercase tracking-wide"
                        >
                            Enterprise
                        </Link>
                        <Link
                            href="#"
                            className="text-[#333] text-sm font-medium uppercase tracking-wide"
                        >
                            Pricing
                        </Link>
                        <Link
                            href="#"
                            className="text-[#333] text-sm font-medium uppercase tracking-wide"
                        >
                            Request a Demo
                        </Link>
                        <Link
                            href="/login"
                            className="text-[#333] text-sm font-medium uppercase tracking-wide"
                        >
                            Sign In
                        </Link>
                    </div>
                    <Link
                        href="/login"
                        className={
                            `ml-4 transition-all duration-300 rounded-lg font-semibold text-black bg-[#e2ff66] hover:bg-[#d4f055] flex items-center justify-center ` +
                            (scrolled
                                ? "px-4 py-2 text-sm h-10"
                                : "px-8 py-4 text-2xl h-16 shadow-lg")
                        }
                        style={{
                            minWidth: scrolled ? 0 : 160,
                            fontWeight: scrolled ? 600 : 500
                        }}
                    >
                        Start Now
                    </Link>
                </div>
            </div>
        </nav>
    );
}
