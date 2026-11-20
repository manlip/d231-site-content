const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({
    document: {
        documentElement: { style: { setProperty() {} } },
        body: {},
        readyState: "loading",
        getElementById: () => ({ addEventListener() {} }),
        addEventListener() {}
    },
    window: {},
    SiteUtils: { escapeHtml: String, observeEmbedSize: () => () => {} },
    SiteMarkdown: { render: String, renderInline: String }
});
vm.runInContext(fs.readFileSync(path.join(root, "js", "resources-loader.js"), "utf8"), context);

test("resource list groups categories and subcategories in their original order", () => {
    const data = { resources: [
        { category: "Alpha", subcategory: "First", title: "One" },
        { category: "Beta", title: "Two" },
        { category: "Alpha", subcategory: "Second", title: "Three", visibility: "hidden" },
        { category: "Alpha", subcategory: "First", title: "Four" },
        { title: "Uncategorized" }
    ] };
    const grouped = context.groupResources(context.validateResources(data));
    assert.deepEqual(Object.keys(grouped), ["Alpha", "Beta", "Other"]);
    assert.deepEqual(Object.keys(grouped.Alpha), ["First", "Second"]);
    assert.deepEqual(Array.from(grouped.Alpha.First, item => item.title), ["One", "Four"]);
    assert.equal(grouped.Alpha.Second[0].visibility, "hidden");
    assert.equal(grouped.Other[""][0].title, "Uncategorized");
});

test("legacy cached resources remain supported", () => {
    const legacy = { Alpha: { First: [{ title: "Saved resource" }] } };
    assert.equal(context.groupResources(context.validateResources(legacy)), legacy);
    assert.throws(() => context.validateResources({ Alpha: { First: [null] } }), /Invalid resource list/);
});

test("invalid flat resources are rejected", () => {
    for (const data of [
        { resources: {} },
        { resources: [null] },
        { resources: [[]] },
        { resources: [{ category: 123 }] },
        { resources: [{ subcategory: {} }] }
    ]) {
        assert.throws(() => context.validateResources(data), /Expected a list of resource objects/);
    }
});

test("repository resources use the editable list format", () => {
    const data = JSON.parse(fs.readFileSync(path.join(root, "data", "resources.json"), "utf8"));
    context.validateResources(data);
    assert.ok(Array.isArray(data.resources));
    assert.ok(data.resources.length > 0);
    const grouped = context.groupResources(data);
    assert.equal(Object.values(grouped).flatMap(category => Object.values(category).flat()).length, data.resources.length);
});
