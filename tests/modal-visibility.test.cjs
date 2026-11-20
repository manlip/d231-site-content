const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("positions a modal within the visible part of its iframe and cleans up", () => {
    let callback;
    let disconnected = false;
    class Observer {
        constructor(fn) { callback = fn; }
        observe(element) { assert.equal(element, overlay); }
        disconnect() { disconnected = true; }
    }
    const values = {};
    const overlay = { style: {
        setProperty: (name, value) => { values[name] = value; },
        removeProperty: name => { delete values[name]; }
    } };
    const context = vm.createContext({
        document: { currentScript: { src: "https://example.test/site/js/utils.js" } },
        window: { IntersectionObserver: Observer },
        URL
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "utils.js"), "utf8"), context);
    const utils = vm.runInContext("SiteUtils", context);
    const stop = utils.observeVisibleModal(overlay);
    callback([{ isIntersecting: true, boundingClientRect: { top: 0, bottom: 2000 },
        intersectionRect: { top: 600, bottom: 1200, height: 600 } }]);
    assert.deepEqual(values, {
        "--modal-visible-top": "600px",
        "--modal-visible-bottom": "800px",
        "--modal-visible-height": "600px"
    });
    stop();
    assert.equal(disconnected, true);
    assert.deepEqual(values, {});
});
