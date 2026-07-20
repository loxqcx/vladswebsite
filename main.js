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
  // Multiple elements can share the same data-stat (hero, stat boxes,
  // and the footer recap line all update together automatically).
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
  const games = limit ? GAMES.slice(0, limit) : GAMES.slice();

  // Highest CCU (current players) first, lowest last.
  games.sort((a, b) => {
    const aPlaying = (statsByPlaceId.get(String(a.placeId)) || {}).playing || 0;
    const bPlaying = (statsByPlaceId.get(String(b.placeId)) || {}).playing || 0;
    return bPlaying - aPlaying;
  });

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

// Fades sections in as they scroll into view. Add class="reveal" to
// any element in the HTML to opt it into this effect.
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
  initCcuGraphPage();

  // Keep the footer year current automatically — never goes stale.
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Ticks once a second: counts down to the next refresh and keeps
  // "Updated Ns ago" accurate in between fetches.
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

// ============================================================
// CCU GRAPH PAGE — only runs on ccu.html (checks for the container
// first). Fetches daily history from /api/history and draws an
// animated SVG line chart.
// ============================================================

function formatChartDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function setupCcuTooltip(wrap, points, chartWidth, chartHeight) {
  const svg = wrap.querySelector(".ccu-chart");
  const tooltip = wrap.querySelector("[data-ccu-tooltip]");
  if (!svg || !tooltip) return;

  svg.addEventListener("mousemove", (e) => {
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width / chartWidth;
    const relX = (e.clientX - rect.left) / scaleX;

    let nearest = points[0];
    let nearestDist = Infinity;
    points.forEach((p) => {
      const dist = Math.abs(p.x - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p;
      }
    });

    tooltip.style.opacity = "1";
    tooltip.style.left = `${(nearest.x / chartWidth) * 100}%`;
    tooltip.style.top = `${(nearest.y / chartHeight) * 100}%`;
    tooltip.textContent = `${formatChartDate(nearest.date)} • ${formatNumber(nearest.players)} playing`;
  });

  svg.addEventListener("mouseleave", () => {
    tooltip.style.opacity = "0";
  });
}

function renderCcuChart(wrap, history) {
  const width = 1000;
  const height = 380;
  const padLeft = 54;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 40;

  const values = history.map((h) => h.players);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points = history.map((h, i) => {
    const x = history.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (history.length - 1)) * plotW;
    const y = padTop + plotH - ((h.players - min) / range) * plotH;
    return { x, y, date: h.date, players: h.players };
  });

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`;

  const maxLabels = 7;
  const labelStep = Math.max(1, Math.ceil(points.length / maxLabels));
  const dateLabels = points
    .filter((_, i) => i % labelStep === 0 || i === points.length - 1)
    .map((p) => `<text x="${p.x}" y="${height - 12}" class="ccu-chart__axis-label" text-anchor="middle">${formatChartDate(p.date)}</text>`)
    .join("");

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const y = padTop + plotH * t;
      const val = Math.round(max - t * range);
      return `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="ccu-chart__grid" /><text x="${padLeft - 10}" y="${y + 4}" class="ccu-chart__axis-label" text-anchor="end">${formatNumber(val)}</text>`;
    })
    .join("");

  wrap.innerHTML = `
    <svg class="ccu-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ccuFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#ccuFill)" stroke="none"></path>
      <path d="${linePath}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="ccu-chart__line"></path>
      ${points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" class="ccu-chart__dot"></circle>`).join("")}
      ${dateLabels}
    </svg>
    <div class="ccu-chart__tooltip" data-ccu-tooltip></div>
  `;

  const linePathEl = wrap.querySelector(".ccu-chart__line");
  const length = linePathEl.getTotalLength();
  linePathEl.style.strokeDasharray = length;
  linePathEl.style.strokeDashoffset = length;
  requestAnimationFrame(() => {
    linePathEl.style.transition = "stroke-dashoffset 1.4s ease";
    linePathEl.style.strokeDashoffset = "0";
  });

  setupCcuTooltip(wrap, points, width, height);
}

function renderCcuStats(history) {
  const peak = Math.max(...history.map((h) => h.players));
  const current = history[history.length - 1].players;
  const days = history.length;

  const setText = (key, text) => {
    const el = document.querySelector(`[data-ccu-stat="${key}"]`);
    if (el) el.textContent = text;
  };
  setText("peak", formatNumber(peak));
  setText("current", formatNumber(current));
  setText("days", String(days));
}

function initCcuGraphPage() {
  const wrap = document.querySelector("[data-ccu-graph]");
  if (!wrap) return; // not on the CCU graph page, skip entirely

  const placeIds = GAMES.map((g) => g.placeId).join(",");

  fetch(`/api/history?placeIds=${placeIds}`)
    .then((res) => res.json())
    .then(({ history }) => {
      if (!history || history.length === 0) {
        wrap.innerHTML = `<div class="ccu-chart-empty">No history yet — daily data starts building from today. Check back tomorrow!</div>`;
        return;
      }
      renderCcuChart(wrap, history);
      renderCcuStats(history);
    })
    .catch(() => {
      wrap.innerHTML = `<div class="ccu-chart-empty">Couldn't load history right now — try refreshing.</div>`;
    });
}
