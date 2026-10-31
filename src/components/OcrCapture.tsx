"use client";

import { useRef, useState } from "react";
import { runOcr } from "@/lib/ocr";
import { preprocessForOcr } from "@/lib/image-preprocess";

export type OcrCaptureValue = {
  photoUrl?: string;
  companyName: string;
  macAddress: string;
  serialNumber: string;
  ponSerial: string;
  model: string;
  specSummary: string;
};

export default function OcrCapture({
  onChange,
}: {
  onChange: (value: OcrCaptureValue) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fellBackToOnDevice, setFellBackToOnDevice] = useState(false);
  const [fields, setFields] = useState<OcrCaptureValue>({
    companyName: "",
    macAddress: "",
    serialNumber: "",
    ponSerial: "",
    model: "",
    specSummary: "",
  });

  function update(partial: Partial<OcrCaptureValue>) {
    const next = { ...fields, ...partial };
    setFields(next);
    onChange(next);
  }

  async function handleFile(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    setProgress(0);

    // Upload the photo and ask the vision-LLM OCR endpoint to read it, in
    // parallel. That endpoint (Gemini, falling back to Groq) reads the
    // image holistically and is far more accurate than classical OCR on
    // these labels — barcodes next to text and glare routinely defeat
    // pixel-level OCR but don't trip up a vision model.
    setUploading(true);
    const uploadPromise = (async () => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        update({ photoUrl: url });
      }
    })().finally(() => setUploading(false));

    let usedFallback = false;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ocr", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();

      update({
        companyName: result.companyName ?? fields.companyName,
        macAddress: result.macAddress ?? fields.macAddress,
        serialNumber: result.serialNumber ?? fields.serialNumber,
        ponSerial: result.ponSerial ?? fields.ponSerial,
        model: result.model ?? fields.model,
        specSummary: result.specSummary ?? fields.specSummary,
      });
    } catch (err) {
      usedFallback = true;
      console.warn("Vision OCR unavailable, falling back to on-device OCR", err);
      const processed = await preprocessForOcr(file).catch(() => file);
      const result = await runOcr(processed, setProgress);

      update({
        companyName: result.companyName ?? fields.companyName,
        macAddress: result.macAddress ?? fields.macAddress,
        serialNumber: result.serialNumber ?? fields.serialNumber,
        ponSerial: result.ponSerial ?? fields.ponSerial,
        model: result.model ?? fields.model,
        specSummary: result.specSummary ?? fields.specSummary,
      });
    }

    setProgress(null);
    setFellBackToOnDevice(usedFallback);
    await uploadPromise;
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-neutral-300 px-4 py-8 text-base font-semibold text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
        >
          📷 {previewUrl ? "Retake photo" : "Take photo of ONU label"}
        </button>
      </div>

      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="ONU label"
          className="max-h-48 w-full rounded-md object-contain border border-neutral-200"
        />
      )}

      {progress !== null && (
        <p className="text-sm text-neutral-600">
          {fellBackToOnDevice
            ? `Cloud OCR unavailable, reading on-device... ${progress}%`
            : "Reading label..."}
        </p>
      )}
      {uploading && <p className="text-sm text-neutral-600">Uploading photo...</p>}

      <div className="grid grid-cols-1 gap-3">
        <Field
          label="Company / brand"
          value={fields.companyName}
          onChange={(v) => update({ companyName: v })}
        />
        <Field
          label="Model"
          value={fields.model}
          onChange={(v) => update({ model: v })}
        />
        <Field
          label="MAC address"
          value={fields.macAddress}
          onChange={(v) => update({ macAddress: v })}
        />
        <Field
          label="Serial number"
          value={fields.serialNumber}
          onChange={(v) => update({ serialNumber: v })}
        />
        <Field
          label="PON / GPON serial"
          value={fields.ponSerial}
          onChange={(v) => update({ ponSerial: v })}
        />
        <Field
          label="Spec summary (ports, etc.)"
          value={fields.specSummary}
          onChange={(v) => update({ specSummary: v })}
        />
      </div>
      <p className="text-xs text-neutral-600">
        OCR is a best guess — verify and correct the fields above before submitting.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-800">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
      />
    </label>
  );
}
