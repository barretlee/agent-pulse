const themes = ["midnight", "paper", "signal"];
const savedTheme = localStorage.getItem("agent-pulse-theme");
if (themes.includes(savedTheme)) document.documentElement.dataset.theme = savedTheme;

document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "midnight";
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  document.documentElement.dataset.theme = next;
  localStorage.setItem("agent-pulse-theme", next);
});

const timeline = document.querySelector("[data-timeline]");
if (timeline) setupTimeline(timeline);
setupCardFilters();
setupSourceFilters();

function setupTimeline(root) {
  const cards = [...root.querySelectorAll("[data-event]")];
  const panels = [...root.querySelectorAll("[data-event-panel]")];
  const preview = root.querySelector(".timeline-preview");
  const backdrop = document.querySelector("[data-preview-backdrop]");
  const search = root.querySelector("[data-timeline-search]");
  const count = root.querySelector("[data-result-count]");
  let activeTrack = new URLSearchParams(location.search).get("track") || "all";

  const selectEvent = (slug, updateUrl = true) => {
    const card = cards.find((item) => item.dataset.event === slug) || cards[0];
    if (!card) return;
    cards.forEach((item) => {
      item.classList.toggle("active", item === card);
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.eventPanel !== card.dataset.event;
    });
    if (updateUrl) {
      const params = new URLSearchParams(location.search);
      params.set("event", card.dataset.event);
      history.replaceState(null, "", `${location.pathname}?${params}`);
    }
    if (matchMedia("(max-width: 820px)").matches) {
      preview?.classList.add("open");
      if (backdrop) backdrop.hidden = false;
    }
  };

  const apply = () => {
    const query = String(search?.value || "")
      .trim()
      .toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const trackMatch =
        activeTrack === "all" ||
        (activeTrack === "primary" && card.dataset.primary === "true") ||
        String(card.dataset.tracks || "")
          .split(" ")
          .includes(activeTrack);
      const queryMatch = !query || String(card.dataset.search || "").includes(query);
      card.hidden = !(trackMatch && queryMatch);
      if (!card.hidden) visible += 1;
    });
    if (count) count.textContent = `${visible} 个节点`;
  };

  root.querySelectorAll("[data-filter-track]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filterTrack === activeTrack);
    button.addEventListener("click", () => {
      activeTrack = button.dataset.filterTrack || "all";
      root.querySelectorAll("[data-filter-track]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      const params = new URLSearchParams(location.search);
      activeTrack === "all" ? params.delete("track") : params.set("track", activeTrack);
      history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
      apply();
    });
  });
  search?.addEventListener("input", apply);
  cards.forEach((card) => {
    card.addEventListener("click", () => selectEvent(card.dataset.event));
  });
  const close = () => {
    preview?.classList.remove("open");
    if (backdrop) backdrop.hidden = true;
  };
  root.querySelector("[data-preview-close]")?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  apply();
  selectEvent(new URLSearchParams(location.search).get("event"), false);
}

function setupCardFilters() {
  document.querySelectorAll("[data-card-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.cardFilter;
      const toolbar = button.parentElement;
      const grid = toolbar?.nextElementSibling;
      toolbar?.querySelectorAll("[data-card-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      grid?.querySelectorAll("[data-filter-value]").forEach((card) => {
        card.hidden = value !== "all" && card.dataset.filterValue !== value;
      });
    });
  });
}

function setupSourceFilters() {
  const grid = document.querySelector("[data-source-grid]");
  if (!grid) return;
  const search = document.querySelector("[data-source-search]");
  let filter = "all";
  const apply = () => {
    const query = String(search?.value || "")
      .trim()
      .toLowerCase();
    grid.querySelectorAll("[data-source-value]").forEach((row) => {
      const filterMatch =
        filter === "all" || String(row.dataset.sourceValue || "").includes(filter);
      const queryMatch = !query || String(row.dataset.sourceSearchValue || "").includes(query);
      row.hidden = !(filterMatch && queryMatch);
    });
  };
  document.querySelectorAll("[data-source-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.sourceFilter || "all";
      document.querySelectorAll("[data-source-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      apply();
    });
  });
  search?.addEventListener("input", apply);
}
