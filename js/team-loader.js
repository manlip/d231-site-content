const TEAM_CONFIG = {
    cardsPerRow: 6,
    dataPath: "data/team.json",
    cachePrefix: "google_sheet_team",
    categoryOrder: ["Trio", "Core Team", "Divisions"] // "Committees" always forced last
};
let requestEmbedResize = () => {};

function initTeamPage() {
    const root = document.getElementById("team-root");
    const notice = document.getElementById("team-notice");
    if (!root) return;

    document.documentElement.style.setProperty(
        "--team-grid-max-width",
        `calc(${TEAM_CONFIG.cardsPerRow * 147}px + ${TEAM_CONFIG.cardsPerRow - 1}rem)`
    );

    requestEmbedResize = SiteUtils.observeEmbedSize(document.querySelector(".page"));
    const load = () => {
        if (notice) notice.hidden = true;
        SiteUtils.loadJsonWithSWR(TEAM_CONFIG.dataPath, TEAM_CONFIG.cachePrefix, {
            validate: validateTeamData,
            onRender: (data) => {
                renderTeamTree(data, root);
                requestEmbedResize();
            },
            onStaleError: () => {
                if (!notice) return;
                notice.textContent = "Could not refresh the team. Showing saved data, which may be outdated.";
                notice.hidden = false;
                requestEmbedResize();
            },
            onFatalError: (error) => {
                root.innerHTML = `
          <div class="status error" role="status">
            <p>Could not load the team: ${escapeHtml(error.message)}</p>
            <button type="button" id="team-retry-btn">Retry</button>
          </div>
        `;
                document.getElementById("team-retry-btn")?.addEventListener("click", () => {
                    root.innerHTML = `<p class="status" role="status">Loading team...</p>`;
                    load();
                });
                requestEmbedResize();
            }
        });
    };

    load();
}

function validateTeamData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Expected an object containing team members.");
    }

    if (Object.prototype.hasOwnProperty.call(data, "members")) {
        if (!Array.isArray(data.members) || data.members.some(
            (member) => !member || typeof member !== "object" || Array.isArray(member)
        )) {
            throw new Error("Expected the members field to contain a list of member objects.");
        }
        return data;
    }

    Object.entries(data).forEach(([category, groups]) => {
        if (!groups || typeof groups !== "object" || Array.isArray(groups)) {
            throw new Error(`Expected subcategories for ${category}.`);
        }
        Object.entries(groups).forEach(([subcategory, members]) => {
            if (!Array.isArray(members) || members.some(
                (member) => !member || typeof member !== "object" || Array.isArray(member)
            )) {
                throw new Error(`Expected a list of members in ${category}/${subcategory}.`);
            }
        });
    });

    return data;
}

function normalizeTeamGroups(rawData) {
    // Supports both flat { members: [...] } and legacy nested { Trio: { "District Trio": [...] } }
    const rows = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.members)
            ? rawData.members
            : null;

    const grouped = new Map();

    if (rows) {
        rows.forEach((item) => {
            if (item.visibility === "hidden") return;
            const cat = (item.category || "Other").trim();
            const sub = (item.subcategory || "Default").trim();
            if (!grouped.has(cat)) grouped.set(cat, new Map());
            if (!grouped.get(cat).has(sub)) grouped.get(cat).set(sub, []);
            grouped.get(cat).get(sub).push(item);
        });
    } else if (rawData && typeof rawData === "object") {
        Object.entries(rawData).forEach(([cat, subs]) => {
            if (!subs || typeof subs !== "object") return;
            const subMap = new Map();
            Object.entries(subs).forEach(([sub, list]) => {
                if (Array.isArray(list)) subMap.set(sub, list);
            });
            grouped.set(cat, subMap);
        });
    }

    // Sort categories: Trio -> Core Team -> Divisions -> [Other] -> Committees
    const sortedCategories = [...grouped.keys()].sort((a, b) => {
        if (a === "Committees") return 1;
        if (b === "Committees") return -1;
        const idxA = TEAM_CONFIG.categoryOrder.indexOf(a);
        const idxB = TEAM_CONFIG.categoryOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
    });

    return sortedCategories.map((cat) => ({
        category: cat,
        subcategories: [...grouped.get(cat).values()]
    }));
}

function renderTeamTree(rawData, root) {
    const sections = normalizeTeamGroups(rawData);
    if (!sections.length) {
        root.innerHTML = `<p class="team-empty">No team members published yet.</p>`;
        return;
    }

    root.innerHTML = sections.map(({ category, subcategories }) => `
    <section class="section" aria-label="${escapeHtml(category)}">
      <div class="heading"><h2>${escapeHtml(category)}</h2></div>
      <div class="subcategory-rows">
        ${subcategories.map((members) => `
          <div class="grid">
            ${members.map(renderMemberCard).join("")}
          </div>
        `).join("")}
      </div>
    </section>
  `).join("");

    bindFlipInteractions(root);
}

function renderMemberCard(member) {
    const name = member.name || member.title || "Team Member";
    const role = member.role || "";
    const resp = member.responsability || member.responsibility || member.description2 || "Details coming soon.";
    const imgUrl = SiteUtils.getAssetUrl(member.imageLink || member.image);

    const placeholder = `
      <div class="portrait" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"></path>
        </svg>
      </div>
      <h3>${escapeHtml(name)}</h3>
      <p class="role">${escapeHtml(role || "Role not provided")}</p>`;
    const frontContent = imgUrl
        ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(name)}${role ? ` - ${escapeHtml(role)}` : ""}" loading="lazy"><div class="image-fallback" hidden>${placeholder}</div>`
        : placeholder;
    const responsibility = resp && String(resp).trim()
        ? `<p>${escapeHtml(String(resp).trim())}</p>`
        : "<p>No additional details provided.</p>";

    return `
    <article class="card" role="button" tabindex="0" aria-pressed="false" aria-label="Show responsibilities for ${escapeHtml(name)}" data-member-name="${escapeHtml(name)}">
      <div class="card-inner">
        <div class="face front${imgUrl ? " image-card" : ""}">${frontContent}</div>
        <div class="face back" inert aria-hidden="true">
          <h3>${escapeHtml(role || "Role not provided")}</h3>
          <div class="details" tabindex="0" aria-label="Details for ${escapeHtml(name)}">${responsibility}</div>
        </div>
      </div>
    </article>
  `;
}

function bindFlipInteractions(root) {
    root.querySelectorAll(".card").forEach((card) => {
        const toggle = () => {
            const flipped = card.classList.toggle("is-flipped");
            card.setAttribute("aria-pressed", String(flipped));
            const front = card.querySelector(".front");
            const back = card.querySelector(".back");
            front.inert = flipped;
            back.inert = !flipped;
            front.setAttribute("aria-hidden", String(flipped));
            back.setAttribute("aria-hidden", String(!flipped));
            card.setAttribute("aria-label", `${flipped ? "Show front for" : "Show responsibilities for"} ${card.dataset.memberName}`);
        };
        card.addEventListener("click", toggle);
        card.addEventListener("keydown", (e) => {
            if (e.target === card && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                toggle();
            }
        });
    });

    root.querySelectorAll(".front img").forEach((image) => {
        image.addEventListener("error", () => {
            image.hidden = true;
            image.parentElement.classList.remove("image-card");
            image.nextElementSibling.hidden = false;
        }, { once: true });
    });
}

function escapeHtml(str) {
    return SiteUtils.escapeHtml(str);
}

initTeamPage();
