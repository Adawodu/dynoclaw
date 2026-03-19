"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SlideRenderer } from "@/components/webinar/slide-renderer";
import { useCallback, useEffect, useState } from "react";

const WEBINAR_ID = "catalyst-mar-2026";

export default function PresentPage() {
  const allSlides = useQuery(api.webinarSlides.listByWebinar, { webinarId: WEBINAR_ID });
  const [current, setCurrent] = useState(0);

  // Filter: presenter sees all slides except DynoClaw CTA slides
  const slides = allSlides?.filter((s) => !s.showDynoclawCta) ?? [];
  const total = slides.length;

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  // BroadcastChannel sync — send current slide index to console
  useEffect(() => {
    const bc = new BroadcastChannel("webinar-sync");
    bc.postMessage({ type: "slide-change", index: current, slideId: slides[current]?._id });
    return () => bc.close();
  }, [current, slides]);

  // Listen for sync from console
  useEffect(() => {
    const bc = new BroadcastChannel("webinar-sync");
    bc.onmessage = (e) => {
      if (e.data.type === "slide-change" && typeof e.data.index === "number") {
        setCurrent(e.data.index);
      }
    };
    return () => bc.close();
  }, []);

  // Keyboard nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft" || e.key === "Backspace") { e.preventDefault(); prev(); }
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  if (!allSlides) {
    return <div className="flex items-center justify-center h-screen bg-[#0d1117] text-white">Loading...</div>;
  }

  if (slides.length === 0) {
    return <div className="flex items-center justify-center h-screen bg-[#0d1117] text-white">No slides found</div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0d1117] text-white relative">
      <div className="h-full w-full relative">
        <SlideRenderer slide={slides[current]} />
      </div>
      <div className="fixed bottom-6 left-8 text-sm text-gray-500 z-50">
        {current + 1} / {total}
      </div>
      <div className="fixed bottom-6 right-8 flex gap-2 z-50">
        <button onClick={prev} className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 text-sm">
          Prev
        </button>
        <button onClick={next} className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 text-sm">
          Next
        </button>
      </div>
    </div>
  );
}
