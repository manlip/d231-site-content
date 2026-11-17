const TEAM_CONFIG = {
    cardsPerRow: 6,
    dataPath: "data/team.json",
    cachePrefix: "google_sheet_team",
    categoryOrder: ["Trio", "Core Team", "Divisions"] // "Committees" always forced last
};

function initTeamPage() {
    const root = document.getElementById("team-root");
    const notice = document.getElementById("team-notice");
    if (!root) return;

    root.style.setProperty("--cards-per-row", TEAM_CONFIG.cardsPerRow);

    const load = () => {
        notice.hidden = true;
        SiteUtils.loadJsonWithSWR(TEAM_CONFIG.dataPath, TEAM_CONFIG.cachePrefix, {
            onRender: (data) => renderTeamTree(data, root),
            onStaleError: () => {
                notice.textContent = "Could not refresh the team. Showing saved data, which may be outdated.";
                notice.hidden = false;
            },
            onFatalError: () => {
                root.innerHTML = `
          <div class="team-error">
            <p>Unable to load the District Team right now.</p>
            <button type="button" id="team-retry-btn">Retry</button>
          </div>
        `;
                document.getElementById("team-retry-btn")?.addEventListener("click", () => {
                    root.innerHTML = `<p class="team-loading">Loading team...</p>`;
                    load();
                });
            }
        });
    };

    load();
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
    <section class="team-category" aria-label="${escapeHtml(category)}">
      <h2 class="team-category-title">${escapeHtml(category)}</h2>
      ${subcategories.map((members) => `
        <div class="team-grid">
          ${members.map(renderMemberCard).join("")}
        </div>
      `).join("")}
    </section>
  `).join("");

    bindFlipInteractions(root);
}

function renderMemberCard(member) {
    const name = member.name || member.title || "Team Member";
    const role = member.role || "";
    const resp = member.responsability || member.responsibility || member.description2 || "Details coming soon.";
    const imgUrl = SiteUtils.getAssetUrl(member.imageLink || member.image);

    const frontContent = imgUrl
        ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(name)} - ${escapeHtml(role)}" class="team-card-img" loading="lazy">`
        : `<div class="team-card-placeholder">
         <span class="team-initials">${escapeHtml(getInitials(name))}</span>
         <strong class="team-placeholder-name">${escapeHtml(name)}</strong>
         <span class="team-placeholder-role">${escapeHtml(role)}</span>
       </div>`;

    return `
    <div class="team-card" role="button" tabindex="0" aria-pressed="false" aria-label="${escapeHtml(name)}, ${escapeHtml(role)}. Activate to view responsibilities.">
      <div class="team-card-inner">
        <div class="team-card-front">${frontContent}</div>
        <div class="team-card-back">
          <div class="team-back-header">
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(role)}</span>
          </div>
          <div class="team-back-body">${escapeHtml(resp)}</div>
        </div>
      </div>
    </div>
  `;
}

function bindFlipInteractions(root) {
    root.querySelectorAll(".team-card").forEach((card) => {
        const toggle = () => {
            const flipped = card.classList.toggle("is-flipped");
            card.setAttribute("aria-pressed", String(flipped));
        };
        card.addEventListener("click", toggle);
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
            }
        });
    });
}

function getInitials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "D231";
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

initTeamPage();
