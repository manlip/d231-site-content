const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({
    document: { getElementById: () => null },
    SiteUtils: {
        getAssetUrl: value => value || "",
        escapeHtml: value => String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[char])
    }
});
vm.runInContext(fs.readFileSync(path.join(root, "js", "team-loader.js"), "utf8"), context);

test("photo cards include escaped member details below the image", () => {
    const card = context.renderMemberCard({
        name: "Alex & Sam",
        role: "Club <Director>",
        image: "photo.png"
    });
    assert.match(card, /class="face front"/);
    assert.match(card, /class="image-area">/);
    assert.match(card, /<img src="photo\.png"/);
    assert.match(card, /class="image-fallback" hidden/);
    assert.match(card, /class="member-info">\s*<h3>Alex &amp; Sam<\/h3>\s*<p class="role">Club &lt;Director&gt;<\/p>/);

    const css = fs.readFileSync(path.join(root, "css", "team.css"), "utf8");
    assert.match(css, /mask-image:\s*radial-gradient/);
    assert.match(css, /grid-template-rows:\s*minmax\(0,\s*62fr\)\s+minmax\(0,\s*38fr\)/);
    assert.match(css, /\.member-info\s*\{[^}]*flex-direction:\s*column/s);
    assert.match(css, /\.role\s*\{[^}]*margin:\s*auto 0 0/s);
});

test("cards without a photo show the placeholder and member details", () => {
    const card = context.renderMemberCard({ name: "Alex" });
    assert.doesNotMatch(card, /<img /);
    assert.match(card, /class="portrait"/);
    assert.match(card, /class="member-info"/);
    assert.match(card, /<h3>Alex<\/h3>/);
    assert.match(card, /<p class="role">Role not provided<\/p>/);
});

test("a failed photo switches to the placeholder", () => {
    let onError;
    const fallback = { hidden: true };
    const image = {
        hidden: false,
        nextElementSibling: fallback,
        addEventListener: (event, callback) => {
            assert.equal(event, "error");
            onError = callback;
        }
    };
    context.bindFlipInteractions({
        querySelectorAll: selector => selector === ".front img" ? [image] : []
    });
    onError();
    assert.equal(image.hidden, true);
    assert.equal(fallback.hidden, false);
});

test("opening a card closes other cards and keeps accessibility state synchronized", () => {
    function makeCard(name) {
        const classes = new Set();
        const attributes = {};
        const front = { setAttribute: (key, value) => { front[key] = value; } };
        const back = { setAttribute: (key, value) => { back[key] = value; } };
        const handlers = {};
        return {
            dataset: { memberName: name },
            attributes,
            front,
            back,
            handlers,
            classList: {
                contains: value => classes.has(value),
                toggle: (value, force) => force ? classes.add(value) : classes.delete(value)
            },
            setAttribute: (key, value) => { attributes[key] = value; },
            querySelector: selector => selector === ".front" ? front : back,
            addEventListener: (event, handler) => { handlers[event] = handler; }
        };
    }

    const first = makeCard("Alex");
    const second = makeCard("Sam");
    const cards = [first, second];
    context.bindFlipInteractions({
        querySelectorAll: selector => {
            if (selector === ".card") return cards;
            if (selector === ".card.is-flipped") return cards.filter(card => card.classList.contains("is-flipped"));
            return [];
        }
    });

    first.handlers.click();
    assert.equal(first.attributes["aria-pressed"], "true");
    assert.equal(first.front.inert, true);
    assert.equal(first.back["aria-hidden"], "false");

    let prevented = false;
    second.handlers.keydown({ target: second, key: "Enter", preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(first.classList.contains("is-flipped"), false);
    assert.equal(first.attributes["aria-pressed"], "false");
    assert.equal(first.attributes["aria-label"], "Show responsibilities for Alex");
    assert.equal(first.front.inert, false);
    assert.equal(first.front["aria-hidden"], "false");
    assert.equal(first.back.inert, true);
    assert.equal(first.back["aria-hidden"], "true");
    assert.equal(second.classList.contains("is-flipped"), true);
    assert.equal(second.attributes["aria-pressed"], "true");

    second.handlers.click();
    assert.equal(second.classList.contains("is-flipped"), false);
    assert.equal(second.attributes["aria-pressed"], "false");
});
