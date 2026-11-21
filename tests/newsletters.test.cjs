const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup(data) {
    class Element {
        constructor(tag = "div") {
            this.tagName = tag;
            this.children = [];
            this.handlers = {};
            this.hidden = false;
            this.scrollLeft = 0;
            this.clientWidth = 100;
            this.scrollWidth = 300;
        }
        append(...items) { this.children.push(...items); }
        replaceChildren(...items) { this.children = items; }
        addEventListener(type, handler) { this.handlers[type] = handler; }
        scrollBy(value) { this.lastScroll = value; }
        get firstElementChild() { return this.children[0]; }
        getBoundingClientRect() { return { width: 100 }; }
        replaceWith(element) { this.replacement = element; }
    }
    const root = new Element();
    const carousel = new Element();
    const elements = Object.fromEntries(["news-notice", "news-status", "newsletters", "news-previous", "news-next"].map(id => [id, new Element()]));
    let options;
    const context = vm.createContext({
        URL,
        document: {
            querySelector: selector => selector === ".news" ? root : carousel,
            getElementById: id => elements[id],
            createElement: tag => new Element(tag)
        },
        window: { addEventListener() {} },
        getComputedStyle: () => ({ columnGap: "8px" }),
        SiteUtils: {
            observeEmbedSize: () => () => {},
            getAssetUrl: value => new URL(value.replace(/^\/+/, ""), "https://example.test/d231-site-content/").href,
            loadJsonWithSWR: (_path, _key, callbacks) => {
                options = callbacks;
                if (data) callbacks.onRender(callbacks.validate(data));
            }
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "news-loader.js"), "utf8"), context);
    return { context, elements, carousel, options, Element };
}

test("validates newsletter data and supports repository and external URLs safely", () => {
    const { context } = setup();
    assert.throws(() => context.validateNewsletters({ newsletters: [{}] }), /Expected a list/);
    assert.throws(() => context.validateNewsletters({ newsletters: [{ title: "Issue", url: 3 }] }), /Expected a list/);
    assert.equal(context.newsletterUrl("assets/files/issue.pdf"), "https://example.test/d231-site-content/assets/files/issue.pdf");
    assert.equal(context.newsletterUrl("/assets/files/issue.pdf"), "https://example.test/d231-site-content/assets/files/issue.pdf");
    assert.equal(context.newsletterUrl("javascript:alert(1)"), "");
    assert.equal(context.newsletterUrl("https://example.org/issue.pdf"), "https://example.org/issue.pdf");
});

test("renders public newsletters safely and falls back when a cover fails", () => {
    const { elements, carousel } = setup({ newsletters: [
        { title: "<Issue>", date: "November", image: "cover.png", url: "issue.pdf" },
        { title: "No PDF" },
        { title: "Hidden", visibility: "hidden" }
    ] });
    const track = elements.newsletters;
    assert.equal(carousel.hidden, false);
    assert.equal(track.children.length, 2);
    const [card, noPdf] = track.children;
    assert.equal(card.tagName, "a");
    assert.equal(card.rel, "noopener noreferrer");
    assert.equal(card.children[1].children[1].textContent, "<Issue>");
    assert.equal(noPdf.tagName, "article");
    card.children[0].handlers.error();
    assert.equal(card.children[0].replacement.textContent, "Newsletter cover");
    assert.equal(elements["news-previous"].disabled, true);
    elements["news-next"].handlers.click();
    assert.equal(track.lastScroll.left, 108);
});

test("empty, stale, and fatal states stay visible and offer retry", () => {
    const env = setup({ newsletters: [] });
    assert.equal(env.carousel.hidden, true);
    assert.equal(env.elements["news-status"].textContent, "No newsletters published yet.");
    env.options.onStaleError();
    assert.equal(env.elements["news-notice"].hidden, false);
    env.options.onFatalError(new Error("offline"));
    assert.match(env.elements["news-status"].textContent, /offline/);
    assert.equal(env.elements["news-status"].children[0].textContent, "Retry");
});
