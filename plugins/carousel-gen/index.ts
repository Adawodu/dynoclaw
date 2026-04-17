import { Type } from "@sinclair/typebox";
import { renderSlide as renderProfessional } from "./templates/professional";
import { renderSlide as renderBold } from "./templates/bold";
import { renderSlide as renderMinimal } from "./templates/minimal";
import { renderComicBrief, type ComicBriefSection } from "./templates/comic-brief";
import type { Brand } from "./templates/professional";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ── Template defaults ───────────────────────────────────────────────
const TEMPLATE_DEFAULTS: Record<string, { primary: string; accent: string }> = {
  professional: { primary: "#F5D547", accent: "#1A7A6D" },
  bold: { primary: "#1E3A8A", accent: "#F97316" },
  minimal: { primary: "#1E293B", accent: "#FACC15" },
};

const TEMPLATE_RENDERERS: Record<string, typeof renderProfessional> = {
  professional: renderProfessional,
  bold: renderBold,
  minimal: renderMinimal,
};

// ── Google Drive helpers (copied from image-gen for persistence) ─────
async function getDriveAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Drive token error ${tokenRes.status}: ${text}`);
  }
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function uploadToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  data: ArrayBuffer,
): Promise<{ id: string; webViewLink: string }> {
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
  });

  const boundary = "media_upload_boundary";
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n`;

  const encoder = new TextEncoder();
  const prefix = encoder.encode(body);
  const base64Data = Buffer.from(data).toString("base64");
  const suffix = encoder.encode(`\r\n--${boundary}--`);
  const fullBody = Buffer.concat([
    prefix,
    encoder.encode(base64Data),
    suffix,
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: fullBody,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive upload error ${res.status}: ${text}`);
  }
  const file = await res.json();

  // Make shareable (anyone with link)
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  );

  return { id: file.id, webViewLink: file.webViewLink };
}

// ── Reference Photo / Character Generation ──────────────────────────

const CHARACTER_STYLE_PROMPT =
  "Transform this person into a vintage American comic book style portrait. " +
  "Ben-Day halftone dot shading throughout. Warm cream and beige background. " +
  "Bold black ink outlines. Hand-drawn comic book art style, Marvel/DC vintage era. " +
  "Keep the person's exact facial features, hair, skin tone, beard, and clothing recognizable. " +
  "Three-quarter chest-up pose, confident professional expression. Square format. " +
  "Absolutely NO TEXT, NO WORDS, NO WRITING, NO LETTERS anywhere in the image.";

const CHARACTER_FALLBACK_PROMPT =
  "Vintage American comic book style portrait of a confident Black man in his mid-30s. " +
  "Clean short faded hair, neatly trimmed goatee and chin beard. " +
  "Wearing a gray plaid double-breasted blazer over a white crew-neck t-shirt. " +
  "Ben-Day halftone dot shading. Warm cream background. Bold black ink outlines. " +
  "Vintage comic book art style. Three-quarter chest-up pose. Square format. " +
  "NO TEXT, NO WORDS, NO WRITING anywhere.";

async function loadReferencePhoto(
  photoPath?: string,
  photoUrl?: string,
): Promise<{ data: Buffer; mimeType: string; sourceKey: string } | null> {
  const fs = require("fs");
  const crypto = require("crypto");

  // Try local path first (Jonnymate case)
  if (photoPath && fs.existsSync(photoPath)) {
    const data = fs.readFileSync(photoPath);
    const stat = fs.statSync(photoPath);
    const sourceKey = crypto
      .createHash("sha256")
      .update(`${photoPath}:${stat.mtimeMs}:${stat.size}`)
      .digest("hex")
      .slice(0, 16);
    const ext = photoPath.toLowerCase().split(".").pop();
    const mimeType =
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    return { data, mimeType, sourceKey };
  }

  // Try remote URL (DynoClaw case)
  if (photoUrl) {
    const res = await fetch(photoUrl);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const sourceKey = crypto
      .createHash("sha256")
      .update(`${photoUrl}:${buf.length}`)
      .digest("hex")
      .slice(0, 16);
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return { data: buf, mimeType: contentType, sourceKey };
  }

  return null;
}

/**
 * Generate a comic-styled character portrait via Gemini.
 * If a reference photo is provided, Gemini uses it as visual input (image-to-image).
 * Results are cached on disk by source photo key to avoid re-generating.
 */
async function generateComicCharacter(opts: {
  apiKey: string;
  referencePhotoPath?: string;
  referencePhotoUrl?: string;
}): Promise<string> {
  if (!opts.apiKey) {
    throw new Error("No Gemini API key configured for character generation");
  }

  const fs = require("fs");
  const path = require("path");

  // Load reference photo if configured
  const reference = await loadReferencePhoto(
    opts.referencePhotoPath,
    opts.referencePhotoUrl,
  );

  // Check cache (keyed by source photo content hash)
  const cacheKey = reference?.sourceKey ?? "no-reference";
  const cacheDir = opts.referencePhotoPath
    ? path.join(path.dirname(opts.referencePhotoPath), ".cache")
    : "/tmp/comic-char-cache";
  const cachePath = path.join(cacheDir, `${cacheKey}.png`);

  try {
    if (fs.existsSync(cachePath)) {
      const cached = fs.readFileSync(cachePath);
      return `data:image/png;base64,${cached.toString("base64")}`;
    }
  } catch {
    // fall through and regenerate
  }

  // Build Gemini request
  const parts: Array<any> = [];
  if (reference) {
    parts.push({
      inline_data: {
        mime_type: reference.mimeType,
        data: reference.data.toString("base64"),
      },
    });
    parts.push({ text: CHARACTER_STYLE_PROMPT });
  } else {
    parts.push({ text: CHARACTER_FALLBACK_PROMPT });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${opts.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini character generation failed ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const imagePart = data?.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData || p.inline_data,
  );
  const b64 = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
  if (!b64) {
    throw new Error(
      `No image in Gemini response: ${JSON.stringify(data).slice(0, 300)}`,
    );
  }

  // Cache for next time
  try {
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath, Buffer.from(b64, "base64"));
  } catch (err) {
    console.warn("Failed to cache character:", err);
  }

  return `data:image/png;base64,${b64}`;
}

// ── Media persistence helper ────────────────────────────────────────
async function persistMedia(opts: {
  convexUrl?: string;
  driveFolderId?: string;
  driveClientId?: string;
  driveClientSecret?: string;
  driveRefreshToken?: string;
  base64Data: string;
  mimeType: string;
  prompt: string;
  provider: string;
}): Promise<{ convexUrl?: string; driveUrl?: string }> {
  const result: { convexUrl?: string; driveUrl?: string } = {};

  // Store to Convex
  if (opts.convexUrl) {
    try {
      const convexRes = await fetch(
        `${opts.convexUrl}/api/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "mediaActions:storeImage",
            args: {
              base64Data: opts.base64Data,
              mimeType: opts.mimeType,
              prompt: opts.prompt,
              provider: opts.provider,
            },
          }),
        },
      );
      if (convexRes.ok) {
        const data = await convexRes.json();
        result.convexUrl = data.value?.url;
      } else {
        const text = await convexRes.text();
        console.error(`Convex action failed ${convexRes.status}: ${text}`);
      }
    } catch (err) {
      console.error("Convex storage failed:", err);
    }
  }

  // Upload to Google Drive
  if (opts.driveFolderId && opts.driveClientId && opts.driveClientSecret && opts.driveRefreshToken) {
    try {
      const imageBuffer = Buffer.from(opts.base64Data, "base64").buffer;
      const accessToken = await getDriveAccessToken(
        opts.driveClientId,
        opts.driveClientSecret,
        opts.driveRefreshToken,
      );
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `carousel-${timestamp}.png`;

      const driveFile = await uploadToDrive(
        accessToken,
        opts.driveFolderId,
        fileName,
        opts.mimeType,
        imageBuffer,
      );
      result.driveUrl = driveFile.webViewLink;
    } catch (err) {
      console.error("Drive upload failed:", err);
    }
  }

  return result;
}

