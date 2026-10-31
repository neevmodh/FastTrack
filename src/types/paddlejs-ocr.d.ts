declare module "@paddlejs-models/ocr" {
  export function init(): Promise<void>;
  export function recognize(
    img: HTMLImageElement | HTMLCanvasElement,
    option?: Record<string, unknown>
  ): Promise<{ text: string | string[]; points?: unknown }>;
  export function detect(img: HTMLImageElement | HTMLCanvasElement): Promise<unknown>;
}
