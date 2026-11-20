const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("clicking a card or its Details button opens the corresponding award", () => {
    const rootHandlers = {};
    const modalHandlers = {};
    const documentHandlers = {};
    const button = {
        dataset: { awardIndex: "0" },
        focus() { document.activeElement = this; }
    };
    const card = { querySelector: () => button };
    button.closest = selector => selector === ".award-card" ? card : null;
    const root = {
        addEventListener(type, handler) { rootHandlers[type] = handler; },
        contains(element) { return element === card; },
        innerHTML: ""
    };
    const closeButton = { focus() { document.activeElement = this; } };
    const modal = {
        hidden: true,
        addEventListener(type, handler) { modalHandlers[type] = handler; },
        querySelector() { return closeButton; }
    };
    const content = { innerHTML: "" };
    const elements = {
        "awards-container": root,
        "award-modal": modal,
        "award-modal-content": content,
        "awards-loading": {},
        "awards-notice": {},
        "awards-empty": {}
    };
    const classes = new Set();
    const document = {
        activeElement: null,
        getElementById: id => elements[id],
        querySelector: () => ({}),
        documentElement: {
            style: { setProperty() {} },
            classList: {
                add: name => classes.add(name),
                remove: name => classes.delete(name)
            }
        },
        addEventListener(type, handler) { documentHandlers[type] = handler; }
    };
    const context = vm.createContext({
        document,
        window: {},
        SiteUtils: {
            observeEmbedSize: () => () => {},
            observeVisibleModal: () => () => {},
            loadJsonWithSWR: (_path, _key, options) => options.onRender({
                awards: [{ title: "Test Award", description: "Test details" }]
            }),
            getAssetUrl: value => value || "",
            escapeHtml: value => String(value)
        },
        SiteMarkdown: { render: value => value, renderInline: value => value }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "awards-loader.js"), "utf8"), context);

    for (const target of [
        { closest: selector => selector === ".award-card" ? card : null },
        button
    ]) {
        rootHandlers.click({ target });
        assert.equal(modal.hidden, false);
        assert.equal(classes.has("modal-open"), true);
        assert.match(content.innerHTML, /Test Award/);
        assert.match(content.innerHTML, /Test details/);
        assert.equal(document.activeElement, closeButton);
        documentHandlers.keydown({ key: "Escape" });
        assert.equal(modal.hidden, true);
        assert.equal(classes.has("modal-open"), false);
        assert.equal(document.activeElement, button);
    }

    rootHandlers.click({ target: { closest: () => null } });
    assert.equal(modal.hidden, true);
});
