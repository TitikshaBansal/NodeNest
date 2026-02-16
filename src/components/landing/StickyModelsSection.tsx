'use client';

import Image from "next/image";
import { useEffect, useState, useRef } from "react";

// AI Model names for the sticky scroll section
const aiModels = [
    { name: "GPT img 1", highlighted: true },
    { name: "Wan", highlighted: false },
    { name: "SD 3.5", highlighted: true },
    { name: "Runway Gen-4", highlighted: true },
    { name: "Imagen 3", highlighted: true },
    { name: "Veo 3", highlighted: false },
    { name: "Recraft V3", highlighted: false },
    { name: "Kling", highlighted: false },
    { name: "Flux Pro 1.1 Ultra", highlighted: false },
    { name: "Minimax video", highlighted: false },
    { name: "Ideogram V3", highlighted: false },
    { name: "Luma ray 2", highlighted: false },
    { name: "Minimax image 01", highlighted: false },
    { name: "Bria", highlighted: false },
];

// Background images for the sticky section
const bgImages = [
    "/background/6825887e82ac8a8bb8139ebd_GPT img 1.avif",
    "/background/6825887d618a9071dd147d5f_SD 3.5.avif",
    "/background/6825887d65bf65cc5194ac05_Imagen 3.avif",
    "/background/6825887eda73c12eaa4c3ed8_Recraft V3.avif",
    "/background/6825887d8a7b4e937a86ea6a_Flux Pro 1.1 Ultra.avif",
    "/background/68258880f266d11a0748ab63_Minimax image 01.avif",
    "/background/6825887d9b7eb0abc91263b6_Ideogram V2.avif",
    "/background/6825887d59ff2f86b8fba523_Bria.avif",
];

export default function StickyModelsSection() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [currentBgIndex, setCurrentBgIndex] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!sectionRef.current) return;

            const rect = sectionRef.current.getBoundingClientRect();
            const sectionHeight = sectionRef.current.offsetHeight;
            const viewportHeight = window.innerHeight;

            const scrollableAmount = sectionHeight - viewportHeight;

            if (scrollableAmount <= 0) {
                setScrollProgress(0);
                return;
            }

            const scrolled = -rect.top;
            const progress = Math.max(0, Math.min(1, scrolled / scrollableAmount));

            setScrollProgress(progress);

            const bgIndex = Math.min(
                bgImages.length - 1,
                Math.floor(progress * bgImages.length)
            );
            setCurrentBgIndex(bgIndex);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const highlightedModelIndex = Math.min(
        aiModels.length - 1,
        Math.floor(scrollProgress * aiModels.length)
    );

    const itemHeight = 90;
    const totalListHeight = aiModels.length * itemHeight;
    const modelListOffset = scrollProgress * totalListHeight;

    return (
        <section
            ref={sectionRef}
            className="relative z-20 bg-black"
            style={{ height: '400vh' }}
        >
            <div className="sticky top-0 h-screen w-full overflow-hidden">
                {/* Background images with crossfade */}
                {bgImages.map((bg, index) => (
                    <div
                        key={bg}
                        className="absolute inset-0 transition-opacity duration-700 ease-out"
                        style={{
                            opacity: index === currentBgIndex ? 1 : 0,
                        }}
                    >
                        <Image
                            src={bg}
                            alt="AI Generated"
                            fill
                            className="object-cover"
                            priority={index === 0}
                        />
                    </div>
                ))}

                <div className="absolute inset-0 bg-black/40" />

                <div className="relative h-full flex items-start pt-32 px-8 md:px-16 lg:px-24 gap-20">
                    <div className="w-2/5">
                        <h2 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-normal text-white leading-[1.1] mb-6">
                            Use all AI<br />
                            models,<br />
                            together at<br />
                            last
                        </h2>
                        <p className="text-white/70 text-sm md:text-base max-w-md leading-relaxed">
                            AI models and professional editing tools in one node-based
                            platform. Turn creative vision into scalable workflows without
                            compromising quality.
                        </p>
                    </div>

                    <div className="w-3/5 overflow-hidden">
                        <div
                            className="transition-transform duration-200 ease-out"
                            style={{
                                transform: `translateY(-${modelListOffset}px)`,
                            }}
                        >
                            {aiModels.map((model, index) => (
                                <div
                                    key={model.name}
                                    className={`text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-normal leading-[1.2] transition-all duration-300 ${index === highlightedModelIndex
                                            ? "text-[#e2ff66]"
                                            : "text-white"
                                        }`}
                                >
                                    {model.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
