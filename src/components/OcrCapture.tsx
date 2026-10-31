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
        {!previewUrl && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-neutral-900 py-9 text-white"
            style={{ aspectRatio: "16/10" }}
          >
            <svg className="absolute inset-4 h-[calc(100%-32px)] w-[calc(100%-32px)] opacity-40" viewBox="0 0 100 70" preserveAspectRatio="none" fill="none">
              <path d="M0 14 V2 H12" stroke="white" strokeWidth="2" />
              <path d="M88 2 H100 V14" stroke="white" strokeWidth="2" />
              <path d="M100 56 V68 H88" stroke="white" strokeWidth="2" />
              <path d="M12 68 H0 V56" stroke="white" strokeWidth="2" />
            </svg>
            <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-sm font-semibold">Take photo of ONU label</span>
          </button>
        )}
      </div>

      {previewUrl && (
        <div className="relative overflow-hidden rounded-xl border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="ONU label" className="max-h-48 w-full object-contain" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-2 right-2 rounded-md bg-neutral-900/85 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Retake
          </button>
        </div>
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
          mono
        />
        <Field
          label="Serial number"
          value={fields.serialNumber}
          onChange={(v) => update({ serialNumber: v })}
          mono
        />
        <Field
          label="PON / GPON serial"
          value={fields.ponSerial}
          onChange={(v) => update({ ponSerial: v })}
          mono
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
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 ${mono ? "data" : ""}`}
      />
    </label>
  );
}
