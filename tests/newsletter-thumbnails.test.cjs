const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { generateThumbnails } = require("../scripts/generate-newsletter-thumbnails.cjs");

test("generates staged covers and retains explicit images and fallback cases", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "newsletter-thumbnails-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, "data"), { recursive: true });
    fs.mkdirSync(path.join(root, "assets", "files", "newsletters"), { recursive: true });
    fs.writeFileSync(path.join(root, "assets", "files", "newsletters", "one.pdf"), "fixture");
    const json = path.join(root, "data", "newsletters.json");
    const newsletters = [
        { title: "Generate", url: "assets/files/newsletters/one.pdf", image: "" },
        { title: "Same PDF", url: "/assets/files/newsletters/one.pdf" },
        { title: "Manual", url: "assets/files/newsletters/one.pdf", image: "cover.png" },
        { title: "Hidden", url: "assets/files/newsletters/one.pdf", visibility: "hidden" },
        { title: "Missing", url: "assets/files/newsletters/missing.pdf" },
        { title: "External", url: "https://example.test/one.pdf" },
        { title: "Traversal", url: "assets/files/../../data/secret.pdf" },
        { title: "No PDF" }
    ];
    fs.writeFileSync(json, JSON.stringify({ newsletters }));
    const calls = [];
    generateThumbnails(root, (input, output) => {
        calls.push(input);
        fs.writeFileSync(`${output}.png`, "image");
    });
    const result = JSON.parse(fs.readFileSync(json, "utf8")).newsletters;
    assert.equal(calls.length, 2);
    assert.match(result[0].image, /^assets\/images\/newsletters\/generated\/[0-9a-f]{24}\.png$/);
    assert.equal(result[1].image, result[0].image);
    assert.equal(fs.readFileSync(path.join(root, result[0].image), "utf8"), "image");
    assert.equal(result[2].image, "cover.png");
    for (const item of result.slice(3)) assert.equal(item.image, undefined);
});

test("keeps the placeholder on render failures without modifying the JSON", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "newsletter-thumbnails-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, "data"), { recursive: true });
    fs.mkdirSync(path.join(root, "assets", "files"), { recursive: true });
    fs.writeFileSync(path.join(root, "assets", "files", "bad.pdf"), "bad");
    const json = path.join(root, "data", "newsletters.json");
    const original = JSON.stringify({ newsletters: [{ title: "Bad PDF", url: "assets/files/bad.pdf" }] });
    fs.writeFileSync(json, original);
    generateThumbnails(root, () => { throw new Error("broken PDF"); });
    assert.equal(fs.readFileSync(json, "utf8"), original);
});

test("rejects malformed newsletter data", t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "newsletter-thumbnails-"));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.mkdirSync(path.join(root, "data"), { recursive: true });
    const json = path.join(root, "data", "newsletters.json");
    fs.writeFileSync(json, JSON.stringify({ newsletters: [{ image: 3 }] }));
    assert.throws(() => generateThumbnails(root, () => {}), /must be strings/);
    fs.writeFileSync(json, "{}");
    assert.throws(() => generateThumbnails(root, () => {}), /Expected a newsletters array/);
});
