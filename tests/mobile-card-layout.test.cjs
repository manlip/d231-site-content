const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("team and award grids use one column on phone-sized screens", () => {
    const root = path.join(__dirname, "..", "css");
    const team = fs.readFileSync(path.join(root, "team.css"), "utf8");
    const awards = fs.readFileSync(path.join(root, "awards.css"), "utf8");

    assert.match(team, /@media\s*\(max-width:\s*480px\)\s*\{\s*\.grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*147px\)/);
    assert.match(awards, /@media\s*\(max-width:\s*480px\)\s*\{\s*\.award-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
