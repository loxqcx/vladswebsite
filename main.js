const REFRESH_SECONDS = 60;

let lastUpdatedAt = null;
let secondsUntilRefresh = REFRESH_SECONDS;
let displayedValues = { players: 0, visits: 0, projects: 0 };

function formatNumber(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return "\u2014";
  const value = Number(num);
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B+`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K+`;
  return String(Math.round(value));
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function animateValue(el, from, to, formatFn, duration = 1100) {
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatFn(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = formatFn(to);
  }
  requestAnimationFrame(tick);
}

function setBackgrounds(selector, gameIndexes) {
  document.querySelectorAll(selector).forEach((el, index) => {
    const game = GAMES[gameIndexes[index % gameIndexes.length] % GAMES.length];
    if (game) el.style.backgroundImage = `url("${game.image}")`;
  });
}

function renderHeroMosaic() {
  const mosaic = document.querySelector("[data-hero-mosaic]");
  if (!mosaic || !GAMES.length) return;

  const rows = 4;
  const rowMarkup = Array.from({ length: rows }, (_, rowIndex) => {
    const ordered = GAMES.map((_, index) => GAMES[(index + rowIndex * 2) % GAMES.length]);
    const tiles = ordered
      .map((game) => `<span class="mosaic-tile" style="background-image:url('${game.image}')"></span>`)
      .join("");
    return `<div class="mosaic-row">${tiles}${tiles}</div>`;
  }).join("");

  mosaic.innerHTML = rowMarkup;
}

function renderPageArtwork() {
  setBackgrounds(".about-visual__card", [1, 0]);
  setBackgrounds("[data-cta-art]", [4]);
  setBackgrounds("[data-page-hero-art]", [2]);
}

async function fetchStats() {
  const placeIds = GAMES.map((game) => game.placeId).join(",");
  const response = await fetch(`/api/stats?placeIds=${placeIds}`);
  if (!response.ok) throw new Error("Stats request failed");
  return response.json();
}

function renderSiteStats(totals) {
  const safeTotals = {
    players: Number(totals.players) || 0,
    visits: Number(totals.visits) || 0,
    projects: Number(totals.projects) || GAMES.length,
  };

  Object.entries(safeTotals).forEach(([key, value]) => {
    document.querySelectorAll(`[data-stat="${key}"]`).forEach((el) => {
      animateValue(el, displayedValues[key], value, key === "projects" ? (v) => String(Math.round(v)) : (v) => formatNumber(v));
    });
  });
  displayedValues = safeTotals;
}

function gameCardHTML(game, stats) {
  const badge = game.badge ? `<span class="marquee-card__badge">${escapeHTML(game.badge)}</span>` : "";
  return `
    <a class="marquee-card" href="${escapeHTML(game.link)}" target="_blank" rel="noopener noreferrer">
      <div class="marquee-card__image" style="background-image:url('${game.image}')"></div>
      <div class="marquee-card__body">
        ${badge}
        <h3>${escapeHTML(game.name)}</h3>
        <div class="marquee-card__stats">
          <span><b>${formatNumber(stats.visits)}</b> visits</span>
          <span><b>${formatNumber(stats.playing)}</b> playing</span>
        </div>
      </div>
    </a>`;
}

function renderMarquee(statsByPlaceId) {
  const track = document.querySelector("[data-games-marquee]");
  if (!track) return;
  const limit = Number(track.dataset.gamesMarquee) || GAMES.length;
  const games = GAMES.slice(0, limit);
  const cards = games.map((game) => gameCardHTML(game, statsByPlaceId.get(String(game.placeId)) || {})).join("");
  track.innerHTML = cards + cards;
}

function renderGameGrid(statsByPlaceId) {
  const grid = document.querySelector("[data-games-grid]");
  if (!grid) return;

  const games = GAMES.slice().sort((a, b) => {
    const aPlaying = Number(statsByPlaceId.get(String(a.placeId))?.playing) || 0;
    const bPlaying = Number(statsByPlaceId.get(String(b.placeId))?.playing) || 0;
    return bPlaying - aPlaying;
  });

  grid.innerHTML = games.map((game) => {
    const stats = statsByPlaceId.get(String(game.placeId)) || {};
    return `
      <article class="game-card">
        <a class="game-card__image-link" href="${escapeHTML(game.link)}" target="_blank" rel="noopener noreferrer" aria-label="Play ${escapeHTML(game.name)} on Roblox">
          <div class="game-card__image" style="background-image:url('${game.image}')"></div>
        </a>
        <div class="game-card__body">
          <h3>${escapeHTML(game.name)}</h3>
          <p>${escapeHTML(game.description)}</p>
          <div class="game-card__stats">
            <div><span class="stat-value">${formatNumber(stats.playing)}</span><span class="stat-label">Playing</span></div>
            <div><span class="stat-value">${formatNumber(stats.visits)}</span><span class="stat-label">Visits</span></div>
          </div>
          <a class="btn btn--outline game-card__action" href="${escapeHTML(game.link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(game.ctaText)} <span aria-hidden="true">&nearr;</span></a>
        </div>
      </article>`;
  }).join("");
}

function hidePageLoader() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;
  loader.classList.add("page-loader--hidden");
  window.setTimeout(() => loader.remove(), 500);
}

