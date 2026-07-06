"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { assetPath } from "@/lib/base-path";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";

type AnnouncementSlide = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
};

type DealerAnnouncementsHeroProps = {
  slides: AnnouncementSlide[];
};

export function DealerAnnouncementsHero({ slides }: DealerAnnouncementsHeroProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;
  const active = slides[index];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900">
      <div className="relative h-[250px] w-full md:h-[300px]">
        <Image src={assetPath(active.imageUrl)} alt={active.title} fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/35" />

        <div className="absolute inset-0 flex items-end p-6 md:p-8">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              <Megaphone className="h-3.5 w-3.5" />
              Recent Announcement
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">{active.title}</h2>
            <p className="mt-2 text-sm text-slate-100 md:text-base">{active.description}</p>
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
              aria-label="Previous announcement"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
              aria-label="Next announcement"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-black/30 px-4 py-3">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(slideIndex)}
              aria-label={`Go to ${slide.title}`}
              className={`h-2.5 rounded-full transition-all ${
                slideIndex === index ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
