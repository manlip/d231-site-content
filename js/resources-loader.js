    const CARDS_PER_ROW = 3;
    const MIN_ITEM_WIDTH_PX = 160;
    document.documentElement.style.setProperty('--cols', CARDS_PER_ROW);
    document.documentElement.style.setProperty('--min-item', MIN_ITEM_WIDTH_PX + 'px');
    let allItems = [];
    let refreshing = false;
    const escapeHtml = SiteUtils.escapeHtml;
    const isEmbedded = window.self !== window.top;
    if (isEmbedded) document.documentElement.classList.add('embedded');
    const requestResize = SiteUtils.observeEmbedSize(document.body);

    function showStatus(message, isError, withRetry) {
        const container = document.getElementById('accordion-container');
        container.replaceChildren();
        document.getElementById('search-wrap').hidden = true;
        document.getElementById('no-results').hidden = true;
        const el = document.createElement('div');
        el.id = 'status';
        if (isError) el.className = 'error-message';
        el.textContent = message;
        if (withRetry) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-retry';
            btn.textContent = 'Retry';
            btn.addEventListener('click', () => {
                container.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
                refreshData();
            });
            el.appendChild(btn);
        }
        container.appendChild(el);
        requestResize();
    }

    function setStaleNotice(visible) {
        document.getElementById('stale-notice').style.display = visible ? 'block' : 'none';
        requestResize();
    }

    function validateResources(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected a resource object.');
        if (Object.prototype.hasOwnProperty.call(data, 'resources')) {
            if (!Array.isArray(data.resources) || data.resources.some(item =>
                !item || typeof item !== 'object' || Array.isArray(item) ||
                (item.category != null && typeof item.category !== 'string') ||
                (item.subcategory != null && typeof item.subcategory !== 'string')
            )) {
                throw new Error('Expected a list of resource objects with text categories.');
            }
            return data;
        }
        for (const [category, groups] of Object.entries(data)) {
            if (!groups || typeof groups !== 'object' || Array.isArray(groups)) throw new Error(`Invalid category: ${category}`);
            for (const [group, items] of Object.entries(groups)) {
                if (!Array.isArray(items) || items.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
                    throw new Error(`Invalid resource list: ${category}/${group}`);
                }
            }
        }
        return data;
    }

    function groupResources(data) {
        if (!Object.prototype.hasOwnProperty.call(data, 'resources')) return data;
        const categories = Object.create(null);
        data.resources.forEach(item => {
            const category = (item.category || '').trim() || 'Other';
            const subcategory = (item.subcategory || '').trim();
            if (!categories[category]) categories[category] = Object.create(null);
            if (!categories[category][subcategory]) categories[category][subcategory] = [];
            categories[category][subcategory].push(item);
        });
        return categories;
    }

    async function refreshData() {
        if (refreshing) return;
        refreshing = true;
        try {
            await SiteUtils.loadJsonWithSWR('data/resources.json', 'district_resources', {
                validate: validateResources,
                onRender: data => { setStaleNotice(false); renderAccordion(groupResources(data)); },
                onStaleError: () => setStaleNotice(true),
                onFatalError: error => showStatus(error.message, true, true)
            });
        } finally {
            refreshing = false;
        }
    }

    // ---------- Rendering ----------

    // Line-style (stroke) icons, 24x24 viewBox
    const ICONS = {
        calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
        training: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
        users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
        video: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 9 5 3-5 3z"/>',
        palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2H19a3 3 0 0 0 3-3c0-5.5-4.5-10-10-10z"/>',
        money: '<circle cx="12" cy="12" r="10"/><path d="M15 9.5C14.5 8.5 13.4 8 12 8c-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2m0 8v2"/>',
        help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
        userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
        folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
    };

    const CATEGORY_ICON_RULES = [
        [/event|calendar|meeting|schedule/i, 'calendar'],
        [/contest|speech|award|compet/i, 'award'],
        [/train|educat|learn|pathway|course|webinar/i, 'training'],
        [/officer|leader|club|team|role/i, 'users'],
        [/form|templat|document|download/i, 'file'],
        [/video|record|media/i, 'video'],
        [/brand|logo|design|image|photo/i, 'palette'],
        [/finance|money|fee|dues|pay/i, 'money'],
        [/help|faq|support|guide|how/i, 'help'],
        [/member|join|new/i, 'userplus'],
        [/link|website|web|social/i, 'link']
    ];

    const svgIcon = (name) =>
        `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

    // Optional categoryIcon/icon field: an icon name from ICONS (e.g. "award"), or any text/emoji
    function categoryIconHtml(catName, items) {
        const custom = items.find(i => i && (i.categoryIcon || i.icon));
        if (custom) {
            const value = (custom.categoryIcon || custom.icon).toString().trim();
            return ICONS[value.toLowerCase()] ? svgIcon(value.toLowerCase()) : escapeHtml(value);
        }
        const hit = CATEGORY_ICON_RULES.find(([re]) => re.test(catName));
        return svgIcon(hit ? hit[1] : 'folder');
    }

    // Plain-text preview of the Markdown description for the card
    function plainSnippet(text) {
        if (!text) return '';
        return text.toString()
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[#*_`~>|]+/g, ' ')
            .replace(/^\s*[-+]\s+/gm, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 160);
    }

    function itemBadge(item) {
        if (item.type && item.type.toString().trim()) return item.type.toString().trim();
        const links = parseLinks(item);
        if (!links.length) return '';
        if (links.length > 1) return links.length + ' links';
        const url = links[0].url.toLowerCase();
        if (/\.pdf(\?|#|$)/.test(url)) return 'PDF';
        if (/docs\.google\.com\/forms|forms\.gle|forms\.office/.test(url)) return 'Form';
        if (/docs\.google\.com\/document|\.docx?(\?|#|$)/.test(url)) return 'Doc';
        if (/docs\.google\.com\/spreadsheets|\.xlsx?(\?|#|$)/.test(url)) return 'Sheet';
        if (/docs\.google\.com\/presentation|\.pptx?(\?|#|$)/.test(url)) return 'Slides';
        if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) return 'Video';
        if (/^mailto:/.test(url)) return 'Email';
        return 'Link';
    }

    // description2/description3 (older sheets used note2/note3)
    const desc2 = (i) => String(i.description2 || i.note2 || '').trim();
    const desc3 = (i) => String(i.description3 || i.note3 || '').trim();

    let openCategory = null;

    // Categories become dropdowns; subcategories are flattened and each item becomes a card
    function renderAccordion(treeData) {
        const container = document.getElementById('accordion-container');
        container.innerHTML = '';
        allItems = [];

        const categories = Object.keys(treeData || {});

        if (categories.length === 0) {
            showStatus('No active records match the provided safety/visibility rules.', false, false);
            return;
        }

        categories.forEach((catName, catIndex) => {
            const items = [];
            Object.keys(treeData[catName]).forEach(subKey => {
                const list = treeData[catName][subKey];
                if (Array.isArray(list)) items.push(...list.filter(item => item.visibility !== 'hidden'));
            });
            if (!items.length) return;

            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'category-group';
            categoryGroup.dataset.name = catName;

            const bodyId = 'cat-body-' + catIndex;
            categoryGroup.innerHTML = `
                <button type="button" class="category-header" aria-expanded="false" aria-controls="${bodyId}">
                    <span class="category-emoji" aria-hidden="true">${categoryIconHtml(catName, items)}</span>
                    <span class="category-title-row">
                        <span class="category-title">${escapeHtml(catName)}</span>
                    </span>
                    <span class="category-icon" aria-hidden="true">▼</span>
                </button>
                <div class="category-body" id="${bodyId}">
                    <div class="category-content"><div class="category-inner"></div></div>
                </div>
            `;
            categoryGroup.querySelector('.category-header').addEventListener('click', () => toggleCategory(categoryGroup));

            const contentArea = categoryGroup.querySelector('.category-inner');

            items.forEach((item, i) => {
                const index = allItems.push(item) - 1;
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'resource-card';
                card.style.setProperty('--i', Math.min(i, 12));
                const badge = itemBadge(item);
                card.dataset.search = [item.title, item.description, desc2(item), desc3(item), catName, badge]
                    .filter(Boolean).join(' ').toLowerCase();
                card.innerHTML =
                    `<span class="card-title">${escapeHtml(plainSnippet(item.title) || 'Untitled Resource Entry')}</span>` +
                    `<span class="item-go" aria-hidden="true">›</span>`;
                card.addEventListener('click', () => openModal(index, card));
                contentArea.appendChild(card);
            });

            container.appendChild(categoryGroup);
        });

        if (!allItems.length) {
            showStatus('No active records match the provided safety/visibility rules.', false, false);
            return;
        }
        document.getElementById('search-wrap').hidden = false;

        const prev = openCategory && Array.from(container.children).find(g => g.dataset.name === openCategory);
        if (prev) setOpen(prev, true); else openCategory = null;

        applySearch();
        requestResize();
    }

    function setOpen(group, open) {
        group.classList.toggle('open', open);
        group.querySelector('.category-header').setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    // Accordion behavior: opening a category collapses all the others
    function toggleCategory(group) {
        const willOpen = !group.classList.contains('open');
        const searching = document.getElementById('resource-search').value.trim() !== '';
        if (searching) {
            setOpen(group, willOpen);
        } else {
            document.querySelectorAll('.category-group.open').forEach(g => setOpen(g, false));
            if (willOpen) setOpen(group, true);
            openCategory = willOpen ? group.dataset.name : null;
        }
        // Page position is left alone so the categories above stay reachable
        requestResize();
    }

    // Filters cards across all categories; matching categories auto-expand
    function applySearch() {
        const query = document.getElementById('resource-search').value.trim().toLowerCase();
        const terms = query.split(/\s+/).filter(Boolean);
        let totalMatches = 0;

        document.querySelectorAll('.category-group').forEach(group => {
            let matches = 0;
            group.querySelectorAll('.resource-card').forEach(card => {
                const ok = terms.every(t => card.dataset.search.includes(t));
                card.hidden = !ok;
                if (ok) matches++;
            });
            totalMatches += matches;

            if (terms.length) {
                group.hidden = matches === 0;
                setOpen(group, matches > 0);
            } else {
                group.hidden = false;
                setOpen(group, group.dataset.name === openCategory);
            }
        });

        document.getElementById('no-results').hidden = !(terms.length && totalMatches === 0);
        requestResize();
    }

    document.getElementById('resource-search').addEventListener('input', applySearch);

    // ---------- Links ----------

    function isSafeUrl(url) {
        return /^https?:\/\//i.test(url) || /^mailto:/i.test(url);
    }

    // Normalizes the link field(s) into [{ name, url }]. Supported formats:
    //   1. JSON array:  [{"name":"Guide (PDF)","url":"https://..."}, {"name":"Form","url":"https://..."}]
    //   2. Text lines:  Guide (PDF) | https://...   (one per line or separated by ";")
    //   3. Single URL:  https://...                 (button shows "Open Resource")
    // Also accepted: a real array in the "resourceLinks" property.
    function parseLinks(item) {
        const raw = item.resourceLinks !== undefined && item.resourceLinks !== '' ? item.resourceLinks : item.resourceLink;
        if (raw === undefined || raw === null || raw === '') return [];

        let entries = [];
        if (Array.isArray(raw)) {
            entries = raw;
        } else {
            const text = raw.toString().trim();
            if (!text) return [];
            if (text.startsWith('[') || text.startsWith('{')) {
                try {
                    const parsed = JSON.parse(text);
                    entries = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    entries = [];
                }
            }
            if (!entries.length) {
                const mdLinks = [...text.matchAll(/\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map(m => ({ name: m[1].trim(), url: m[2].trim() }));
                if (mdLinks.length) entries = mdLinks;
            }
            if (!entries.length) {
                entries = text.split(/[\r\n;]+/).map(s => s.trim()).filter(Boolean).map(line => {
                    const sep = line.lastIndexOf('|');
                    if (sep > 0) return { name: line.slice(0, sep).trim(), url: line.slice(sep + 1).trim() };
                    return { name: '', url: line };
                });
            }
        }

        return entries
            .map(e => (typeof e === 'string' ? { name: '', url: e.trim() } : { name: (e.name || e.title || e.label || '').toString().trim(), url: (e.url || e.link || '').toString().trim() }))
            .filter(e => isSafeUrl(e.url))
            .map(e => ({ name: e.name || 'Open Resource', url: e.url }));
    }

    const inlineMd = SiteMarkdown.renderInline;
    const renderMarkdown = SiteMarkdown.render;

    // ---------- Popup ----------

    let lastFocus = null;
    let stopModalObservation = () => {};

    function openModal(index, trigger) {
        const item = allItems[index];
        if (!item) return;
        lastFocus = trigger || document.activeElement;

        document.getElementById('modal-title').innerHTML = inlineMd(item.title) || 'Resource Information';
        const body = document.getElementById('modal-body');

        let media = '';
        const imageUrl = SiteUtils.getAssetUrl(item.imageLink || item.image);
        if (imageUrl) {
            media = `<div class="modal-media"><div class="image-frame">
                    <img src="${escapeHtml(imageUrl)}" alt="Resource image">
                </div></div>`;
        }

        let text = '';
        if (item.description && item.description.toString().trim() !== '') {
            text += `<div class="md modal-desc">${renderMarkdown(item.description)}</div>`;
        }

        let notesHTML = '';
        if (desc2(item)) {
            notesHTML += `<div class="note-badge md">${renderMarkdown(desc2(item))}</div>`;
        }
        if (desc3(item)) {
            notesHTML += `<div class="note-badge description3-style md">${renderMarkdown(desc3(item))}</div>`;
        }
        if (notesHTML !== '') {
            text += `<div class="note-container">${notesHTML}</div>`;
        }

        const textBlock = text ? `<div class="modal-text">${text}</div>` : '';
        body.innerHTML = `<div class="modal-cols${media && textBlock ? ' has-media' : ''}">${media}${textBlock}</div>`;
        body.scrollTop = 0;

        const footer = document.getElementById('modal-footer');
        const links = parseLinks(item);
        footer.innerHTML = `<div class="footer-row"><div class="link-buttons">${links.map((l) =>
                `<a class="btn-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.name)} &rarr;</a>`
            ).join('')}</div><button type="button" class="btn-close" onclick="closeModal(null)">Close</button></div>`;
        footer.hidden = false;

        document.getElementById('modal-overlay').style.display = 'flex';
        document.documentElement.classList.add('modal-open');
        stopModalObservation = SiteUtils.observeVisibleModal(document.getElementById('modal-overlay'));
        document.querySelector('.modal-close').focus({ preventScroll: true });
        requestResize();
    }

    function closeModal(event) {
        const overlay = document.getElementById('modal-overlay');
        if (!event || event.target === overlay) {
            const wasOpen = overlay.style.display === 'flex';
            overlay.style.display = 'none';
            stopModalObservation();
            document.documentElement.classList.remove('modal-open');
            if (wasOpen && lastFocus && typeof lastFocus.focus === 'function') {
                lastFocus.focus({ preventScroll: true });
            }
            requestResize();
        }
    }

    document.addEventListener('keydown', (e) => {
        const overlay = document.getElementById('modal-overlay');
        if (overlay.style.display !== 'flex') return;
        if (e.key === 'Escape') { closeModal(null); return; }
        if (e.key !== 'Tab') return;
        const focusable = Array.from(overlay.querySelectorAll('button, a[href], [tabindex="0"]')).filter(el => !el.closest('[hidden]'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Start as soon as the HTML is parsed instead of waiting for fonts and images (window.onload)
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshData);
    else refreshData();
