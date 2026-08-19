import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..");

const REQUIRED_SECTIONS = [
    "Project Overview",
    "Common Commands",
    "Architecture",
    "Code Style",
    "Configuration Pattern",
];

function findAgentsFile(): string | null {
    for (const filename of ["AGENTS.md", "CLAUDE.md"]) {
        const path = join(REPO_ROOT, filename);
        if (existsSync(path)) return path;
    }
    return null;
}

function main(): number {
    const agentsPath = findAgentsFile();
    if (!agentsPath) {
        console.log("AGENTS.md or CLAUDE.md is missing.");
        return 1;
    }

    const content = readFileSync(agentsPath, "utf-8").trim();
    if (!content) {
        const filename = agentsPath.split("/").pop();
        console.log(`${filename} is empty.`);
        return 1;
    }

    const missingSections: string[] = [];
    for (const section of REQUIRED_SECTIONS) {
        const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`^##+\\s+${escaped}\\s*$`, "m");
        if (!pattern.test(content)) {
            missingSections.push(section);
        }
    }

    const filename = agentsPath.split("/").pop();
    if (missingSections.length > 0) {
        console.log(
            `${filename} is missing required sections: ${missingSections.join(", ")}.`,
        );
        return 1;
    }

    console.log(`${filename} validation passed.`);
    return 0;
}

process.exit(main());
