const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

function generateThumbnails(siteRoot, renderPdf) {
    const root = path.resolve(siteRoot);
    const jsonPath = path.join(root, "data", "newsletters.json");
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    if (!data || !Array.isArray(data.newsletters)) {
        throw new Error("Expected a newsletters array in the staged newsletters.json.");
    }

    const filesRoot = path.join(root, "assets", "files");
    const outputRoot = path.join(root, "assets", "images", "newsletters", "generated");
    let updated = false;
    for (const item of data.newsletters) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            throw new Error("Expected each newsletter to be an object.");
        }
        if (item.image != null && typeof item.image !== "string" ||
            item.url != null && typeof item.url !== "string") {
            throw new Error("Newsletter image and URL must be strings.");
        }
        if (item.image?.trim() || item.visibility === "hidden" || !item.url?.trim()) continue;
        const url = item.url.trim();
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) {
            console.warn(`Skipping thumbnail for "${item.title}": external PDF URLs are not supported.`);
            continue;
        }
        const relative = url.replace(/^\/+/, "");
        const input = path.resolve(root, relative);
        const withinFiles = path.relative(filesRoot, input);
        if (!withinFiles || withinFiles.startsWith("..") || path.isAbsolute(withinFiles) || !/\.pdf$/i.test(input)) {
            console.warn(`Skipping thumbnail for "${item.title}": expected a PDF under assets/files.`);
            continue;
        }
        try {
            const realFilesRoot = fs.realpathSync(filesRoot);
            const realInput = fs.realpathSync(input);
            const realRelative = path.relative(realFilesRoot, realInput);
            if (!realRelative || realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
                throw new Error("PDF resolves outside assets/files.");
            }
            const name = crypto.createHash("sha256").update(relative).digest("hex").slice(0, 24);
            fs.mkdirSync(outputRoot, { recursive: true });
            const outputBase = path.join(outputRoot, name);
            renderPdf(realInput, outputBase);
            if (!fs.statSync(`${outputBase}.png`).isFile()) throw new Error("Renderer did not produce an image.");
            item.image = `assets/images/newsletters/generated/${name}.png`;
            updated = true;
        } catch (error) {
            console.warn(`Could not generate thumbnail for "${item.title}": ${error.message}`);
        }
    }
    if (updated) fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`);
}

function renderPdf(input, outputBase) {
    const result = spawnSync("pdftoppm", [
        "-f", "1", "-l", "1", "-singlefile", "-scale-to", "600", "-png", input, outputBase
    ], { encoding: "utf8", timeout: 60000 });
    if (result.error) {
        if (result.error.code === "ENOENT") throw result.error;
        throw new Error(`PDF renderer failed: ${result.error.message}`);
    }
    if (result.status !== 0) throw new Error(`PDF renderer failed: ${(result.stderr || `exit ${result.status}`).trim()}`);
}

if (require.main === module) {
    try {
        const version = spawnSync("pdftoppm", ["-v"], { encoding: "utf8" });
        if (version.error || version.status !== 0) throw new Error("pdftoppm is not available; install poppler-utils.");
        if (!process.argv[2]) throw new Error("Provide the staged site directory.");
        generateThumbnails(process.argv[2], renderPdf);
    } catch (error) {
        console.error(`Newsletter thumbnail generation failed: ${error.message}`);
        process.exitCode = 1;
    }
}

module.exports = { generateThumbnails };
