import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { recognizeWithVisionLlm } from "@/lib/vision-ocr";

export async function POST(req: NextRequest) {
  const { error } = await requireUser(["STAFF", "OFFICE", "ADMIN"]);
  if (error) return error;

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const result = await recognizeWithVisionLlm(file);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OCR failed" },
      { status: 502 }
    );
  }
}
