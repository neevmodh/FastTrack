import Tesseract from "tesseract.js";

export type OcrResult = {
  rawText: string;
  macAddress?: string;
  companyName?: string;
  serialNumber?: string;
  ponSerial?: string;
  model?: string;
  specSummary?: string;
};

const MAC_REGEX = /\b([0-9A-Fa-f]{2}[:.-]?){5}[0-9A-Fa-f]{2}\b/;

// Brand names seen on ONU/ONT labels. Order doesn't matter for correctness,
// but keep more-specific names before generic substrings of them.
const KNOWN_COMPANIES = [
  "DIGISOL",
  "SYROTECH",
  "SHARP VISION",
  "SHARP",
  "HUAWEI",
  "ZTE",
  "NOKIA",
  "FIBERHOME",
  "TP-LINK",
  "D-LINK",
  "CISCO",
  "VSOL",
  "BDCOM",
  "IBALL",
  "TENDA",
  "NETGEAR",
];

// Port/interface spec keywords that identify the descriptive "what this
// device is" line, e.g. "1 PON, 1 GIG LAN PORT & 1 FXS PORT" or
// "2GE+1POTS+WiFi AC".
const SPEC_LINE_REGEX =
  /\b\d+\s*(?:GE|GIG|PON|LAN|FXS|POTS|PORT|WiFi|USB)\b/i;

async function recognizeWithTesseract(
  imageSource: File | Blob | string,
  onProgress?: (p: number) => void
): Promise<string> {
  const { data } = await Tesseract.recognize(imageSource, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return data.text;
}

function buildResult(rawText: string): OcrResult {
  return {
    rawText,
    macAddress: extractMac(rawText),
    companyName: extractCompany(rawText),
    serialNumber: extractUnitSerial(rawText),
    ponSerial: extractPonSerial(rawText),
    model: extractModel(rawText),
    specSummary: extractSpecSummary(rawText),
  };
}

// On-device, offline-capable OCR. This is the fallback path used by
// OcrCapture only when the server-side vision-LLM endpoint (/api/ocr,
// Gemini) is unreachable — e.g. no network in the field. Verified against
// real ONU label photos: the vision-LLM path got company+MAC exactly right
// on 5/5 test photos, while Tesseract alone missed the MAC on 3/5 (barcode-
// adjacent text is a known weak spot for its layout analysis). Keep this as
// the safety net, not the primary path.
export async function runOcr(
  imageSource: File | Blob | string,
  onProgress?: (p: number) => void
): Promise<OcrResult> {
  const text = await recognizeWithTesseract(imageSource, onProgress);
  return buildResult(text);
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
  // Fallback: first non-empty line that isn't obviously a field/label line.
  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find(
      (l) =>
        l.length > 2 &&
        !/^(MAC|S\/?N|PON|WAN|GPON|IP|SSID|USERNAME|PASSWORD|MODEL|MODE|POWER|DEFAULT|PROD)/i.test(
          l
        )
    );
  return firstLine;
}

// The real unit/hardware serial — a line starting with "S/N" or "SN" that is
// NOT the "PON S/N" / "GPON SN" line (those are the PON serial, extracted
// separately below).
function extractUnitSerial(text: string): string | undefined {
  const lines = text.split("\n");
  for (const line of lines) {
    if (/PON/i.test(line)) continue; // skip "PON S/N:" / "GPON SN:" lines
    const match = line.match(/\bS\/?N\s*[:.]?\s*([A-Za-z0-9]{6,})/i);
    if (match) return match[1];
  }
  return undefined;
}

// The PON/GPON serial, e.g. "PON S/N: GPON0018C62F" or "GPON SN: 4857...".
// The "PON S/N:" / "GPON SN:" label text is frequently mis-OCR'd on noisy
// label photos, but the value itself reliably starts with "GPON" — so match
// on that token directly rather than relying on the label prefix.
function extractPonSerial(text: string): string | undefined {
  const labeled = text.match(
    /(?:PON\s*S\/?N|GPON\s*SN|PON\s*:)\s*[:.]?\s*([A-Za-z0-9]{6,})/i
  );
  if (labeled) return labeled[1];

  const bareToken = text.match(/\bGPON[0-9A-Za-z]{6,}\b/i);
  return bareToken?.[0];
}

// Model / product code, e.g. "Model: DG-GR6011", "Mode: AS352DX pro",
// "Product Code: SY-GPON-1110-WDONT". Matched per-line so OCR noise on an
// adjacent line can't bleed into the captured value.
function extractModel(text: string): string | undefined {
  for (const line of text.split("\n")) {
    const match = line.match(
      /(?:Model|Mode|Product\s*Code)\s*[:.]?\s*([A-Za-z0-9][A-Za-z0-9/_-]{2,})/i
    );
    if (match) return match[1];
  }
  return undefined;
}

// The descriptive spec line, e.g. "DIGISOL XPON ONU Router with 1 PON and
// 1 Giga Port" or "DIGISOL XPON ONU Router 2GE+1POTS+WiFi AC".
function extractSpecSummary(text: string): string | undefined {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const specLines = lines.filter(
    (l) => SPEC_LINE_REGEX.test(l) && !/^(MAC|S\/?N|PON|WAN|GPON)/i.test(l)
  );

  if (specLines.length === 0) return undefined;
  return specLines.slice(0, 2).join(" ");
}
