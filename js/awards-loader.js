const AWARDS_CONFIG = {
    dataPath: "data/awards.json",
    cachePrefix: "district_awards",
    cardsPerRow: 5,
    minimumCardWidth: 150
};

const AWARD_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"></circle><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"></path></svg>';
let awardsByIndex = [];
let previouslyFocusedElement = null;
let requestAwardsResize = () => {};

function initAwardsPage() {
    const root = document.getElementById("awards-container");
    if (!root) return;

    document.documentElement.style.setProperty("--award-columns", AWARDS_CONFIG.cardsPerRow);
    document.documentElement.style.setProperty("--award-min-card", `${AWARDS_CONFIG.minimumCardWidth}px`);

    requestAwardsResize = SiteUtils.observeEmbedSize(document.querySelector(".awards-page"));
    loadAwards(root);

    root.addEventListener("click", (event) => {
        const detailsButton = event.target.closest("[data-award-index]");
        if (detailsButton) openAwardModal(Number(detailsButton.dataset.awardIndex));
    });

    const modal = document.getElementById("award-modal");
    modal.addEventListener("click", (event) => {
        if (event.target === modal || event.target.closest("[data-action='close']")) closeAwardModal();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) closeAwardModal();
    });
    document.addEventListener("error", handleAwardImageError, true);
}

function loadAwards(root) {
    SiteUtils.loadJsonWithSWR(AWARDS_CONFIG.dataPath, AWARDS_CONFIG.cachePrefix, {
        validate: validateAwardsData,
        onRender: (data) => {
            renderAwards(data, root);
            document.getElementById("awards-loading").hidden = true;
            document.getElementById("awards-notice").hidden = true;
            requestAwardsResize();
        },
        onStaleError: () => {
            document.getElementById("awards-notice").hidden = false;
            requestAwardsResize();
        },
        onFatalError: (error) => {
            const loading = document.getElementById("awards-loading");
            loading.classList.add("error");
            loading.replaceChildren();
            const message = document.createElement("p");
            message.textContent = `Could not load awards: ${error.message}`;
            loading.append(message);
            const retry = document.createElement("button");
            retry.className = "modal-close-button";
            retry.type = "button";
            retry.textContent = "Retry";
            retry.addEventListener("click", () => {
                loading.textContent = "Loading awards...";
                loading.classList.remove("error");
                loadAwards(root);
            });
            loading.append(retry);
            requestAwardsResize();
        }
    });
}

function validateAwardsData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Expected an object containing awards.");
    }

    if (!Array.isArray(data.awards)) {
        throw new Error("Expected the awards field to contain a list.");
    }
    if (data.awards.some((award) => !award || typeof award !== "object" || Array.isArray(award))) {
        throw new Error("Expected every award to be an object.");
    }
    return data;
}

function normalizeAwards(data) {
    const categories = new Map();
    const add = (category, subcategory, award) => {
        if (!categories.has(category)) categories.set(category, new Map());
        const groups = categories.get(category);
        if (!groups.has(subcategory)) groups.set(subcategory, []);
        groups.get(subcategory).push(award);
    };

    (data.awards || []).forEach((award) => {
        if (award.visibility === "hidden") return;
        add(String(award.category || "Awards").trim(), String(award.subcategory || "General").trim(), award);
    });

    return [...categories.entries()].map(([name, groups]) => ({
        name,
        groups: [...groups.entries()].map(([subcategory, awards]) => ({ name: subcategory, awards }))
    }));
}

function renderAwards(data, root) {
    awardsByIndex = [];
    const categories = normalizeAwards(data);
    let total = 0;

    root.innerHTML = categories.map((category) => {
        const groups = category.groups.filter((group) => group.awards.length);
        if (!groups.length) return "";
        return `
            <section class="award-section" aria-label="${escapeAwardHtml(category.name)}">
                <h2 class="award-section-title">${AWARD_ICON}<span>${escapeAwardHtml(category.name)}</span></h2>
                ${groups.map((group) => {
                    total += group.awards.length;
                    const cards = group.awards.map((award) => {
                        const index = awardsByIndex.push(award) - 1;
                        return renderAwardCard(award, index);
                    }).join("");
                    return `
                        <div class="award-grid">${cards}</div>
                    `;
                }).join("")}
            </section>
        `;
    }).join("");

    document.getElementById("awards-empty").hidden = total > 0;
}

function renderAwardCard(award, index) {
    const title = plainAwardText(award.title || "Untitled Award");
    const description = plainAwardText(award.description || "");
    const period = formatAwardPeriod(award);
    const image = award.badge || award.imageLink || award.image;
    const imageUrl = SiteUtils.getAssetUrl(image);
    const overdue = isAwardOverdue(award);

    return `
        <article class="award-card${overdue ? " overdue" : ""}">
            <div class="award-media">
                ${imageUrl
                    ? `<img class="award-image" src="${escapeAwardHtml(imageUrl)}" alt="${escapeAwardHtml(title)}" loading="lazy" data-award-image>`
                    : `<div class="award-placeholder">${AWARD_ICON}</div>`}
            </div>
            <div class="award-body">
                <h3 class="award-title">${escapeAwardHtml(title)}</h3>
                ${description ? `<p class="award-summary">${escapeAwardHtml(description)}</p>` : ""}
            </div>
            <footer class="award-footer">
                ${period ? `<p class="award-period" title="${escapeAwardHtml(period)}">${escapeAwardHtml(period)}</p>` : ""}
                <div class="award-footer-row">
                    <button class="award-details-button" type="button" data-award-index="${index}" aria-label="Details for ${escapeAwardHtml(title)}">Details &rsaquo;</button>
                </div>
            </footer>
        </article>
    `;
}

