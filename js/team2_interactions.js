const TEAM2_FLIP_DELAY_MS = 1250;
const TEAM2_ENLARGE_DURATION_MS = 450;

function initTeam2() {
    const root = document.getElementById("team-root");
    const overlay = document.querySelector(".team2-overlay");
    const stage = overlay.querySelector(".team2-stage");
    const closeButton = overlay.querySelector(".team2-close");
    let activeCard = null;
    let flipTimer = null;
    let stopObserving = null;
    let animationFrame = null;

    function closeCard() {
        if (!activeCard) return;
        clearTimeout(flipTimer);
        cancelAnimationFrame(animationFrame);
        stopObserving?.();
        overlay.hidden = true;
        stage.replaceChildren();
        if (activeCard.isConnected) activeCard.focus({ preventScroll: true });
        activeCard = null;
        flipTimer = null;
        stopObserving = null;
    }

    function openCard(card) {
        if (activeCard) closeCard();
        activeCard = card;
        const origin = card.getBoundingClientRect();
        const enlarged = card.cloneNode(true);
        enlarged.classList.remove("is-flipped");
        enlarged.removeAttribute("role");
        enlarged.removeAttribute("tabindex");
        enlarged.removeAttribute("aria-pressed");
        enlarged.removeAttribute("aria-label");
        overlay.setAttribute("aria-label", `Details for ${card.dataset.memberName}`);
        const front = enlarged.querySelector(".front");
        const back = enlarged.querySelector(".back");
        const image = enlarged.querySelector(".front img");
        if (image && !image.hidden) {
            const showFallback = () => {
                image.hidden = true;
                image.nextElementSibling.hidden = false;
            };
            image.addEventListener("error", showFallback, { once: true });
            if (image.complete && !image.naturalWidth) showFallback();
        }
        front.inert = false;
        front.setAttribute("aria-hidden", "false");
        back.inert = true;
        back.setAttribute("aria-hidden", "true");
        stage.style.setProperty("--team2-card-width", `${origin.width * 2}px`);
        stage.replaceChildren(enlarged);
        overlay.hidden = false;
        stopObserving = SiteUtils.observeVisibleModal(overlay);

        const target = stage.getBoundingClientRect();
        const x = origin.left - target.left;
        const y = origin.top - target.top;
        const scale = origin.width / (target.width / 2);
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reducedMotion) {
            enlarged.style.transition = "none";
            enlarged.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            enlarged.getBoundingClientRect();
            enlarged.style.transition = "";
            animationFrame = requestAnimationFrame(() => {
                enlarged.style.transform = "";
            });
        }
        closeButton.focus({ preventScroll: true });
        flipTimer = setTimeout(() => {
            enlarged.classList.add("is-flipped");
            front.inert = true;
            front.setAttribute("aria-hidden", "true");
            back.inert = false;
            back.setAttribute("aria-hidden", "false");
        }, TEAM2_FLIP_DELAY_MS + (reducedMotion ? 0 : TEAM2_ENLARGE_DURATION_MS));
    }

    root.addEventListener("click", (event) => {
        const card = event.target.closest(".card");
        if (!card || !root.contains(card)) return;
        event.stopPropagation();
        openCard(card);
    }, true);
    root.addEventListener("keydown", (event) => {
        const card = event.target.closest(".card");
        if (!card || event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        event.stopPropagation();
        openCard(card);
    }, true);
    closeButton.addEventListener("click", closeCard);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeCard();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && activeCard) {
            event.preventDefault();
            closeCard();
        } else if (event.key === "Tab" && activeCard) {
            const details = stage.querySelector(".card.is-flipped .details");
            if (!details) {
                event.preventDefault();
                closeButton.focus();
            } else if (event.shiftKey && document.activeElement === closeButton) {
                event.preventDefault();
                details.focus();
            } else if (!event.shiftKey && document.activeElement === details) {
                event.preventDefault();
                closeButton.focus();
            }
        }
    });
}

initTeam2();
