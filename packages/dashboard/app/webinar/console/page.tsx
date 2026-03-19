"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { SlideRenderer } from "@/components/webinar/slide-renderer";
import { useCallback, useEffect, useRef, useState } from "react";

const WEBINAR_ID = "catalyst-mar-2026";

export default function ConsolePage() {
  const allSlides = useQuery(api.webinarSlides.listByWebinar, { webinarId: WEBINAR_ID });
  const [current, setCurrent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Presenter sees all slides except DynoClaw CTA slides
  const slides = allSlides?.filter((s) => !s.showDynoclawCta) ?? [];
  const total = slides.length;

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // BroadcastChannel sync — bidirectional with present page
  useEffect(() => {
    const bc = new BroadcastChannel("webinar-sync");
    bc.postMessage({ type: "slide-change", index: current, source: "console" });
    return () => bc.close();
  }, [current]);

  useEffect(() => {
    const bc = new BroadcastChannel("webinar-sync");
    bc.onmessage = (e) => {
      if (e.data.type === "slide-change" && e.data.source !== "console" && typeof e.data.index === "number") {
        setCurrent(e.data.index);
      }
    };
    return () => bc.close();
  }, []);

  // Keyboard nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft" || e.key === "Backspace") { e.preventDefault(); prev(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!allSlides) {
    return <div className="flex items-center justify-center h-screen bg-gray-950 text-white">Loading...</div>;
  }

  const currentSlide = slides[current];
  const nextSlide = slides[current + 1];

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 text-white p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold" style={{ color: "#c9a227" }}>Presenter Console</span>
          <span className="text-sm text-gray-400">Slide {current + 1} / {total}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xl tabular-nums" style={{ color: elapsed > 2700 ? "#ef4444" : elapsed > 2400 ? "#f59e0b" : "#2d8a5e" }}>
            {formatTime(elapsed)}
          </span>
          <button onClick={() => setElapsed(0)} className="text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-1 rounded">
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-80px)]">
        {/* Current slide preview */}
        <div className="col-span-2 rounded-lg overflow-hidden border border-gray-800 relative" style={{ aspectRatio: "16/9" }}>
          {currentSlide && (
            <div className="w-full h-full">
              <SlideRenderer slide={currentSlide} />
            </div>
          )}
        </div>

        {/* Right panel: notes + next slide */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Speaker notes */}
          <div className="flex-1 rounded-lg border border-gray-800 p-4 overflow-y-auto bg-gray-900">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#c9a227" }}>Speaker Notes</h3>
            <p className="text-base leading-relaxed text-gray-300 whitespace-pre-line">
              {currentSlide?.speakerNotes || "No notes for this slide."}
            </p>
            {currentSlide?.demoSpeakerNote && (
              <div className="mt-4 p-3 rounded border border-dashed" style={{ borderColor: "#c9a227", background: "rgba(201,162,39,0.05)" }}>
                <p className="text-sm" style={{ color: "#c9a227" }}>
                  <strong>Demo tip:</strong> {currentSlide.demoSpeakerNote}
                </p>
              </div>
            )}
          </div>

          {/* Next slide preview */}
          <div className="rounded-lg border border-gray-800 overflow-hidden" style={{ height: "30%" }}>
            <div className="px-3 py-1.5 border-b border-gray-800 bg-gray-900">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Next</span>
            </div>
            <div className="w-full h-[calc(100%-28px)] relative">
              {nextSlide ? (
                <div className="w-full h-full" style={{ transform: "scale(1)", transformOrigin: "top left" }}>
                  <SlideRenderer slide={nextSlide} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">End of presentation</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
        <button onClick={prev} className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20">
          ← Prev
        </button>
        <button onClick={next} className="bg-white/10 border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20">
          Next →
        </button>
      </div>
    </div>
  );
}
