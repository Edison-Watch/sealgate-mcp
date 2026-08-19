import sharp from "sharp";
import toIco from "to-ico";

/**
 * Invert RGB channels of an image while preserving the alpha channel.
 * Port of Python `invert_colors` from init/generate_logo.py.
 */
export async function invertColors(inputBuffer: Buffer): Promise<Buffer> {
    const image = sharp(inputBuffer).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    const pixels = new Uint8Array(data.buffer);
    const { width, height, channels } = info;

    for (let i = 0; i < width * height; i++) {
        const offset = i * channels;
        pixels[offset] = 255 - (pixels[offset] as number); // R
        pixels[offset + 1] = 255 - (pixels[offset + 1] as number); // G
        pixels[offset + 2] = 255 - (pixels[offset + 2] as number); // B
        // Alpha (offset + 3) preserved
    }

    return sharp(Buffer.from(pixels.buffer), {
        raw: { width, height, channels },
    })
        .png()
        .toBuffer();
}

/**
 * Pad a non-square image to square with a transparent background.
 */
export async function ensureSquare(inputBuffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(inputBuffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width === height) return inputBuffer;

    const size = Math.max(width, height);
    return sharp(inputBuffer)
        .resize(size, size, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
}

/**
 * Resize an image to the given dimensions, letterboxing with transparency.
 */
export async function resizeImage(
    inputBuffer: Buffer,
    width: number,
    height: number,
): Promise<Buffer> {
    return sharp(inputBuffer)
        .resize(width, height, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
}

/**
 * Convert a PNG buffer to ICO format at the given sizes.
 */
export async function createFavicon(
    inputBuffer: Buffer,
    sizes: number[] = [32],
): Promise<Buffer> {
    const pngBuffers = await Promise.all(
        sizes.map((size) => sharp(inputBuffer).resize(size, size).png().toBuffer()),
    );
    return Buffer.from(await toIco(pngBuffers));
}
