const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const context = vm.createContext({
    document: { currentScript: { src: "https://example.test/site/js/utils.js" } },
    URL
});
vm.runInContext(fs.readFileSync(path.join(root, "js", "utils.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "js", "markdown.js"), "utf8"), context);
const markdown = vm.runInContext("SiteMarkdown", context);

test("renders legacy markdown and protects unsafe input", () => {
    const text = '# Title\n\n**bold** and *italic*\n- One\n- Two\n\n> Quote\n\n---\n\n[Guide](https://example.test/a_(b)) and https://example.test/x.\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))';
    const html = markdown.render(text);
    for (const fragment of ['<h3>Title</h3>', '<strong>bold</strong>', '<em>italic</em>',
        '<ul><li>One</li><li>Two</li></ul>', '<blockquote>Quote</blockquote>', '<hr>',
        'href="https://example.test/a_(b)"', 'href="https://example.test/x"', '&lt;script&gt;']) {
        assert.ok(html.includes(fragment), fragment);
    }
    assert.doesNotMatch(html, /href="javascript:|<script>/);
    assert.equal(markdown.renderInline('**Name**'), '<strong>Name</strong>');
    assert.match(markdown.render('[Email](mailto:hello@example.test)'), /href="mailto:hello@example.test"/);
});
