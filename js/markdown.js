const SiteMarkdown = (() => {
    const escapeHtml = SiteUtils.escapeHtml;
    const isSafeUrl = (url) => /^(?:https?:\/\/|mailto:)/i.test(url);


    // Markdown as a single-line fragment (titles)
    const renderInlineText = (text) => renderInline(escapeHtml(String(text == null ? '' : text).trim()));

    // Minimal, safe Markdown: text is HTML-escaped first, then formatting is applied.
    // Supports headings, **bold**, *italic*, `code`, [text](url), bare URLs, lists, > quotes, --- rules.
    function renderInline(escaped) {
        const codes = [];
        let s = escaped.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
        const links = [];
        const keep = (html) => { links.push(html); return '\u0001' + (links.length - 1) + '\u0001'; };

        s = s.replace(/\[([^\]]+)\]\(\s*(?:&lt;)?((?:[^\s()<>]|\([^\s()]*\))+?)(?:&gt;)?(?:\s+&quot;[^]*?&quot;)?\s*\)/g, (m, text, url) =>
            isSafeUrl(url) ? keep(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`) : m);
        s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+?)([.,;:!?]*)(?=$|[\s<)])/g, (m, pre, url, tail) =>
            pre + keep(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`) + tail);

        s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (m, a, b) => `<strong>${a || b}</strong>`)
             .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>')
             .replace(/(^|[^_\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>')
             .replace(/~~([^~]+)~~/g, '<del>$1</del>');

        return s.replace(/\u0001(\d+)\u0001/g, (m, i) => links[i])
                .replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${codes[i]}</code>`);
    }

    function renderMarkdown(text) {
        if (text === undefined || text === null) return '';
        const lines = escapeHtml(text.toString().replace(/\r\n?/g, '\n')).split('\n');
        const out = [];
        let para = [];
        let list = null;

        const flushPara = () => { if (para.length) { out.push('<p>' + para.map(renderInline).join('<br>') + '</p>'); para = []; } };
        const flushList = () => { if (list) { out.push(`<${list.type}>${list.items.map(i => '<li>' + renderInline(i) + '</li>').join('')}</${list.type}>`); list = null; } };

        lines.forEach(line => {
            let m;
            if (!line.trim()) { flushPara(); flushList(); }
            else if ((m = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/))) {
                flushPara(); flushList();
                const level = Math.min(m[1].length + 2, 6);
                out.push(`<h${level}>${renderInline(m[2])}</h${level}>`);
            }
            else if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { flushPara(); flushList(); out.push('<hr>'); }
            else if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
                flushPara();
                if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
                list.items.push(m[1]);
            }
            else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
                flushPara();
                if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
                list.items.push(m[1]);
            }
            else if ((m = line.match(/^\s*&gt;\s?(.*)$/))) { flushPara(); flushList(); out.push('<blockquote>' + renderInline(m[1]) + '</blockquote>'); }
            else { flushList(); para.push(line.trim()); }
        });
        flushPara(); flushList();
        return out.join('');
    }


    return { render: renderMarkdown, renderInline: renderInlineText };
})();
