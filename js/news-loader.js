function validateNewsletters(data) {
    if (!data || typeof data !== "object" || !Array.isArray(data.newsletters) ||
        data.newsletters.some(item => !item || typeof item !== "object" || Array.isArray(item) ||
            typeof item.title !== "string" || !item.title.trim() ||
            ["date", "image", "url", "visibility"].some(key => item[key] != null && typeof item[key] !== "string"))) {
        throw new Error("Expected a list of newsletters with titles and text fields.");
    }
    return data;
}

function newsletterUrl(value) {
    if (!value || !value.trim()) return "";
    try {
        const url = new URL(SiteUtils.getAssetUrl(value.trim()));
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (error) {
        console.warn("Invalid newsletter URL:", error);
        return "";
    }
}

function renderNewsletterCard(item) {
    const url = newsletterUrl(item.url);
    const image = newsletterUrl(item.image);
    const card = document.createElement(url ? "a" : "article");
    card.className = "newsletter-card";
    if (url) {
        card.href = url;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
    }

    function placeholder() {
        const element = document.createElement("div");
        element.className = "newsletter-thumbnail newsletter-placeholder";
        element.textContent = "Newsletter cover";
        return element;
    }

    if (image) {
        const media = document.createElement("img");
        media.className = "newsletter-thumbnail";
        media.src = image;
        media.alt = "";
        media.loading = "lazy";
        media.addEventListener("error", () => media.replaceWith(placeholder()), { once: true });
        card.append(media);
    } else {
        card.append(placeholder());
    }

    const body = document.createElement("div");
    body.className = "newsletter-body";
    const date = document.createElement("div");
    date.className = "newsletter-date";
    date.textContent = item.date || "";
    const title = document.createElement("h3");
    title.className = "newsletter-title";
    title.textContent = item.title;
    body.append(date, title);
    if (url) {
        const action = document.createElement("p");
        action.className = "newsletter-action";
        action.textContent = "Open PDF ↗";
        body.append(action);
    }
    card.append(body);
    return card;
}

function initNewsPage() {
    const root = document.querySelector(".news");
    if (!root) return;
    const notice = document.getElementById("news-notice");
    const status = document.getElementById("news-status");
    const carousel = document.querySelector(".carousel");
    const track = document.getElementById("newsletters");
    const previous = document.getElementById("news-previous");
    const next = document.getElementById("news-next");
    const requestResize = SiteUtils.observeEmbedSize(root);

    function updateControls() {
        previous.disabled = track.scrollLeft <= 1;
        next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    }

    function render(data) {
        notice.hidden = true;
        const items = data.newsletters.filter(item => item.visibility !== "hidden");
        track.replaceChildren(...items.map(renderNewsletterCard));
        carousel.hidden = !items.length;
        status.hidden = !!items.length;
        status.textContent = items.length ? "" : "No newsletters published yet.";
        track.scrollLeft = 0;
        updateControls();
        requestResize();
    }

    function load() {
        notice.hidden = true;
        status.hidden = false;
        status.textContent = "Loading newsletters...";
        SiteUtils.loadJsonWithSWR("data/newsletters.json", "district_newsletters", {
            validate: validateNewsletters,
            onRender: render,
            onStaleError: () => {
                notice.textContent = "Could not refresh newsletters. Showing saved data, which may be outdated.";
                notice.hidden = false;
                requestResize();
            },
            onFatalError: error => {
                carousel.hidden = true;
                status.hidden = false;
                status.textContent = `Could not load newsletters: ${error.message}`;
                const retry = document.createElement("button");
                retry.type = "button";
                retry.textContent = "Retry";
                retry.addEventListener("click", load);
                status.append(retry);
                requestResize();
            }
        });
    }

    function move(direction) {
        const card = track.firstElementChild;
        if (!card) return;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "auto" });
    }

    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    track.addEventListener("scroll", updateControls, { passive: true });
    window.addEventListener("resize", updateControls);
    window.addEventListener("load", updateControls);
    load();
}

initNewsPage();
