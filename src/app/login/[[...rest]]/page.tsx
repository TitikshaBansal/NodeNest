"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <span className="text-black font-bold text-lg">N</span>
                    </div>
                    <span className="text-white font-semibold text-2xl tracking-tight">
                        NodeNest
                    </span>
                </Link>

                {/* Clerk Sign In */}
                <div className="flex justify-center">
                    <SignIn 
                        appearance={{
                            elements: {
                                rootBox: "mx-auto",
                                card: "bg-[#161616] border border-[#2a2a2a]",
                                headerTitle: "text-white",
                                headerSubtitle: "text-[#888]",
                                socialButtonsBlockButton: "bg-white text-black hover:bg-[#f0f0f0]",
                                formButtonPrimary: "bg-white text-black hover:bg-[#e0e0e0]",
                                formFieldInput: "bg-[#0a0a0a] border-[#2a2a2a] text-white",
                                formFieldLabel: "text-[#888]",
                                footerActionLink: "text-white",
                            },
                        }}
                        routing="path"
                        path="/login"
                        signUpUrl="/sign-up"
                        afterSignInUrl="/dashboard"
                    />
                </div>

                {/* Back to home */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-[#666] text-sm hover:text-white transition-colors">
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}

