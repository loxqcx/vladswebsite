// ============================================================
// You shouldn't need to edit this file. To change which games
// show up, edit games-config.js instead.
// ============================================================

const REFRESH_SECONDS = 60; // CUSTOMIZE: how often stats refresh, in seconds

let lastUpdatedAt = null;
let secondsUntilRefresh = REFRESH_SECONDS;
let displayedValues = { players: 0, visits: 0, projects: 0 };

function formatNumber(num) {
  if (num === null || num === undefined) return "—";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + "B+";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M+";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K+";
  return String(num);
}

function animateValue(el, from, to, formatFn, duration = 1400) {
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = from + (to - from) * eased;
    el.textContent = formatFn(value);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = formatFn(to);
    }
  }
  requestAnimationFrame(tick);
}

async function fetchStats() {
  const placeIds = GAMES.map((g) => g.placeId).join(",");
  const res = await fetch(`/api/stats?placeIds=${placeIds}`);
  if (!res.ok) throw new Error("Stats request failed");
  return res.json();
}

function renderHeroStats(totals) {
  // 
  // 
  document.querySelectorAll("[data-stat='players']").forEach((el) =>
    animateValue(el, displayedValues.players, totals.players, (v) => formatNumber(Math.round(v)))
  );
  document.querySelectorAll("[data-stat='visits']").forEach((el) =>
    animateValue(el, displayedValues.visits, totals.visits, (v) => formatNumber(Math.round(v)))
  );
  document.querySelectorAll("[data-stat='projects']").forEach((el) =>
    animateValue(el, displayedValues.projects, totals.projects, (v) => String(Math.round(v)))
  );

  displayedValues = { players: totals.players, visits: totals.visits, projects: totals.projects };
}

function gameCardHTML(game, stats) {
  const badge = game.badge
    ? `<span class="marquee-card__badge">${game.badge}</span>`
    : "";
  return `
    <a class="marquee-card" href="${game.link}" target="_blank" rel="noopener">
      <div class="marquee-card__image" style="background-image: url('${game.image}')"></div>
      <div class="marquee-card__body">
        ${badge}
        <h4>${game.name}</h4>
        <div class="marquee-card__stats">
          <span><b>${formatNumber(stats.visits)}</b> visits</span>
          <span><b>${formatNumber(stats.playing)}</b> playing</span>
        </div>
      </div>
    </a>
  `;
}

// Renders the auto-scrolling "Featured games" strip on the homepage.
// The list is duplicated once so the CSS animation (translateX -50%)
// loops seamlessly. data-games-marquee="6" limits how many are shown
// (leave blank to show all).
function renderMarquee(statsByPlaceId) {
  const track = document.querySelector("[data-games-marquee]");
  if (!track) return;

  const limit = Number(track.dataset.gamesMarquee) || GAMES.length;
  const games = GAMES.slice(0, limit);

  const cardsHTML = games
    .map((game) => gameCardHTML(game, statsByPlaceId.get(String(game.placeId)) || { playing: null, visits: null }))
    .join("");

  // Duplicate the set so the marquee can loop without a visible seam.
  track.innerHTML = cardsHTML + cardsHTML;
}

// Renders the full grid of games (used on the /games page).
function renderGameGrid(statsByPlaceId) {
  const grid = document.querySelector("[data-games-grid]");
  if (!grid) return;

  const limit = Number(grid.dataset.gamesGrid) || null;
  const games = limit ? GAMES.slice(0, limit) : GAMES;
  grid.innerHTML = "";

  games.forEach((game) => {
    const stats = statsByPlaceId.get(String(game.placeId)) || { playing: null, visits: null };
    const card = document.createElement("article");
    card.className = "game-card";
    card.innerHTML = `
      <div class="game-card__image" style="background-image: url('${game.image}')"></div>
      <div class="game-card__body">
        <h3>${game.name}</h3>
        <p>${game.description}</p>
        <div class="game-card__stats">
          <div><span class="stat-value">${formatNumber(stats.playing)}</span><span class="stat-label">Playing now</span></div>
          <div><span class="stat-value">${formatNumber(stats.visits)}</span><span class="stat-label">Total visits</span></div>
        </div>
        <a class="btn btn--secondary" href="${game.link}" target="_blank" rel="noopener">${game.ctaText} ↗</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateFooterText() {
  const agoEl = document.querySelector("[data-updated-ago]");
  const inEl = document.querySelector("[data-updating-in]");
  if (!agoEl || !inEl) return;

  if (lastUpdatedAt === null) {
    agoEl.textContent = "Updating…";
  } else {
    const secondsAgo = Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000));
    agoEl.textContent = secondsAgo <= 1 ? "Updated just now" : `Updated ${secondsAgo}s ago`;
  }
  inEl.textContent = `Refreshing in ${secondsUntilRefresh}s`;
}

function hidePageLoader() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;
  loader.classList.add("page-loader--hidden");
  setTimeout(() => loader.remove(), 600);
}

async function loadAndRender() {
  try {
    const { games, totals } = await fetchStats();
    const statsByPlaceId = new Map(games.map((g) => [String(g.placeId), g]));
    renderHeroStats(totals);
    renderMarquee(statsByPlaceId);
    renderGameGrid(statsByPlaceId);
    lastUpdatedAt = Date.now();
  } catch (err) {
    console.error("Could not load live stats:", err);
    // Fall back to showing placeholder cards so the page still looks
    // complete (e.g. before you've deployed to Vercel).
    renderMarquee(new Map());
    renderGameGrid(new Map());
  } finally {
    secondsUntilRefresh = REFRESH_SECONDS;
    updateFooterText();
  }
}

// 
// 
function setupScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((item) => observer.observe(item));
}

document.addEventListener("DOMContentLoaded", async () => {
  const loaderStartedAt = Date.now();
  await loadAndRender();
  const minDisplayMs = 500;
  const remaining = Math.max(0, minDisplayMs - (Date.now() - loaderStartedAt));
  setTimeout(hidePageLoader, remaining);

  setupScrollReveal();

  // Keep the footer year current automatically — never goes stale.
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });


  setInterval(() => {
    secondsUntilRefresh = Math.max(0, secondsUntilRefresh - 1);
    updateFooterText();
    if (secondsUntilRefresh === 0) {
      loadAndRender();
    }
  }, 1000);

  // Mobile nav toggle
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("nav-links--open");
    });
  }
});
