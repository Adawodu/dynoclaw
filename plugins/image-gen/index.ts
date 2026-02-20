import { Type } from "@sinclair/typebox";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

// ── Imagen helpers ─────────────────────────────────────────────────────
const IMAGEN_BASE = "https://generativelanguage.googleapis.com/v1beta";
const IMAGEN_MODEL = "imagen-4.0-generate-001";

async function imagenGenerate(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
) {
  const res = await fetch(
    `${IMAGEN_BASE}/models/${IMAGEN_MODEL}:predict`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
        },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Imagen error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── DALL-E helpers ─────────────────────────────────────────────────────
const DALLE_URL = "https://api.openai.com/v1/images/generations";

function aspectRatioToSize(ar: string): string {
  if (ar === "9:16") return "1024x1792";
  if (ar === "16:9") return "1792x1024";
  return "1024x1024";
}

async function dalleGenerate(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
) {
  const res = await fetch(DALLE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: aspectRatioToSize(aspectRatio),
      quality: "standard",
      response_format: "url",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DALL-E error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Plugin ─────────────────────────────────────────────────────────────
const imageGenPlugin = {
  id: "image-gen",
  name: "Image Generation",
  description:
    "Generate images using Google Imagen 4 (default) or OpenAI DALL-E 3.",
  configSchema: {
    type: "object" as const,
    properties: {
      geminiApiKey: { type: "string" as const },
      openaiApiKey: { type: "string" as const },
    },
    required: ["geminiApiKey"],
  },
  register(pluginApi: any) {
    const geminiApiKey = pluginApi.pluginConfig?.geminiApiKey;
    const openaiApiKey = pluginApi.pluginConfig?.openaiApiKey;

    if (!geminiApiKey) {
      pluginApi.logger?.warn?.("geminiApiKey not configured for image-gen");
      return;
    }

    pluginApi.registerTool({
      name: "image_generate",
      label: "Generate Image",
      description:
        "Generate an image from a text prompt. Uses Google Imagen 4 by default (fast & high quality). " +
        "Optionally specify provider='dalle' for OpenAI DALL-E 3. " +
        "Imagen returns base64 image data. DALL-E returns a temporary URL (expires in ~1 hour).",
      parameters: Type.Object({
        prompt: Type.String({
          description: "Text description of the image to generate",
        }),
        provider: Type.Optional(
          Type.String({
            description:
              'Image provider: "imagen" (default, Google Imagen 4) or "dalle" (OpenAI DALL-E 3)',
          }),
        ),
        aspectRatio: Type.Optional(
          Type.String({
            description:
              'Aspect ratio: "1:1" (default, square), "16:9" (landscape), or "9:16" (portrait)',
          }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        const provider = (params.provider || "imagen").toLowerCase();
        const aspectRatio = params.aspectRatio || "1:1";

        try {
          if (provider === "dalle") {
            if (!openaiApiKey) {
              return json({
                error:
                  "OpenAI API key not configured. Cannot use DALL-E provider.",
              });
            }

            const data = await dalleGenerate(
              openaiApiKey,
              params.prompt,
              aspectRatio,
            );
            const image = data.data?.[0];
            return json({
              provider: "dalle",
              status: "completed",
              imageUrl: image?.url,
              revisedPrompt: image?.revised_prompt,
              message:
                "Image generated successfully. URL expires in ~1 hour.",
            });
          }

          // Default: Imagen
          const data = await imagenGenerate(
            geminiApiKey,
            params.prompt,
            aspectRatio,
          );
          const prediction = data.predictions?.[0];
          if (!prediction?.bytesBase64Encoded) {
            return json({
              provider: "imagen",
              status: "failed",
              error: "No image data in response",
              raw: data,
            });
          }

          return json({
            provider: "imagen",
            status: "completed",
            mimeType: prediction.mimeType || "image/jpeg",
            imageBase64: prediction.bytesBase64Encoded,
            message:
              "Image generated successfully. The imageBase64 field contains the base64-encoded image data.",
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

export default imageGenPlugin;
