const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "js", "awards-loader.js"), "utf8");
let now = 0;
class TestDate extends Date {
    static now() { return now; }
}
const context = vm.createContext({
    Date: TestDate,
    document: { getElementById: () => null },
    SiteUtils: { getAssetUrl: value => value || "", escapeHtml: value => String(value) }
});
vm.runInContext(fs.readFileSync(path.join(root, "js", "markdown.js"), "utf8"), context);
vm.runInContext(source, context);

function assertDeadline(award, year, month, day) {
    now = new Date(year, month - 1, day, 0, 0, 0, 0).getTime() - 1;
    assert.equal(context.isAwardOverdue(award), false, `${JSON.stringify(award)} before deadline`);
    now = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    assert.equal(context.isAwardOverdue(award), false, `${JSON.stringify(award)} during deadline`);
    now = new Date(year, month - 1, day + 1, 0, 0, 0, 0).getTime();
    assert.equal(context.isAwardOverdue(award), true, `${JSON.stringify(award)} after deadline`);
}

test("English deadline, ranges, and latest semicolon-separated deadline", () => {
    assertDeadline({ period: "August 3, 2026" }, 2026, 8, 3);
    assertDeadline({ period: "July 1, 2026 - June 30, 2027" }, 2027, 6, 30);
    assertDeadline({ period: "August 1 - September 30, 2026" }, 2026, 9, 30);
    assertDeadline({ period: "September 15, 2026; March 15, 2027" }, 2027, 3, 15);
    assertDeadline({ period: "March 15, 2027; September 15, 2026" }, 2027, 3, 15);
    assertDeadline({ period: "Aug. 3rd, 2026" }, 2026, 8, 3);
});

test("legacy numeric, ISO, month and year formats", () => {
    assertDeadline({ period: "30.06.2026" }, 2026, 6, 30);
    assertDeadline({ period: "30/06/2026" }, 2026, 6, 30);
    assertDeadline({ period: "2026-06-30" }, 2026, 6, 30);
    const iso = new Date("2026-06-30T12:00:00Z");
    assertDeadline({ period: "2026-06-30T12:00:00Z" }, iso.getFullYear(), iso.getMonth() + 1, iso.getDate());
    assertDeadline({ period: "June 2026" }, 2026, 6, 30);
    assertDeadline({ period: "2026" }, 2026, 12, 31);
});

test("explicit deadline overrides and absent or invalid dates", () => {
    assertDeadline({ periodEnd: "2026-08-03", endDate: "2027-01-01", period: "2028" }, 2026, 8, 3);
    assertDeadline({ periodEnd: " ", endDate: "2026-08-03", period: "2028" }, 2026, 8, 3);
    now = new Date(2030, 0, 1).getTime();
    assert.equal(context.isAwardOverdue({ period: "No deadline" }), false);
    assert.equal(context.isAwardOverdue({ period: "2026-02-30" }), false);
});

test("real award data marks expired cards and preserves legacy shade", () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, "data", "awards.json"), "utf8"));
    const early = data.awards.find(award => award.title === "Ultra Early Renewal Champions");
    now = new Date(2026, 10, 17, 12).getTime();
    assert.equal(context.isAwardOverdue(early), true);
    assert.match(context.renderAwardCard(early, 0), /class="award-card overdue"/);
    const css = fs.readFileSync(path.join(root, "css", "awards.css"), "utf8");
    assert.match(css, /\.award-card\.overdue::after\s*\{[^}]*rgba\(71,\s*85,\s*105,\s*\.35\)/s);
});
