// Browser-only. PaddleOCR's detection network handles barcode-adjacent text
// (the common case on ONU labels: "MAC: ..." printed directly under a
// barcode) much better than Tesseract's layout analysis, which repeatedly
// failed on exactly that pattern in testing. Models load from Baidu's CDN
// on first use — give it a timeout and let the caller fall back to
// Tesseract if it's slow/unreachable/unsupported (e.g. no WebGL).

let initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = import("@paddlejs-models/ocr").then((ocr) => ocr.init());
  }
  await initPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("PaddleOCR timed out")), ms)
    ),
  ]);
}

function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for OCR"));
    img.src = typeof source === "string" ? source : URL.createObjectURL(source);
  });
}

export async function recognizeWithPaddle(
  source: File | Blob | string,
  timeoutMs = 12000
): Promise<string> {
  await withTimeout(ensureInit(), timeoutMs);
  const ocr = await import("@paddlejs-models/ocr");
  const img = await loadImage(source);
  const res = await withTimeout(ocr.recognize(img), timeoutMs);
  return Array.isArray(res.text) ? res.text.join("\n") : res.text ?? "";
}
