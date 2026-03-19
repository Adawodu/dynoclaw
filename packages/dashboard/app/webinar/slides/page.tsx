"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { SlideRenderer } from "@/components/webinar/slide-renderer";
import { useCallback, useEffect, useState } from "react";

const WEBINAR_ID = "catalyst-mar-2026";

export default function SlidesPage() {
  const allSlides = useQuery(api.webinarSlides.listByWebinar, { webinarId: WEBINAR_ID });
  const submitLead = useMutation(api.webinarLeads.submit);
  const [current, setCurrent] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", businessType: "", biggestChallenge: "" });

  // Public version: show slides marked showInPublic
  const slides = allSlides?.filter((s) => s.showInPublic) ?? [];
  const total = slides.length;

  const next = useCallback(() => {
    if (current >= total - 1) return;
    const nextSlide = slides[current + 1];
    // Show lead form on CTA slide
    if (nextSlide?.type === "cta" && !submitted) {
      setShowForm(true);
    }
    setCurrent((c) => c + 1);
  }, [current, total, slides, submitted]);

  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  // Keyboard nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    await submitLead({
      webinarId: WEBINAR_ID,
      name: formData.name.trim(),
      email: formData.email.trim(),
      businessType: formData.businessType.trim() || undefined,
      biggestChallenge: formData.biggestChallenge.trim() || undefined,
    });
    setSubmitted(true);
    setShowForm(false);
  };

  if (!allSlides) {
    return <div className="flex items-center justify-center h-screen bg-[#0d1117] text-white">Loading...</div>;
  }

  if (slides.length === 0) {
    return <div className="flex items-center justify-center h-screen bg-[#0d1117] text-white">No slides found</div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0d1117] text-white relative">
      {/* Slide */}
      <div className="h-full w-full relative">
        <SlideRenderer slide={slides[current]} />
      </div>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-800 z-50">
        <div className="h-full transition-all duration-300" style={{ width: `${((current + 1) / total) * 100}%`, background: "linear-gradient(90deg, #1a5c3a, #c9a227)" }} />
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-6 left-8 text-sm text-gray-500 z-50">
        {current + 1} / {total}
      </div>
      <div className="fixed bottom-6 right-8 flex gap-2 z-50">
        <button onClick={prev} disabled={current === 0} className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 text-sm disabled:opacity-30">
          Prev
        </button>
        <button onClick={next} disabled={current >= total - 1} className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 text-sm disabled:opacity-30">
          Next
        </button>
      </div>

      {/* Lead capture form overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-full max-w-md space-y-4">
            <h2 className="text-2xl font-bold" style={{ color: "#c9a227" }}>Get Your Free Automation Plan</h2>
            <p className="text-sm text-gray-400">Tell us about your business and we&apos;ll show you what DynoClaw can automate for you.</p>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Business Type</label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData((f) => ({ ...f, businessType: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Select...</option>
                <option value="product">Product / E-commerce</option>
                <option value="services">Services / Consulting</option>
                <option value="content">Content / Education</option>
                <option value="local">Trades / Local Business</option>
                <option value="idea">I have an idea, not started yet</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Biggest Challenge</label>
              <select
                value={formData.biggestChallenge}
                onChange={(e) => setFormData((f) => ({ ...f, biggestChallenge: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Select...</option>
                <option value="emails">Managing emails & messages</option>
                <option value="social">Creating social media content</option>
                <option value="customers">Responding to customers</option>
                <option value="design">Design work</option>
                <option value="website">I don&apos;t have a website</option>
                <option value="product">I want to create a digital product</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg font-semibold text-white"
                style={{ background: "linear-gradient(90deg, #1a5c3a, #2d8a5e)" }}
              >
                Get My Plan
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg text-gray-400 hover:text-white border border-gray-700"
              >
                Skip
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
