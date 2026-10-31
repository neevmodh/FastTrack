// API routes return either a plain string error, or a Zod `flatten()`
// object ({ formErrors: string[], fieldErrors: { [key]: string[] } }) for
// validation failures. Calling .toString() on the latter yields the
// useless "[object Object]" — this extracts an actual readable message
// from either shape.
export function extractErrorMessage(body: unknown, fallback: string): string {
  const err = (body as { error?: unknown } | null)?.error;
  if (!err) return fallback;
  if (typeof err === "string") return err;

  if (typeof err === "object") {
    const flat = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const messages = [
      ...(flat.formErrors ?? []),
      ...Object.values(flat.fieldErrors ?? {}).flat(),
    ];
    if (messages.length > 0) return messages.join(" ");
  }

  return fallback;
}
