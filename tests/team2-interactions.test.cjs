const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup(reducedMotion = false) {
    let timerId = 0;
    let stopped = 0;
    const timers = new Map();
    const rootHandlers = {};
    const documentHandlers = {};
    const styleValues = {};
    const document = {
        getElementById: () => root,
        querySelector: () => overlay,
        addEventListener: (type, callback) => { documentHandlers[type] = callback; }
    };
    const closeButton = {
        addEventListener: (type, callback) => { closeButton[type] = callback; },
        focus: () => { document.activeElement = closeButton; }
    };
    const stage = {
        style: { setProperty: (name, value) => { styleValues[name] = value; } },
        getBoundingClientRect: () => ({ left: 100, top: 100, width: 294, height: 392 }),
        replaceChildren: child => { stage.child = child; },
        querySelector: () => stage.child?.classList.contains("is-flipped") ? stage.child.details : null
    };
    const overlay = {
        hidden: true,
        setAttribute: (name, value) => { overlay[name] = value; },
        querySelector: selector => selector === ".team2-stage" ? stage : closeButton,
        addEventListener: (type, callback) => { overlay[type] = callback; }
    };
    const root = {
        addEventListener: (type, callback, capture) => {
            assert.equal(capture, true);
            rootHandlers[type] = callback;
        },
        contains: () => true
    };
    function makeCard(name) {
        const card = {
            dataset: { memberName: name },
            isConnected: true,
            focus: () => { document.activeElement = card; },
            closest: () => card,
            getBoundingClientRect: () => ({ left: 10, top: 20, width: 147, height: 196 }),
            cloneNode: () => {
                const classes = new Set();
                const face = () => ({ setAttribute: (key, value) => { this[key] = value; } });
                const front = face();
                const back = face();
                return {
                    style: {},
                    details: { focus: () => {} },
                    front, back,
                    classList: {
                        add: value => classes.add(value),
                        remove: value => classes.delete(value),
                        contains: value => classes.has(value)
                    },
                    removeAttribute: () => {},
                    querySelector: selector => selector === ".front" ? front : selector === ".back" ? back : null,
                    getBoundingClientRect: () => ({ left: 100, top: 100, width: 294, height: 392 })
                };
            }
        };
        return card;
    }
    const context = vm.createContext({
        document,
        window: { matchMedia: () => ({ matches: reducedMotion }) },
        SiteUtils: { observeVisibleModal: () => () => { stopped++; } },
        setTimeout: (callback, delay) => {
            const id = ++timerId;
            timers.set(id, { callback, delay });
            return id;
        },
        clearTimeout: id => timers.delete(id),
        requestAnimationFrame: callback => { callback(); return 1; },
        cancelAnimationFrame: () => {}
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "team2_interactions.js"), "utf8"), context);
    const flipDelay = vm.runInContext("TEAM2_FLIP_DELAY_MS", context);
    const enlargeDuration = vm.runInContext("TEAM2_ENLARGE_DURATION_MS", context);
    return { rootHandlers, documentHandlers, closeButton, overlay, stage, styleValues, timers, document, makeCard, flipDelay, enlargeDuration, stopped: () => stopped };
}

test("enlarges the selected card and flips after the animation and configured pause", () => {
    const env = setup();
    const card = env.makeCard("Alex");
    let stopped = false;
    env.rootHandlers.click({ target: card, stopPropagation: () => { stopped = true; } });
    assert.equal(stopped, true);
    assert.equal(env.overlay.hidden, false);
    assert.equal(env.overlay["aria-label"], "Details for Alex");
    assert.equal(env.styleValues["--team2-card-width"], "294px");
    assert.equal(env.document.activeElement, env.closeButton);
    assert.equal(env.stage.child.classList.contains("is-flipped"), false);
    const timer = [...env.timers.values()][0];
    assert.equal(timer.delay, env.flipDelay + env.enlargeDuration);
    timer.callback();
    assert.equal(env.stage.child.classList.contains("is-flipped"), true);
    assert.equal(env.stage.child.front.inert, true);
    assert.equal(env.stage.child.back.inert, false);
    env.closeButton.click();
    assert.equal(env.overlay.hidden, true);
    assert.equal(env.document.activeElement, card);
    assert.equal(env.stopped(), 1);
    assert.equal(env.timers.size, 0);
});

test("dismissal cancels a pending flip and keyboard activation respects reduced motion", () => {
    const env = setup(true);
    const card = env.makeCard("Sam");
    let prevented = false;
    env.rootHandlers.keydown({
        target: card, key: " ", preventDefault: () => { prevented = true; }, stopPropagation: () => {}
    });
    assert.equal(prevented, true);
    assert.equal([...env.timers.values()][0].delay, env.flipDelay);
    env.documentHandlers.keydown({ key: "Escape", preventDefault: () => {} });
    assert.equal(env.overlay.hidden, true);
    assert.equal(env.timers.size, 0);
    assert.equal(env.document.activeElement, card);
});