// ── Plugin ──────────────────────────────────────────────────────────
const carouselGenPlugin = {
  id: "carousel-gen",
  name: "Carousel Generator",
  description:
    "Generate social media carousel images (1080x1080 PNGs) from structured content. " +
    "Supports three template styles: professional, bold, and minimal. " +
    "Configurable branding per call (name, colors, handle). " +
    "Images are persisted to Convex and Google Drive if configured.",
  configSchema: {
    type: "object" as const,
    properties: {
      convexUrl: { type: "string" as const },
      driveFolderId: { type: "string" as const },
      driveClientId: { type: "string" as const },
      driveClientSecret: { type: "string" as const },
      driveRefreshToken: { type: "string" as const },
      geminiApiKey: { type: "string" as const },
      referencePhotoPath: { type: "string" as const },
      referencePhotoUrl: { type: "string" as const },
    },
  },
  register(pluginApi: any) {
    const convexUrl = pluginApi.pluginConfig?.convexUrl;
    const driveFolderId = pluginApi.pluginConfig?.driveFolderId;
    const driveClientId = pluginApi.pluginConfig?.driveClientId;
    const driveClientSecret = pluginApi.pluginConfig?.driveClientSecret;
    const driveRefreshToken = pluginApi.pluginConfig?.driveRefreshToken;
    const geminiApiKey =
      pluginApi.pluginConfig?.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const referencePhotoPath = pluginApi.pluginConfig?.referencePhotoPath;
    const referencePhotoUrl = pluginApi.pluginConfig?.referencePhotoUrl;

    pluginApi.registerTool({
      name: "generate_carousel",
      label: "Generate Carousel",
      description:
        "Generate social media carousel images (1080x1080 PNGs) from structured content. " +
        "Provide a headline, array of slides with subtitle+body, and optional CTA. " +
        "Choose from three templates: professional (yellow/teal), bold (blue/orange), or minimal (navy/yellow). " +
        "Override brand colors, name, handle, and URL per call. " +
        "Returns an array of base64-encoded PNG images, one per slide.",
      parameters: Type.Object({
        headline: Type.String({
          description: "Cover slide headline text",
        }),
        slides: Type.Array(
          Type.Object({
            subtitle: Type.String({ description: "Slide subtitle/heading" }),
            body: Type.String({ description: "Slide body text" }),
          }),
          { description: "Content slides (each with subtitle and body)" },
        ),
        cta: Type.Optional(
          Type.String({
            description: 'Final slide CTA text (default: "Thank You")',
          }),
        ),
        template: Type.Optional(
          Type.String({
            description:
              'Template style: "professional" (default), "bold", or "minimal"',
          }),
        ),
        brandName: Type.Optional(
          Type.String({ description: "Brand name displayed on slides" }),
        ),
        brandHandle: Type.Optional(
          Type.String({ description: 'Social handle e.g. "@dynoclaw"' }),
        ),
        brandUrl: Type.Optional(
          Type.String({ description: "Website URL shown in footer" }),
        ),
        primaryColor: Type.Optional(
          Type.String({ description: "Primary brand color hex (default per template)" }),
        ),
        accentColor: Type.Optional(
          Type.String({ description: "Accent/secondary color hex (default per template)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const templateName = (params.template || "professional").toLowerCase();
          const renderer = TEMPLATE_RENDERERS[templateName];
          if (!renderer) {
            return json({
              error: `Unknown template "${templateName}". Use "professional", "bold", or "minimal".`,
            });
          }

          const defaults = TEMPLATE_DEFAULTS[templateName];
          const brand: Brand = {
            name: params.brandName || "Brand",
            handle: params.brandHandle || "",
            url: params.brandUrl || "",
            primaryColor: params.primaryColor || defaults.primary,
            accentColor: params.accentColor || defaults.accent,
          };

          // Build slide list: cover + content slides + CTA
          const allSlides: Array<{
            headline?: string;
            subtitle?: string;
            body?: string;
            cta?: string;
          }> = [];

          // Cover slide
          allSlides.push({ headline: params.headline });

          // Content slides
          for (const s of params.slides) {
            allSlides.push({ subtitle: s.subtitle, body: s.body });
          }

          // CTA slide
          allSlides.push({ cta: params.cta || "Thank You" });

          const total = allSlides.length;

          // Generate HTML for each slide
          const htmlSlides = allSlides.map((slide, i) =>
            renderer(slide, i, total, brand),
          );

          // Launch Puppeteer and screenshot each slide
          const puppeteer = require("puppeteer");
          const browser = await puppeteer.launch({
            headless: true,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--disable-extensions",
              "--disable-background-networking",
            ],
          });

          const results: Array<{
            slideIndex: number;
            imageBase64: string;
            convexUrl?: string;
            driveUrl?: string;
          }> = [];

          try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1080, height: 1080 });

            // Block external font requests — templates use local fallback fonts
            await page.setRequestInterception(true);
            page.on("request", (req: any) => {
              if (req.resourceType() === "font" || req.url().includes("fonts.googleapis.com") || req.url().includes("fonts.gstatic.com")) {
                req.abort();
              } else {
                req.continue();
              }
            });

            for (let i = 0; i < htmlSlides.length; i++) {
              await page.setContent(htmlSlides[i], {
                waitUntil: "domcontentloaded",
              });
              const screenshot = await page.screenshot({
                type: "png",
                encoding: "base64",
              });

              results.push({
                slideIndex: i,
                imageBase64: screenshot as string,
              });
            }
          } finally {
            await browser.close();
          }

          // Persist all slides in parallel after browser is closed
          const persistPromises = results.map((r, i) =>
            persistMedia({
              convexUrl,
              driveFolderId,
              driveClientId,
              driveClientSecret,
              driveRefreshToken,
              base64Data: r.imageBase64,
              mimeType: "image/png",
              prompt: `Carousel slide ${i + 1}/${total}: ${params.headline}`,
              provider: "carousel-gen",
            }).then((stored) => {
              if (stored.convexUrl) r.convexUrl = stored.convexUrl;
              if (stored.driveUrl) r.driveUrl = stored.driveUrl;
            })
          );
          await Promise.all(persistPromises);

          return json({
            status: "completed",
            template: templateName,
            slideCount: results.length,
            slides: results.map((r) => ({
              slideIndex: r.slideIndex,
              imageBase64: r.convexUrl ? undefined : r.imageBase64,
              imageUrl: r.convexUrl,
              convexUrl: r.convexUrl,
              driveUrl: r.driveUrl,
            })),
            message: results[0]?.convexUrl
              ? `Generated ${results.length} carousel slides. Images stored permanently.`
              : `Generated ${results.length} carousel slides. Images returned as base64.`,
          });
        } catch (err) {
          return json({
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    // ── Comic Brief Generator ──────────────────────────────────────
    pluginApi.registerTool({
      name: "generate_comic_brief",
      label: "Generate Comic Brief",
      description:
        "Generate a vintage comic-book-style briefing image (1400x1000) with 4 news sections. " +
        "All text is rendered in HTML/CSS for perfect legibility — no AI text hallucination. " +
        "Each section supports mini-tweet-sized body text (120-240 chars) for real context. " +
        "For best results, first call image_generate with a portrait prompt of a confident Black man in his mid-30s with short faded hair, trimmed goatee, wearing a gray plaid double-breasted blazer over a white t-shirt with a thin silver chain necklace, cream background, ben-day halftone, comic book style, NO TEXT. " +
        "Pass the resulting image as characterImageDataUrl. " +
        "Use this instead of image_generate for daily briefings, newsletters, and structured news content.",
      parameters: Type.Object({
        title: Type.String({
          description: 'Main title, e.g. "DAILY BRIEFING APRIL 8 2026"',
        }),
        sections: Type.Array(
          Type.Object({
            label: Type.String({ description: 'Section label, e.g. "TECH"' }),
            headline: Type.String({ description: 'Short punchy headline (under 10 words)' }),
            body: Type.String({
              description:
                'Mini-tweet sized summary with real context (120-240 characters). ' +
                'Include specific numbers, names, or facts — not just a rewording of the headline. ' +
                'Readers should get actionable info without clicking through.',
            }),
            icon: Type.Optional(
              Type.String({
                description: 'Icon type: "tech", "health", "africa", "fintech", or "summary". Auto-detected from label if omitted.',
              }),
            ),
          }),
          {
            description: 'Exactly 4 sections: Tech, Health, Africa, Fintech (or similar)',
            minItems: 4,
            maxItems: 4,
          },
        ),
        footer: Type.String({
          description: 'Footer text, typically author signature',
        }),
        characterSpeechBubble: Type.Optional(
          Type.String({
            description: 'Short text (under 10 words) for the character speech bubble',
          }),
        ),
        summary: Type.Optional(
          Type.String({
            description: 'Optional summary/CTA text',
          }),
        ),
        characterImageDataUrl: Type.Optional(
          Type.String({
            description: 'Base64 data URL for character portrait (data:image/jpeg;base64,...). Generate first with image_generate using a text-free prompt.',
          }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          // Auto-generate character from reference photo if:
          // 1. Caller didn't pass characterImageDataUrl explicitly
          // 2. Plugin has a reference photo configured (path or URL)
          // 3. Plugin has a Gemini API key
          let characterImageDataUrl = params.characterImageDataUrl;
          if (
            !characterImageDataUrl &&
            geminiApiKey &&
            (referencePhotoPath || referencePhotoUrl)
          ) {
            try {
              characterImageDataUrl = await generateComicCharacter({
                apiKey: geminiApiKey,
                referencePhotoPath,
                referencePhotoUrl,
              });
            } catch (err) {
              console.warn("Character generation from reference failed, using fallback:", err);
            }
          }

          const html = renderComicBrief({
            title: params.title,
            sections: params.sections as ComicBriefSection[],
            footer: params.footer,
            summary: params.summary,
            characterSpeechBubble: params.characterSpeechBubble,
            characterImageDataUrl,
          });

          const puppeteer = require("puppeteer");
          const browser = await puppeteer.launch({
            headless: true,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--disable-extensions",
              "--disable-background-networking",
            ],
          });

          let imageBase64 = "";
          try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });

            // Block external font/image requests — template is self-contained
            await page.setRequestInterception(true);
            page.on("request", (req: any) => {
              const url = req.url();
              if (
                req.resourceType() === "font" ||
                url.includes("fonts.googleapis.com") ||
                url.includes("fonts.gstatic.com")
              ) {
                req.abort();
              } else {
                req.continue();
              }
            });

            await page.setContent(html, { waitUntil: "domcontentloaded" });
            const screenshot = await page.screenshot({
              type: "png",
              encoding: "base64",
              fullPage: false,
              clip: { x: 0, y: 0, width: 1400, height: 1000 },
            });
            imageBase64 = screenshot as string;
          } finally {
            await browser.close();
          }

          // Persist to Convex + Drive
          const stored = await persistMedia({
            convexUrl,
            driveFolderId,
            driveClientId,
            driveClientSecret,
            driveRefreshToken,
            base64Data: imageBase64,
            mimeType: "image/png",
            prompt: `Comic brief: ${params.title}`,
            provider: "comic-brief",
          });

          return json({
            status: "completed",
            title: params.title,
            sectionCount: params.sections.length,
            imageUrl: stored.convexUrl,
            driveUrl: stored.driveUrl,
            imageBase64: stored.convexUrl ? undefined : imageBase64,
            message: stored.convexUrl
              ? `Comic brief generated and stored: ${stored.convexUrl}`
              : `Comic brief generated (base64 returned).`,
          });
        } catch (err) {
          return json({
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    // ── Reference Photo Management ─────────────────────────────────
    pluginApi.registerTool({
      name: "set_reference_photo",
      label: "Set Reference Photo",
      description:
        "Upload or update the reference photo used to generate comic-styled character portraits. " +
        "Accepts a base64-encoded image. Overwrites the existing reference photo and invalidates the cache, " +
        "so the next comic brief will re-generate the character from the new photo.",
      parameters: Type.Object({
        base64Image: Type.String({
          description: 'Base64-encoded image data (no data: URL prefix)',
        }),
        mimeType: Type.Optional(
          Type.String({
            description: 'Image MIME type, e.g. "image/jpeg" or "image/png" (default: image/png)',
          }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          if (!referencePhotoPath) {
            return json({
              error:
                "No reference photo path configured. Set plugins.carousel-gen.config.referencePhotoPath first.",
            });
          }

          const fs = require("fs");
          const path = require("path");

          // Ensure directory exists
          const dir = path.dirname(referencePhotoPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

          // Write the photo
          const buf = Buffer.from(params.base64Image, "base64");
          fs.writeFileSync(referencePhotoPath, buf);

          // Clear the cache so next comic brief regenerates
          const cacheDir = path.join(dir, ".cache");
          if (fs.existsSync(cacheDir)) {
            for (const file of fs.readdirSync(cacheDir)) {
              try {
                fs.unlinkSync(path.join(cacheDir, file));
              } catch {}
            }
          }

          return json({
            status: "updated",
            path: referencePhotoPath,
            size: buf.length,
            message:
              "Reference photo updated. Cache cleared — next comic brief will regenerate the character.",
          });
        } catch (err) {
          return json({
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });
  },
};

export default carouselGenPlugin;
