import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGeminiClient, generateImage, generateText } from "./lib/gemini-client";

const REPO_ROOT = join(import.meta.dir, "..");
const OUTPUT_DIR = join(REPO_ROOT, "media");
const OUTPUT_PATH = join(OUTPUT_DIR, "banner.png");

function readProjectName(): string {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf-8"));
    return pkg.name;
}

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

const STYLE_PROMPT = `Style the image in a Japanese minimalist style, inspired by \
traditional sumi-e ink wash painting. The artwork should feature clean, elegant \
brushstrokes with a sense of fluidity and balance. Use a monochrome palette \
dominated by black ink on a textured white background, with subtle gradients \
achieved through water dilution. Incorporate negative space thoughtfully to \
emphasize simplicity and harmony. Include natural elements such as bamboo, cherry \
blossoms, or mountains, temples, etc. depicted with minimal yet expressive lines, \
evoking a sense of tranquility and Zen. Avoid unnecessary details, focusing \
instead on evoking emotion through subtle contrasts and the beauty of imperfection.`;

async function main(): Promise<void> {
    const title = process.argv[2] ?? readProjectName();
    const theme = process.argv[3] ?? "";

    console.log(`Generating banner for "${title}"...`);
    const client = createGeminiClient();

    // Step 1: Generate creative banner description
    console.log("Step 1: Generating creative description...");
    const descriptionPrompt = `Generate a creative description of a person, animal, \
or object holding a banner. Go for a Japanese style, creative and fun, but make \
sense. The banner reads: "${title}". \
${theme ? `Suggestion: ${theme}. ` : ""}\
Do not mention any colors. Keep the description to 2-3 sentences.`;

    const description = await generateText(client, TEXT_MODEL, descriptionPrompt);
    console.log(`Description: ${description}`);

    // Step 2: Generate banner image
    console.log("Step 2: Generating banner image...");
    const imagePrompt = `${description}. Create a WIDE HORIZONTAL 16:9 aspect ratio \
image with the banner prominently displayed and taking 80% of the screen. The text \
"${title}" should be large and centered at the top. Use professional photography \
composition with the banner as the main focal point. Make sure the text is large, \
highly readable (good color contrast with background) and the banner is visually \
appealing with good contrast. Remember, the banner text should take up majority \
of the image. The image MUST be horizontal/landscape orientation, wider than it \
is tall.\n\n${STYLE_PROMPT}`;

    const imageBuffer = await generateImage(client, IMAGE_MODEL, imagePrompt, {
        aspectRatio: "16:9",
    });

    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(OUTPUT_PATH, imageBuffer);
    console.log(`Banner saved to ${OUTPUT_PATH}`);
}

await main();
