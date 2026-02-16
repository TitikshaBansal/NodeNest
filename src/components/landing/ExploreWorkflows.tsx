'use client';

import Image from "next/image";

const workflowCards = [
    { title: "Relight – Product", image: "/infinite-scroll/6825b0ac04c55a803826a6e5_Relight - Product.avif", highlight: false },
    { title: "Wan Lora – Rotate", image: "/infinite-scroll/6825b0acc901ee5c718efc90_Wan Lora - Rotate.avif", highlight: true },
    { title: "Workflow 01", image: "/infinite-scroll/681f925d9ecbfaf69c5dc15e_Workflow 01.avif", highlight: false },
    { title: "Workflow 02", image: "/infinite-scroll/681f925d9ecbfaf69c5dc16a_Workflow 02.avif", highlight: false },
    { title: "Workflow 03", image: "/infinite-scroll/681f925d9ecbfaf69c5dc164_Workflow 03.avif", highlight: false },
];

export default function ExploreWorkflows() {
    return (
        <section className="bg-[#252525] text-white py-20 px-12 overflow-hidden">
            <h2 className="text-6xl md:text-7xl lg:text-8xl font-normal leading-none mb-8">
                Explore Our
                <br />
                Workflows
            </h2>
            <p className="text-white text-lg max-w-lg mb-12 leading-relaxed">
                From multi-layer compositing to matte manipulation, NodeNest keeps up
                with your creativity with all the editing tools you recognize and rely
                on.
            </p>

            {/* Infinite Scroll Cards */}
            <div className="relative -mx-12">
                <div
                    className="flex gap-6 animate-marquee cursor-grab active:cursor-grabbing"
                    style={{ width: "max-content" }}
                    onMouseDown={(e) => {
                        const slider = e.currentTarget;
                        slider.style.animationPlayState = "paused";
                        const startX = e.pageX - slider.offsetLeft;
                        const scrollLeft = slider.parentElement?.scrollLeft || 0;

                        const onMouseMove = (moveEvent: MouseEvent) => {
                            const x = moveEvent.pageX - slider.offsetLeft;
                            const walk = (x - startX) * 2;
                            if (slider.parentElement) {
                                slider.parentElement.scrollLeft = scrollLeft - walk;
                            }
                        };

                        const onMouseUp = () => {
                            slider.style.animationPlayState = "running";
                            document.removeEventListener("mousemove", onMouseMove);
                            document.removeEventListener("mouseup", onMouseUp);
                        };

                        document.addEventListener("mousemove", onMouseMove);
                        document.addEventListener("mouseup", onMouseUp);
                    }}
                >
                    {/* Original + Duplicate Cards for seamless loop */}
                    {[...workflowCards, ...workflowCards].map((card, index) => (
                        <div
                            key={`${card.title}-${index}`}
                            className={`min-w-105 shrink-0 ${index === 0 ? 'pl-12' : ''} ${index === workflowCards.length * 2 - 1 ? 'pr-12' : ''}`}
                        >
                            <h3 className="text-xl font-normal mb-4">
                                {card.highlight ? (
                                    <span className="text-[#e2ff66]">{card.title}</span>
                                ) : (
                                    card.title
                                )}
                            </h3>
                            <div className="relative h-62.5 rounded-xl overflow-hidden">
                                <Image
                                    src={card.image}
                                    alt={card.title}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute bottom-4 left-4">
                                    <span className="bg-[#e2ff66] text-black px-4 py-2 rounded-lg font-semibold text-sm">
                                        Try
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
        </section>
    );
}
