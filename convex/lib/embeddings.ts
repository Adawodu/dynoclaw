"use node";

/**
 * Generate a vector embedding using Google's Gemini embedding model.
 * Uses 1536 dimensions to match the existing Convex vector index schema.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: 1536,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini embedding API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error(`Gemini embedding API returned invalid response: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return values;
}
