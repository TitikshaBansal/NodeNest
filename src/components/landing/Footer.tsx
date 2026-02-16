'use client';

import Link from "next/link";

export default function Footer() {
    return (
        <section className="relative bg-[#252525] pb-2.5">
            {/* Background shape with rounded corner */}
            <div
                className="absolute inset-y-0 left-0 rounded-tr-[40px] bg-[#b5bab0]"
                style={{ right: "15%" }}
            ></div>

            {/* Content container */}
            <div
                className="relative z-10 text-white"
                style={{ marginRight: "20%" }}
            >
                {/* CTA Header */}
                <div className="pt-16 pb-12 px-12">
                    <div className="flex items-center gap-6">
                        <h2 className="text-4xl md:text-6xl lg:text-[5rem] font-normal leading-[1.05]">
                            <span>Artificial</span>
                            <br />
                            <span>Intelligence</span>
                        </h2>
                        <span className="text-5xl md:text-9xl font-extralight">+</span>
                        <h2 className="text-4xl md:text-6xl lg:text-[5rem] font-normal leading-[1.05]">
                            <span>Human</span>
                            <br />
                            <span>Creativity</span>
                        </h2>
                    </div>
                </div>

                {/* Footer Content */}
                <div className="py-10 px-12">
                    {/* Top row: Logo + Description */}
                    <div className="flex items-center gap-8 mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#3a3f37] rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">N</span>
                            </div>
                            <div className="border-l border-white pl-4">
                                <span className="text-white font-semibold text-sm tracking-wide block">
                                    NodeNest
                                </span>
                                <span className="text-white text-xs uppercase tracking-wider">
                                    AI Workflows
                                </span>
                            </div>
                        </div>
                        <p className="text-white text-sm max-w-md leading-relaxed hidden md:block">
                            NodeNest is a new way to create. We&apos;re bridging the gap
                            between AI capabilities and human creativity, to continue the
                            tradition of craft in artistic expression. We call it AI
                            Workflows.
                        </p>
                    </div>

                    {/* Links row */}
                    <div className="flex items-start gap-12 mb-10">
                        <div>
                            <h4 className="text-white/70 text-[10px] uppercase tracking-wider mb-3">
                                Get Started
                            </h4>
                            <ul className="space-y-1">
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Request a Demo</a></li>
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Pricing</a></li>
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Enterprise</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white/70 text-[10px] uppercase tracking-wider mb-3">
                                Company
                            </h4>
                            <ul className="space-y-1">
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">About</a></li>
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Careers</a></li>
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Trust</a></li>
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Terms</a></li>
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Privacy</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white/70 text-[10px] uppercase tracking-wider mb-3">
                                Connect
                            </h4>
                            <ul className="space-y-1">
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Collective</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white/70 text-[10px] uppercase tracking-wider mb-3">
                                Resources
                            </h4>
                            <ul className="space-y-1">
                                <li><a href="#" className="text-white/80 hover:text-white text-xs uppercase tracking-wide">Knowledge Center</a></li>
                            </ul>
                        </div>
                        {/* Social icons */}
                        <div className="flex items-center gap-4">
                            <a href="#" className="text-white/60 hover:text-white">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                                </svg>
                            </a>
                            <a href="#" className="text-white/60 hover:text-white">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                                </svg>
                            </a>
                            <a href="#" className="text-white/60 hover:text-white">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                            <a href="#" className="text-white/60 hover:text-white">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.094.246-.192.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                                </svg>
                            </a>
                            <a href="#" className="text-white/60 hover:text-white">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Bottom: SOC 2 badge and copyright */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 py-1 w-fit">
                            <span className="text-[8px] bg-black text-white uppercase font-bold border border-black/30 rounded-full p-2">
                                AICPA
                                <br />
                                SOC
                            </span>
                            <div>
                                <span className="text-[11px] text-black font-medium">
                                    SOC 2 Type II Certified
                                </span>
                                <p className="text-[11px] text-black/40">
                                    Your data is protected with industry-standard security controls.
                                </p>
                            </div>
                        </div>
                        <span className="text-black pl-1 pt-3 text-[12px] uppercase tracking-wider">
                            NodeNest © 2025. All Rights Reserved.
                        </span>
                    </div>
                </div>
            </div>

            {/* Decorative curved line */}
            <div className="absolute right-0 top-0 bottom-0 w-62.5 pointer-events-none z-1">
                <svg
                    viewBox="0 0 250 700"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M 250 0 Q 50 350 250 700"
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                    />
                </svg>
            </div>

            {/* Start Now Button */}
            <Link
                href="/login"
                className="absolute bottom-0 right-0 bg-[#F8FF9E] text-black rounded-tl-3xl pr-18 pl-10 py-8 text-8xl hover:bg-[#d4f055] transition-colors shadow-2xl z-999"
            >
                Start Now
            </Link>
        </section>
    );
}
