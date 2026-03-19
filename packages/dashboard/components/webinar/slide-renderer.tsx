"use client";

import { type Doc } from "@convex/_generated/dataModel";

type Slide = Doc<"webinarSlides">;

export function SlideRenderer({
  slide,
  className = "",
  showNotes = false,
}: {
  slide: Slide;
  className?: string;
  showNotes?: boolean;
}) {
  const base = `flex flex-col justify-center items-center w-full h-full ${className}`;

  switch (slide.type) {
    case "cover":
      return <CoverSlide slide={slide} className={base} />;
    case "section":
      return <SectionSlide slide={slide} className={base} />;
    case "content":
      return <ContentSlide slide={slide} className={base} />;
    case "interactive":
      return <InteractiveSlide slide={slide} className={base} />;
    case "demo":
      return <DemoSlide slide={slide} className={base} showNotes={showNotes} />;
    case "cta":
      return <CtaSlide slide={slide} className={base} />;
    default:
      return <ContentSlide slide={slide} className={base} />;
  }
}

function CoverSlide({ slide, className }: { slide: Slide; className: string }) {
  return (
    <div className={`${className} text-center`} style={{ background: "linear-gradient(135deg, #0d1117 0%, #0a2619 50%, #0d1117 100%)" }}>
      <h1 className="text-5xl font-extrabold leading-tight mb-4" style={{ background: "linear-gradient(90deg, #c9a227, #e8d06f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        {slide.title}
      </h1>
      {slide.subtitle && (
        <h2 className="text-2xl font-normal text-gray-400 mb-10">{slide.subtitle}</h2>
      )}
      {slide.highlightBox && (
        <p className="text-xl text-gray-500 mt-6">{slide.highlightBox}</p>
      )}
      {slide.presenterInfo && (
        <>
          <div className="text-xl mt-5" style={{ color: "#2d8a5e" }}>{slide.presenterInfo.name}</div>
          <div className="text-base text-gray-400 mt-1">{slide.presenterInfo.title}</div>
          {slide.presenterInfo.subtitle && (
            <div className="text-base text-gray-400 mt-1">{slide.presenterInfo.subtitle}</div>
          )}
          {slide.presenterInfo.event && (
            <div className="text-sm text-gray-500 mt-1">{slide.presenterInfo.event}</div>
          )}
        </>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #1a5c3a, #c9a227)" }} />
    </div>
  );
}

function SectionSlide({ slide, className }: { slide: Slide; className: string }) {
  return (
    <div className={`${className} text-center`} style={{ background: "linear-gradient(135deg, #1a5c3a 0%, #0f3d25 100%)" }}>
      <h1 className="text-5xl font-extrabold mb-3">{slide.title}</h1>
      {slide.subtitle && <p className="text-xl text-white/70">{slide.subtitle}</p>}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #1a5c3a, #c9a227)" }} />
    </div>
  );
}

function ContentSlide({ slide, className }: { slide: Slide; className: string }) {
  return (
    <div className={`${className} items-start justify-start pt-20 px-20`} style={{ background: "#0d1117" }}>
      <h1 className="text-4xl font-bold mb-4" style={{ color: "#c9a227" }}>{slide.title}</h1>
      {slide.subtitle && <p className="text-2xl text-white/85 mb-5">{slide.subtitle}</p>}

      {slide.twoColumns && (
        <div className="grid grid-cols-2 gap-10 w-full max-w-4xl mb-5">
          <div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "#2d8a5e" }}>{slide.twoColumns.left.heading}</h3>
            <ul className="text-lg leading-relaxed space-y-1">
              {slide.twoColumns.left.items.map((item, i) => (
                <li key={i} className="pl-7 relative before:content-['→'] before:absolute before:left-0 before:text-amber-500 before:font-bold">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "#2d8a5e" }}>{slide.twoColumns.right.heading}</h3>
            <ul className="text-lg leading-relaxed space-y-1">
              {slide.twoColumns.right.items.map((item, i) => (
                <li key={i} className="pl-7 relative before:content-['→'] before:absolute before:left-0 before:text-amber-500 before:font-bold">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {slide.bullets && !slide.twoColumns && (
        <ul className="text-xl leading-loose space-y-1 max-w-4xl">
          {slide.bullets.map((b, i) => (
            <li key={i} className="pl-7 relative before:content-['→'] before:absolute before:left-0 before:text-amber-500 before:font-bold">{b}</li>
          ))}
        </ul>
      )}

      {slide.tableHeaders && slide.tableRows && (
        <table className="w-full max-w-3xl border-collapse mt-5 text-lg">
          <thead>
            <tr>
              {slide.tableHeaders.map((h, i) => (
                <th key={i} className="text-left p-3 font-semibold border-b-2" style={{ color: "#c9a227", borderColor: "rgba(201,162,39,0.3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slide.tableRows.map((row, i) => (
              <tr key={i}>
                {row.cells.map((cell, j) => (
                  <td key={j} className={`p-3 border-b border-white/10 ${j === row.cells.length - 1 && cell.startsWith("Save") ? "font-bold" : ""}`} style={j === row.cells.length - 1 && cell.startsWith("Save") ? { color: "#2d8a5e" } : undefined}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {slide.highlightBox && (
        <div className="border-l-4 rounded-r-lg p-5 mt-5 text-lg w-full max-w-4xl whitespace-pre-line" style={{ borderColor: "#c9a227", background: "rgba(201,162,39,0.1)" }}>
          {slide.highlightBox}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #1a5c3a, #c9a227)" }} />
    </div>
  );
}

function InteractiveSlide({ slide, className }: { slide: Slide; className: string }) {
  return (
    <div className={`${className} text-center`} style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
      <h1 className="text-4xl font-bold mb-6" style={{ color: "#c9a227" }}>{slide.title}</h1>
      {slide.options && (
        <div className="flex flex-wrap gap-4 justify-center mt-6">
          {slide.options.map((opt, i) => (
            <div key={i} className="bg-white/[0.08] border-2 border-white/15 rounded-xl px-7 py-5 text-lg min-w-[200px] whitespace-pre-line text-left">{opt}</div>
          ))}
        </div>
      )}
      {slide.instruction && (
        <p className="text-lg text-gray-400 mt-8 italic">{slide.instruction}</p>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #1a5c3a, #c9a227)" }} />
    </div>
  );
}

function DemoSlide({ slide, className, showNotes = false }: { slide: Slide; className: string; showNotes?: boolean }) {
  return (
    <div className={`${className} items-start justify-start pt-16 px-20`} style={{ background: "#0d1117" }}>
      <h1 className="text-3xl font-bold mb-2" style={{ color: "#c9a227" }}>{slide.title}</h1>
      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-6" style={{ background: "#1a5c3a" }}>Live Demo</span>
      {slide.demoSteps && (
        <ol className="text-lg leading-loose w-full max-w-4xl" style={{ counterReset: "step" }}>
          {slide.demoSteps.map((step, i) => (
            <li key={i} className="pl-11 relative mb-1.5">
              <span className="absolute left-0 top-1 w-7 h-7 rounded-full text-center leading-7 text-sm font-bold" style={{ background: "#1a5c3a" }}>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      )}
      {showNotes && slide.demoSpeakerNote && (
        <div className="border border-dashed rounded-lg p-4 mt-6 text-base w-full max-w-4xl" style={{ borderColor: "#c9a227", background: "rgba(201,162,39,0.1)", color: "#c9a227" }}>
          <strong>SPEAKER NOTE:</strong> {slide.demoSpeakerNote}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #1a5c3a, #c9a227)" }} />
    </div>
  );
}

function CtaSlide({ slide, className }: { slide: Slide; className: string }) {
  return (
    <div className={`${className} text-center`} style={{ background: "linear-gradient(135deg, #0d1117 0%, #0a2619 50%, #0d1117 100%)" }}>
      <h1 className="text-5xl font-extrabold leading-tight mb-4" style={{ background: "linear-gradient(90deg, #c9a227, #e8d06f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        {slide.title}
      </h1>
      {slide.subtitle && <h2 className="text-2xl text-gray-400 mb-10">{slide.subtitle}</h2>}
      {slide.ctaButton && (
        <a
          href={slide.ctaButton.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-4 rounded-lg text-xl font-bold transition-all hover:scale-105"
          style={{ background: "linear-gradient(90deg, #1a5c3a, #2d8a5e)", color: "white" }}
        >
          {slide.ctaButton.label}
        </a>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #1a5c3a, #c9a227)" }} />
    </div>
  );
}
