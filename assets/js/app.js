(function () {
  "use strict";

  const SITE_TITLE = "THE DAILY CHRONICLE"; // edit this to rename your paper

  const els = {
    masthead: document.getElementById("masthead-date"),
    editionCount: document.getElementById("edition-count"),
    book: document.getElementById("book"),
    loading: document.getElementById("loading-msg"),
    empty: document.getElementById("empty-msg"),
    rackStrip: document.getElementById("rack-strip"),
    pageIndicator: document.getElementById("page-indicator"),
    prevBtn: document.getElementById("prev-page"),
    nextBtn: document.getElementById("next-page"),
    fullscreenBtn: document.getElementById("fullscreen-btn"),
    viewer: document.getElementById("viewer"),
  };

  document.getElementById("site-title").textContent = SITE_TITLE;
  document.title = `${titleCase(SITE_TITLE)} — E-Paper`;

  let issues = [];
  let currentIndex = 0;
  let flip = null; // PageFlip instance, or null if using fallback mode
  let fallbackPage = 0; // used when PageFlip lib isn't available

  function titleCase(s) {
    return s
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async function loadManifest() {
    try {
      const res = await fetch("data/issues.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      issues = Array.isArray(data.issues) ? data.issues : [];
    } catch (err) {
      console.error("Could not load data/issues.json", err);
      issues = [];
    }
  }

  function renderRack() {
    els.rackStrip.innerHTML = "";
    issues.forEach((issue, i) => {
      const btn = document.createElement("button");
      btn.className = "rack__item" + (i === currentIndex ? " is-active" : "");
      btn.setAttribute("data-index", i);
      btn.innerHTML = `
        <img class="rack__thumb" src="${issue.pages[0]}" alt="Front page, ${formatDate(issue.date)}" loading="lazy" />
        <span class="rack__date">${issue.date}</span>
      `;
      btn.addEventListener("click", () => openIssue(i));
      els.rackStrip.appendChild(btn);
    });
  }

  function updateActiveRackItem() {
    [...els.rackStrip.children].forEach((child, i) => {
      child.classList.toggle("is-active", i === currentIndex);
    });
  }

  function updatePageIndicator(current, total) {
    els.pageIndicator.textContent = `${current} / ${total}`;
  }

  function destroyViewer() {
    if (flip) {
      try { flip.destroy(); } catch (e) { /* noop */ }
      flip = null;
    }
    els.book.innerHTML = "";
  }

  function openIssue(index) {
    if (!issues[index]) return;
    currentIndex = index;
    const issue = issues[index];
    els.masthead.textContent = formatDate(issue.date);
    updateActiveRackItem();
    destroyViewer();

    const canUsePageFlip = typeof window.St !== "undefined" && window.St.PageFlip;

    if (canUsePageFlip) {
      initPageFlip(issue.pages);
    } else {
      initFallback(issue.pages);
    }
  }

  function initPageFlip(pages) {
    flip = new window.St.PageFlip(els.book, {
      width: 550,
      height: 733,
      size: "stretch",
      minWidth: 280,
      maxWidth: 900,
      minHeight: 380,
      maxHeight: 1200,
      maxShadowOpacity: 0.4,
      showCover: false,
      mobileScrollSupport: true,
      usePortrait: true,
    });

    flip.loadFromImages(pages);

    flip.on("flip", (e) => {
      updatePageIndicator(e.data + 1, pages.length);
    });

    flip.on("init", () => {
      updatePageIndicator(1, pages.length);
    });
  }

  function initFallback(pages) {
    // Simple single-image viewer for browsers/environments where the
    // page-flip library failed to load (e.g. offline, blocked CDN).
    els.book.classList.add("book--fallback");
    fallbackPage = 0;

    const img = document.createElement("img");
    img.alt = "Newspaper page";
    els.book.appendChild(img);

    function render() {
      img.src = pages[fallbackPage];
      updatePageIndicator(fallbackPage + 1, pages.length);
    }

    flip = {
      flipNext: () => { if (fallbackPage < pages.length - 1) { fallbackPage++; render(); } },
      flipPrev: () => { if (fallbackPage > 0) { fallbackPage--; render(); } },
      destroy: () => {},
    };

    render();
  }

  function setupControls() {
    els.prevBtn.addEventListener("click", () => flip && flip.flipPrev());
    els.nextBtn.addEventListener("click", () => flip && flip.flipNext());

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") flip && flip.flipPrev();
      if (e.key === "ArrowRight") flip && flip.flipNext();
    });

    els.fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        els.viewer.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });
  }

  async function init() {
    setupControls();
    await loadManifest();

    if (issues.length === 0) {
      els.loading.hidden = true;
      els.empty.hidden = false;
      els.editionCount.textContent = "No editions yet";
      return;
    }

    els.editionCount.textContent =
      issues.length === 1 ? "1 edition in the archive" : `${issues.length} editions in the archive`;

    renderRack();
    els.loading.hidden = true;
    openIssue(0); // latest issue (manifest is sorted newest-first)
  }

  init();
})();
