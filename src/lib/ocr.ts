import Tesseract from "tesseract.js";

export type OcrResult = {
  rawText: string;
  macAddress?: string;
  companyName?: string;
  serialNumber?: string;
};

const MAC_REGEX = /\b([0-9A-Fa-f]{2}[:.-]?){5}[0-9A-Fa-f]{2}\b/;

// Common ONU/ISP-equipment brand names to match against the label text.
const KNOWN_COMPANIES = [
  "DIGISOL",
  "HUAWEI",
  "ZTE",
  "NOKIA",
  "FIBERHOME",
  "TP-LINK",
  "D-LINK",
  "CISCO",
  "GPON",
  "VSOL",
  "BDCOM",
];

export async function runOcr(
  imageSource: File | Blob | string,
  onProgress?: (p: number) => void
): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(imageSource, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const rawText = data.text;
  return {
    rawText,
    macAddress: extractMac(rawText),
    companyName: extractCompany(rawText),
    serialNumber: extractSerial(rawText),
  };
}

function extractMac(text: string): string | undefined {
  const cleaned = text.replace(/\n/g, " ");
  const match = cleaned.match(MAC_REGEX);
  if (!match) return undefined;
  return match[0].toUpperCase().replace(/[.\s]/g, ":");
}

function extractCompany(text: string): string | undefined {
  const upper = text.toUpperCase();
  for (const name of KNOWN_COMPANIES) {
    if (upper.includes(name)) return name;
  }
  // Fallback: first non-empty line, often the brand on these labels
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 2);
  return firstLine;
}

function extractSerial(text: string): string | undefined {
  const match = text.match(/S\/?N\s*[:.]?\s*([A-Za-z0-9]{6,})/i);
  return match?.[1];
}