function openAwardModal(index) {
    const award = awardsByIndex[index];
    if (!award) return;

    previouslyFocusedElement = document.activeElement;
    const modal = document.getElementById("award-modal");
    document.getElementById("award-modal-content").innerHTML = renderAwardDetails(award);
    modal.hidden = false;
    modal.querySelector(".modal-close").focus();
    requestAwardsResize();
}

function renderAwardDetails(award) {
    const title = String(award.title || "Award");
    const imageUrl = SiteUtils.getAssetUrl(award.badge || award.imageLink || award.image);
    const description = String(award.description || "").trim();
    const details = String(award.description2 || award.details || "").trim();
    const links = parseAwardLinks(award);
    const image = imageUrl
        ? `<img class="modal-image" src="${escapeAwardHtml(imageUrl)}" alt="${escapeAwardHtml(title)}" data-award-image>`
        : `<div class="award-placeholder modal-placeholder">${AWARD_ICON}</div>`;

    return `
        ${image}
        <div class="modal-body">
            <h2 id="award-modal-title">${renderAwardInline(title)}</h2>
            ${description ? `<div class="markdown modal-description">${renderAwardMarkdown(description)}</div>` : ""}
            ${details ? `<section class="modal-details"><h3>Details</h3>${renderAwardMarkdown(details)}</section>` : ""}
            <div class="modal-actions">
                ${links.map((link) => `<a class="award-link" href="${escapeAwardHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeAwardHtml(link.name)} &nearr;</a>`).join("")}
                <button class="modal-close-button" type="button" data-action="close">Close</button>
            </div>
        </div>
    `;
}

function closeAwardModal() {
    const modal = document.getElementById("award-modal");
    if (modal.hidden) return;
    modal.hidden = true;
    previouslyFocusedElement?.focus();
    requestAwardsResize();
}

function parseAwardLinks(award) {
    const entries = [];
    const raw = award.resourceLinks || award.resourceLink;
    if (Array.isArray(raw)) {
        raw.forEach((entry) => entries.push(entry));
    } else if (raw) {
        const text = String(raw).trim();
        const markdownLink = /\[([^\]]+)\]\(\s*<?(https?:\/\/[^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g;
        let match;
        while ((match = markdownLink.exec(text))) entries.push({ name: match[1], url: match[2] });
        if (!entries.length) {
            text.split(/[\r\n;]+/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
                const separator = line.lastIndexOf("|");
                entries.push(separator > 0
                    ? { name: line.slice(0, separator).trim(), url: line.slice(separator + 1).trim() }
                    : { url: line });
            });
        }
    }

    if (award.pdf) entries.push({ name: "Related document", url: SiteUtils.getAssetUrl(award.pdf) });

    return entries.map((entry) => typeof entry === "string" ? { url: entry } : entry)
        .map((entry) => ({
            name: String(entry.name || entry.title || entry.label || "Open link").trim(),
            url: String(entry.url || entry.link || "").trim()
        }))
        .filter((entry) => /^https?:\/\//i.test(entry.url) || /^mailto:/i.test(entry.url));
}

const renderAwardMarkdown = SiteMarkdown.render;
const renderAwardInline = SiteMarkdown.renderInline;

function plainAwardText(text) {
    return String(text)
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[#*_`~>|]+/g, " ")
        .replace(/^\s*[-+]\s+/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
}

function formatAwardPeriod(award) {
    const period = String(award.period || "").trim();
    return period.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g, (value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? value
            : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    });
}

function isAwardOverdue(award) {
    const source = [award.periodEnd, award.endDate, award.period]
        .find((value) => value != null && String(value).trim());
    if (!source) return false;
    let text = String(source).replace(/[*_`~]/g, "");
    const dates = [];
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const addDate = (year, month, day) => {
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return;
        date.setHours(23, 59, 59, 999);
        dates.push(date.getTime());
    };
    const consume = (pattern, parse) => {
        text = text.replace(pattern, (...match) => {
            parse(match);
            return " ";
        });
    };

    consume(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g, (match) => {
        const date = new Date(match[0]);
        if (!Number.isNaN(date.getTime())) addDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    });
    consume(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (match) => addDate(match[1], match[2], match[3]));
    consume(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g, (match) => addDate(match[3], match[2], match[1]));
    consume(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(\d{4})\b/gi,
        (match) => addDate(match[3], months.indexOf(match[1].slice(0, 3).toLowerCase()) + 1, match[2]));
    consume(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{4})\b/gi,
        (match) => {
            const month = months.indexOf(match[1].slice(0, 3).toLowerCase()) + 1;
            addDate(match[2], month, new Date(Number(match[2]), month, 0).getDate());
        });
    consume(/\b((?:19|20)\d{2})\b/g, (match) => addDate(match[1], 12, 31));
    return dates.length > 0 && Math.max(...dates) < Date.now();
}

function handleAwardImageError(event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.hasAttribute("data-award-image")) return;
    const placeholder = document.createElement("div");
    placeholder.className = image.classList.contains("modal-image")
        ? "award-placeholder modal-placeholder"
        : "award-placeholder";
    placeholder.innerHTML = AWARD_ICON;
    image.replaceWith(placeholder);
}

function escapeAwardHtml(value) {
    return SiteUtils.escapeHtml(value);
}

initAwardsPage();