async function loadAndRender() {
  try {
    const { games, totals } = await fetchStats();
    const statsByPlaceId = new Map((games || []).map((game) => [String(game.placeId), game]));
    renderSiteStats(totals || { players: 0, visits: 0, projects: GAMES.length });
    renderMarquee(statsByPlaceId);
    renderGameGrid(statsByPlaceId);
    lastUpdatedAt = Date.now();
  } catch (error) {
    console.warn("Live stats are unavailable in this preview.");
    renderSiteStats({ players: 0, visits: 0, projects: GAMES.length });
    renderMarquee(new Map());
    renderGameGrid(new Map());
  } finally {
    secondsUntilRefresh = REFRESH_SECONDS;
  }
}

function setupScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("reveal--visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal--visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach((item) => observer.observe(item));
}

function setupMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("nav-links--open");
    document.body.classList.toggle("nav-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Close" : "Menu";
  });
}

function historyUrl() {
  return `/api/history?placeIds=${GAMES.map((game) => game.placeId).join(",")}`;
}

function normalizeHistoryEntry(entry) {
  const timestamp = entry.timestamp || (entry.date ? `${entry.date}T00:00:00.000Z` : null);
  return timestamp ? { timestamp, players: Number(entry.players) || 0 } : null;
}

function formatChartTime(timestamp, includeDate = false) {
  const date = new Date(timestamp);
  const options = includeDate
    ? { month: "short", day: "numeric", hour: "numeric" }
    : { hour: "numeric" };
  return date.toLocaleString(undefined, options);
}

function smoothPath(points) {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}

function setupCcuTooltip(wrap, points, chartWidth, chartHeight) {
  const svg = wrap.querySelector(".ccu-chart");
  const tooltip = wrap.querySelector("[data-ccu-tooltip]");
  if (!svg || !tooltip) return;
  svg.addEventListener("mousemove", (event) => {
    const rect = svg.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / (rect.width / chartWidth);
    const nearest = points.reduce((best, point) => Math.abs(point.x - relativeX) < Math.abs(best.x - relativeX) ? point : best, points[0]);
    tooltip.style.opacity = "1";
    tooltip.style.left = `${(nearest.x / chartWidth) * 100}%`;
    tooltip.style.top = `${(nearest.y / chartHeight) * 100}%`;
    tooltip.textContent = `${formatChartTime(nearest.timestamp, true)} \u00b7 ${formatNumber(nearest.players)} playing`;
  });
  svg.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; });
}

