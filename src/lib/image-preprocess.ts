// Browser-side preprocessing to improve OCR accuracy on phone photos of
// ONU labels: upscale small images, convert to grayscale, and stretch
// contrast. This runs on a <canvas> so it has no server/library dependency.
export async function preprocessForOcr(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const targetWidth = Math.max(bitmap.width, 1600);
  const scale = targetWidth / bitmap.width;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  // Grayscale
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }

  // Contrast stretch (min-max normalize) — skip if the range is already flat
  const range = max - min;
  if (range > 10) {
    for (let i = 0; i < data.length; i += 4) {
      const stretched = ((data[i] - min) / range) * 255;
      data[i] = data[i + 1] = data[i + 2] = stretched;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/png");
  });
}
