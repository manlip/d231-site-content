async function initContentLoader() {
    const mainContainer = document.getElementById("site-app");
    const teamContainer = document.getElementById("team-section");
    const awardsContainer = document.getElementById("awards-section");

    try {
        const data = await SiteUtils.fetchCachedJson("data/content.json");

        // 1. If specific section containers exist on the page, populate them individually
        if (teamContainer && data.team) {
            teamContainer.innerHTML = renderTeam(data.team);
        }
        if (awardsContainer && data.awards) {
            awardsContainer.innerHTML = renderAwards(data.awards);
        }

        // 2. If the unified #site-app container is used, render all available sections
        if (mainContainer) {
            let html = "";
            if (data.team && data.team.length > 0) {
                html += `<section class="content-section"><h2>Our Team</h2><div class="grid-list">${renderTeam(data.team)}</div></section>`;
            }
            if (data.awards && data.awards.length > 0) {
                html += `<section class="content-section"><h2>Awards</h2><div class="grid-list">${renderAwards(data.awards)}</div></section>`;
            }
            mainContainer.innerHTML = html || "<p>No content published yet.</p>";
        }
    } catch (error) {
        if (mainContainer) {
            mainContainer.innerHTML = "<p>Unable to load content at this time.</p>";
        }
    }
}

function renderTeam(teamList) {
    return teamList.map(member => {
        const photoUrl = SiteUtils.getAssetUrl(member.photo);
        const imgHtml = photoUrl
            ? `<img src="${photoUrl}" alt="${member.name || 'Team member'}" class="transparent-img team-photo">`
            : "";

        return `
      <div class="card team-card">
        ${imgHtml}
        <h3>${member.name || ""}</h3>
        <div class="markdown-body">${SiteUtils.parseMarkdown(member.bio)}</div>
      </div>
    `;
    }).join("");
}

function renderAwards(awardsList) {
    return awardsList.map(award => {
        const badgeUrl = SiteUtils.getAssetUrl(award.badge);
        const imgHtml = badgeUrl
            ? `<img src="${badgeUrl}" alt="${award.title || 'Award'}" class="transparent-img award-badge">`
            : "";

        return `
      <div class="card award-card">
        ${imgHtml}
        <h4>${award.title || ""}</h4>
      </div>
    `;
    }).join("");
}

// Run automatically when the script loads
initContentLoader();
