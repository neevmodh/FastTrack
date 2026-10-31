// Server-side only. Reads an ONU label photo with a vision-LLM and returns
// structured fields directly — this sidesteps classical OCR's failure modes
// entirely (barcode-adjacent text, glare, noisy backgrounds) because the
// model reads the image holistically instead of doing pixel-level glyph
// recognition + layout analysis.

export type VisionOcrResult = {
  companyName?: string;
  macAddress?: string;
  model?: string;
  serialNumber?: string;
  ponSerial?: string;
  specSummary?: string;
  engine: "gemini" | "groq";
};

const PROMPT = `You are reading the printed label on the back of a GPON ONU/ONT (fiber internet router) device. Extract the following fields and return ONLY a JSON object, no markdown, no commentary:

{
  "companyName": the brand name printed on the label (e.g. "DIGISOL", "Syrotech", "Sharp"), or null if not visible,
  "macAddress": the MAC address value (the string printed after "MAC:"), normalized to 12 uppercase hex characters with no separators (e.g. "54A24518C62F"), or null if not visible,
  "model": the model/product code printed after "Model:", "Mode:", or "Product Code:" (e.g. "DG-GR6011"), or null,
  "serialNumber": the unit serial number printed after "S/N:" or "SN:" that is NOT labeled "PON S/N" or "GPON SN" (the hardware serial, not the PON serial), or null,
  "ponSerial": the PON/GPON serial printed after "PON S/N:" or "GPON SN:" (usually starts with "GPON"), or null,
  "specSummary": a short description of the device's ports/interfaces if printed (e.g. "1 PON, 1 GIG LAN PORT & 1 FXS PORT" or "2GE+1POTS+WiFi AC"), or null
}

Read carefully — MAC addresses and serial numbers are easy to confuse with each other and with barcodes printed near them. Only extract text you can actually see; do not guess or invent values.`;

async function fileToBase64(file: File | Blob): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return buf.toString("base64");
}

function parseJsonFromText(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

function normalize(raw: Record<string, unknown>): Omit<VisionOcrResult, "engine"> {
  const str = (v: unknown) =>
    typeof v === "string" && v.trim().length > 0 && v.toLowerCase() !== "null"
      ? v.trim()
      : undefined;

  return {
    companyName: str(raw.companyName),
    macAddress: str(raw.macAddress)?.toUpperCase().replace(/[^0-9A-F]/g, ""),
    model: str(raw.model),
    serialNumber: str(raw.serialNumber),
    ponSerial: str(raw.ponSerial),
    specSummary: str(raw.specSummary),
  };
}

async function recognizeWithGemini(
  file: File | Blob,
  apiKey: string
): Promise<VisionOcrResult> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || "image/jpeg";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }

  const body = await res.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");

  return { ...normalize(parseJsonFromText(text)), engine: "gemini" };
}

async function recognizeWithGroq(
  file: File | Blob,
  apiKey: string,
  model: string
): Promise<VisionOcrResult> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || "image/jpeg";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  }

  const body = await res.json();
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no text");

  return { ...normalize(parseJsonFromText(text)), engine: "groq" };
}

// Tries Gemini first (better at fine-grained label text), falls back to
// Groq (faster, weaker at small text) if Gemini is unavailable or errors.
export async function recognizeWithVisionLlm(
  file: File | Blob
): Promise<VisionOcrResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const errors: string[] = [];

  if (geminiKey) {
    try {
      return await recognizeWithGemini(file, geminiKey);
    } catch (err) {
      errors.push(`Gemini: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Groq currently has no vision-capable model available on the free tier
  // (confirmed against their live /models list) — only attempt it if a
  // specific vision model is explicitly configured, so we don't burn a
  // request on a guaranteed-wrong default model name.
  if (groqKey && process.env.GROQ_VISION_MODEL) {
    try {
      return await recognizeWithGroq(file, groqKey, process.env.GROQ_VISION_MODEL);
    } catch (err) {
      errors.push(`Groq: ${err instanceof Error ? err.message : err}`);
    }
  }

  throw new Error(
    `No vision OCR provider available. ${errors.join(" | ") || "No API keys configured."}`
  );
}
