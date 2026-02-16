'use client';

import Link from "next/link";

export default function Navbar() {
    return (
        <>
            {/* Banner
            <div className="bg-[#1a1a1a] py-2 px-4 text-center text-sm flex items-center justify-center gap-2">
                <span className="text-white/80">
                    🚀 NodeNest — The AI Workflow Platform
                </span>
            </div> */}

            {/* Nav */}
            <nav className="sticky top-0 z-500 bg-[#e8eaed]/90 backdrop-blur-md">
                <div className="w-full px-8 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
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
                            href="/login"
                            className="text-[#333] text-sm font-medium uppercase tracking-wide"
                        >
                            Sign In
                        </Link>
                    </div>
                    <Link
                        href="/login"
                        className="bg-[#e2ff66] text-black font-semibold rounded-lg px-6 py-3 text-base hover:bg-[#d4f055] transition-colors"
                    >
                        Start Now
                    </Link>
                </div>
            </nav>
        </>
    );
}
