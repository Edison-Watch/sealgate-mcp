import sharp from "sharp";

interface GreenscreenOptions {
    /** Minimum green channel value to consider as greenscreen (default: 180) */
    brightnessMin?: number;
    /** How much higher green must be than R and B (default: 60) */
    tolerance?: number;
    /** Green spill reduction factor 0-1 (default: 0.6) */
    spillReduction?: number;
}

/**
 * Remove a bright green (#00FF00) background from an image.
 *
 * Port of Python `remove_greenscreen` from init/generate_logo.py.
 * Detects pixels with high green channel relative to R and B,
 * sets their alpha to 0, and reduces green spill on remaining pixels.
 */
export async function removeGreenscreen(
    inputBuffer: Buffer,
    options: GreenscreenOptions = {},
): Promise<Buffer> {
    const { brightnessMin = 180, tolerance = 60, spillReduction = 0.6 } = options;

    const image = sharp(inputBuffer).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    const pixels = new Uint8Array(data.buffer);
    const { width, height, channels } = info;

    for (let i = 0; i < width * height; i++) {
        const offset = i * channels;
        const r = pixels[offset] as number;
        const g = pixels[offset + 1] as number;
        const b = pixels[offset + 2] as number;
        const a = pixels[offset + 3] as number;

        // Detect greenscreen: high green, green dominates R and B
        const isGreenscreen =
            g > brightnessMin && g > r + tolerance + 20 && g > b + tolerance + 20;

        if (isGreenscreen) {
            pixels[offset + 3] = 0;
        } else if (a > 128) {
            // Reduce green spill on visible non-greenscreen pixels
            const hasGreenTint = g > r + 20 && g > b + 20;
            if (hasGreenTint) {
                const avgRb = (r + b) / 2;
                pixels[offset + 1] = Math.round(
                    Math.min(g * (1 - spillReduction), avgRb),
                );
            }
        }
    }

    return sharp(Buffer.from(pixels.buffer), {
        raw: { width, height, channels },
    })
        .png()
        .toBuffer();
}