function renderCcuChart(wrap, history) {
  const width = 1000;
  const height = 390;
  const pad = { left: 58, right: 18, top: 24, bottom: 44 };
  const values = history.map((entry) => entry.players);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const points = history.map((entry, index) => ({
    x: history.length === 1 ? pad.left + plotWidth / 2 : pad.left + (index / (history.length - 1)) * plotWidth,
    y: pad.top + plotHeight - ((entry.players - min) / range) * plotHeight,
    ...entry,
  }));
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points.at(-1).x} ${pad.top + plotHeight} L ${points[0].x} ${pad.top + plotHeight} Z`;

  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const labels = points.filter((_, index) => index % labelStep === 0 || index === points.length - 1).map((point, index, filtered) => {
    const showDate = index === 0 || index === filtered.length - 1 || new Date(point.timestamp).getHours() === 0;
    return `<text x="${point.x}" y="${height - 12}" class="ccu-chart__axis-label" text-anchor="middle">${formatChartTime(point.timestamp, showDate)}</text>`;
  }).join("");
  const grid = [0, .25, .5, .75, 1].map((step) => {
    const y = pad.top + plotHeight * step;
    const value = Math.round(max - step * range);
    return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="ccu-chart__grid"/><text x="${pad.left - 11}" y="${y + 4}" class="ccu-chart__axis-label" text-anchor="end">${formatNumber(value)}</text>`;
  }).join("");

  wrap.innerHTML = `
    <svg class="ccu-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hourly total concurrent player history">
      <defs><linearGradient id="ccuFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity=".22"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      ${grid}<path d="${areaPath}" fill="url(#ccuFill)"/><path class="ccu-chart__line" d="${linePath}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.5" class="ccu-chart__dot${points.length === 1 ? " ccu-chart__dot--single" : ""}"/>`).join("")}${labels}
    </svg><div class="ccu-chart__tooltip" data-ccu-tooltip></div>`;

  const line = wrap.querySelector(".ccu-chart__line");
  if (line && typeof line.getTotalLength === "function") {
    const length = line.getTotalLength();
    line.style.strokeDasharray = length;
    line.style.strokeDashoffset = length;
    requestAnimationFrame(() => { line.style.transition = "stroke-dashoffset 1.2s ease"; line.style.strokeDashoffset = "0"; });
  }
  setupCcuTooltip(wrap, points, width, height);
}

function renderCcuStats(history) {
  const values = history.map((entry) => entry.players);
  const peak = document.querySelector('[data-ccu-stat="peak"]');
  const hours = document.querySelector('[data-ccu-stat="hours"]');
  if (peak) peak.textContent = formatNumber(Math.max(...values));
  if (hours) hours.textContent = String(history.length);
}

async function initHourlyHistory() {
  const wrap = document.querySelector("[data-ccu-graph]");
  try {
    const response = await fetch(historyUrl());
    if (!response.ok) throw new Error("History request failed");
    const data = await response.json();
    const history = (data.history || []).map(normalizeHistoryEntry).filter(Boolean);
    if (!wrap) return;
    if (!history.length) {
      wrap.innerHTML = '<div class="ccu-chart-empty">No hourly snapshots yet. The first point will be saved as soon as the history database is connected.</div>';
      return;
    }
    renderCcuStats(history);
    renderCcuChart(wrap, history);
  } catch (error) {
    if (wrap) wrap.innerHTML = '<div class="ccu-chart-empty">Hourly history is unavailable right now. Try refreshing in a moment.</div>';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const loaderStartedAt = Date.now();
  renderHeroMosaic();
  renderPageArtwork();
  setupMobileNav();
  setupScrollReveal();
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  await loadAndRender();
  initHourlyHistory();
  window.setTimeout(hidePageLoader, Math.max(0, 400 - (Date.now() - loaderStartedAt)));

  window.setInterval(() => {
    secondsUntilRefresh = Math.max(0, secondsUntilRefresh - 1);
    if (secondsUntilRefresh === 0) loadAndRender();
  }, 1000);
});
