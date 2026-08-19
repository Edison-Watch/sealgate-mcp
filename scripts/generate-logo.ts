import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGeminiClient, generateImage, generateText } from "./lib/gemini-client";
import { removeGreenscreen } from "./lib/greenscreen";
import {
    createFavicon,
    ensureSquare,
    invertColors,
    resizeImage,
} from "./lib/image-utils";

const REPO_ROOT = join(import.meta.dir, "..");
const OUTPUT_DIR = join(REPO_ROOT, "docs", "public");

function readProjectName(): string {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8"));
    return pkg.name;
}

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

async function main(): Promise<void> {
    const projectName = process.argv[2] ?? readProjectName();
    const theme =
        process.argv[3] ?? "incorporate modern tech aesthetics, simple and clean";

    console.log(`Generating logo suite for "${projectName}"...`);
    const client = createGeminiClient();

    // ============================================================
    // 1. Generate wordmark description
    // ============================================================
    console.log("\n=== Step 1: Generating wordmark description ===");
    const descriptionPrompt = `Generate a creative description for a horizontal \
wordmark logo with text. The wordmark should be clean, modern, and professional. \
Project name: "${projectName}". \
${theme ? `Suggestion: ${theme}. ` : ""}\
Focus on typography, icon placement, and professional branding. The wordmark \
should be wide and horizontal. Keep the description to 2-3 sentences.`;

    const description = await generateText(client, TEXT_MODEL, descriptionPrompt);
    console.log(`Description: ${description}`);

    // ============================================================
    // 2. Generate light mode wordmark with greenscreen
    // ============================================================
    console.log("\n=== Step 2: Generating light mode wordmark ===");
    const wordmarkPrompt = `${description}. Create a HORIZONTAL wordmark logo that \
includes the text "${projectName}". Use clean typography and simple geometric \
shapes. Use DARK colors (black, dark gray, dark blue) for the logo. The text \
should be highly readable. Position the icon on the left and text on the right \
in a horizontal layout. CRITICAL: Use a BRIGHT LIME GREEN (#00FF00) GREENSCREEN \
background - the ENTIRE background must be solid bright green with NO gradients. \
Do not use any lime green color in the logo itself, only in the background.`;

    // Note: 4:1 not supported, using 21:9 as the widest available ratio
    const wordmarkRaw = await generateImage(client, IMAGE_MODEL, wordmarkPrompt, {
        aspectRatio: "21:9",
    });

    // ============================================================
    // 3. Extract icon from wordmark
    // ============================================================
    console.log("\n=== Step 3: Extracting icon from wordmark ===");
    const iconRaw = await generateImage(
        client,
        IMAGE_MODEL,
        [
            {
                text: `Remove ALL TEXT from this image. Keep ONLY the icon/symbol \
portion. Output a SQUARE 1:1 aspect ratio image with the icon centered. \
Preserve the BRIGHT LIME GREEN (#00FF00) GREENSCREEN background exactly as \
it is. Do not change any colors of the icon itself - keep them identical to \
the original. Just remove the text "${projectName}" and center the icon in \
a square format.`,
            },
            {
                inlineData: {
                    mimeType: "image/png",
                    data: wordmarkRaw.toString("base64"),
                },
            },
        ],
        { aspectRatio: "1:1" },
    );

    // ============================================================
    // 4. Remove greenscreen
    // ============================================================
    console.log("\n=== Step 4: Removing greenscreen ===");
    const logoLight = await removeGreenscreen(wordmarkRaw);
    const iconTransparent = await removeGreenscreen(iconRaw);

    // ============================================================
    // 5. Create dark mode variants (invert colors)
    // ============================================================
    console.log("\n=== Step 5: Creating dark mode variants ===");
    const logoDark = await invertColors(logoLight);

    // Ensure icon is square before processing
    const iconLightSquare = await ensureSquare(iconTransparent);
    const iconDarkSquare = await invertColors(iconLightSquare);

    // ============================================================
    // 6. Resize icons
    // ============================================================
    console.log("\n=== Step 6: Resizing icons ===");
    const iconLight512 = await resizeImage(iconLightSquare, 512, 512);
    const iconDark512 = await resizeImage(iconDarkSquare, 512, 512);

    // ============================================================
    // 7. Create favicon
    // ============================================================
    console.log("\n=== Step 7: Creating favicon ===");
    const favicon = await createFavicon(iconLightSquare, [32]);

    // ============================================================
    // 8. Save all outputs
    // ============================================================
    console.log("\n=== Step 8: Saving files ===");
    mkdirSync(OUTPUT_DIR, { recursive: true });

    writeFileSync(join(OUTPUT_DIR, "logo-light.png"), logoLight);
    writeFileSync(join(OUTPUT_DIR, "logo-dark.png"), logoDark);
    writeFileSync(join(OUTPUT_DIR, "icon-light.png"), iconLight512);
    writeFileSync(join(OUTPUT_DIR, "icon-dark.png"), iconDark512);
    writeFileSync(join(OUTPUT_DIR, "favicon.ico"), favicon);

    console.log(`Logo light:  ${join(OUTPUT_DIR, "logo-light.png")}`);
    console.log(`Logo dark:   ${join(OUTPUT_DIR, "logo-dark.png")}`);
    console.log(`Icon light:  ${join(OUTPUT_DIR, "icon-light.png")}`);
    console.log(`Icon dark:   ${join(OUTPUT_DIR, "icon-dark.png")}`);
    console.log(`Favicon:     ${join(OUTPUT_DIR, "favicon.ico")}`);
    console.log("\nAll logo assets generated successfully!");
}

await main();
