const themes = ["paper", "midnight", "signal"];
const savedTheme = localStorage.getItem("agent-pulse-theme");
if (themes.includes(savedTheme)) document.documentElement.dataset.theme = savedTheme;

document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "paper";
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  document.documentElement.dataset.theme = next;
  localStorage.setItem("agent-pulse-theme", next);
});

setupEventDrawer();
const timeline = document.querySelector("[data-timeline]");
if (timeline) setupTimeline(timeline);
setupCardFilters();
setupSourceFilters();

function setupTimeline(root) {
  const cards = [...root.querySelectorAll("[data-event]")];
  const search = root.querySelector("[data-timeline-search]");
  const count = root.querySelector("[data-result-count]");
  let activeTrack = new URLSearchParams(location.search).get("track") || "all";

  const apply = () => {
    const query = String(search?.value || "")
      .trim()
      .toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const trackMatch =
        activeTrack === "all" ||
        (activeTrack === "official" && card.dataset.primary === "true") ||
        (activeTrack === "research" && card.dataset.research === "true") ||
        String(card.dataset.tracks || "")
          .split(" ")
          .includes(activeTrack);
      const queryMatch = !query || String(card.dataset.search || "").includes(query);
      card.hidden = !(trackMatch && queryMatch);
      if (!card.hidden) visible += 1;
    });
    root.querySelectorAll("[data-research-group]").forEach((group) => {
      const hasVisibleCards = [...group.querySelectorAll("[data-event]")].some(
        (card) => !card.hidden,
      );
      group.hidden = !hasVisibleCards;
      if (hasVisibleCards && (activeTrack === "research" || query)) group.open = true;
    });
    root.querySelectorAll(".timeline-month").forEach((month) => {
      month.hidden = ![...month.querySelectorAll("[data-event]")].some((card) => !card.hidden);
    });
    root.querySelectorAll(".timeline-year").forEach((year) => {
      year.hidden = ![...year.querySelectorAll(".timeline-month")].some((month) => !month.hidden);
    });
    if (count) {
      count.textContent =
        document.documentElement.lang === "en" ? `${visible} events` : `${visible} 个事件`;
    }
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
  apply();
}

function setupEventDrawer() {
  const drawer = document.querySelector("[data-event-drawer]");
  const content = drawer?.querySelector("[data-event-drawer-content]");
  const backdrop = document.querySelector("[data-event-drawer-backdrop]");
  const closeButton = drawer?.querySelector("[data-event-drawer-close]");
  if (!drawer || !content) return;

  const isEnglish = document.documentElement.lang === "en";
  const labels = isEnglish
    ? {
        loading: "Loading event evidence…",
        failed: "Event evidence could not be loaded.",
        retry: "Retry",
        missing: "This event is not available in the current public snapshot.",
        fact: "What happened",
        evidence: "pieces of evidence",
        sources: "independent sources",
        story: "How the event developed",
        context: "Background and change",
        technical: "Technical or product shift",
        why: "Industry impact",
        business: "Decision implications",
        next: "What to watch next",
        full: "Open full event",
        source: "Source evidence",
        confidence: "Evidence confidence",
        origin: "First report",
        official: "Official update",
        discussion: "External discussion",
        response: "Industry response",
      }
    : {
        loading: "正在加载事件证据…",
        failed: "事件证据加载失败。",
        retry: "重新加载",
        missing: "当前公开快照中没有找到这个事件。",
        fact: "发生了什么",
        evidence: "条证据",
        sources: "个独立来源",
        story: "事情如何发展",
        context: "背景与变化",
        technical: "技术或产品变化",
        why: "行业影响",
        business: "决策含义",
        next: "接下来观察",
        full: "打开完整事件",
        source: "原始证据",
        confidence: "证据置信度",
        origin: "首次出现",
        official: "官方更新",
        discussion: "外部讨论",
        response: "行业反馈",
      };
  let eventsPromise;
  let lastTrigger;
  let activeSlug = "";

  const loadEvents = () => {
    if (eventsPromise) return eventsPromise;
    eventsPromise = fetch(drawer.dataset.timelineSrc, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`Timeline request failed: ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!Array.isArray(payload.events)) throw new Error("Timeline payload has no events");
        return new Map(payload.events.map((event) => [event.slug, event]));
      })
      .catch((error) => {
        eventsPromise = undefined;
        throw error;
      });
    return eventsPromise;
  };

  const setOpen = (open) => {
    drawer.classList.toggle("open", open);
    drawer.toggleAttribute("inert", !open);
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("drawer-open", open);
    if (backdrop) backdrop.hidden = !open;
  };

  const updateUrl = (slug) => {
    const params = new URLSearchParams(location.search);
    slug ? params.set("event", slug) : params.delete("event");
    history.replaceState(
      null,
      "",
      `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`,
    );
  };

  const showState = (message, retry) => {
    content.replaceChildren();
    const state = createNode("div", "drawer-state");
    state.append(createNode("span", "drawer-spinner", ""), createNode("p", "", message));
    if (retry) {
      const button = createNode("button", "button quiet", labels.retry);
      button.type = "button";
      button.addEventListener("click", retry);
      state.append(button);
    }
    content.append(state);
  };

  const openEvent = async (slug, trigger, shouldUpdateUrl = true) => {
    if (!slug) return;
    activeSlug = slug;
    if (trigger) lastTrigger = trigger;
    document.querySelectorAll("[data-event]").forEach((card) => {
      card.classList.toggle("active", card.dataset.event === slug);
    });
    setOpen(true);
    if (shouldUpdateUrl) updateUrl(slug);
    showState(labels.loading);
    closeButton?.focus();
    try {
      const events = await loadEvents();
      if (activeSlug !== slug) return;
      const event = events.get(slug);
      if (!event) {
        showState(labels.missing);
        return;
      }
      renderDrawerEvent(content, event, labels, drawer.dataset.eventBase || "events/");
    } catch {
      if (activeSlug !== slug) return;
      showState(labels.failed, () => openEvent(slug, lastTrigger, false));
    }
  };

  const close = (shouldUpdateUrl = true, restoreFocus = true) => {
    activeSlug = "";
    setOpen(false);
    if (shouldUpdateUrl) updateUrl("");
    if (restoreFocus && lastTrigger instanceof HTMLElement) lastTrigger.focus();
  };

  document.addEventListener("click", (event) => {
    if (
      !(event instanceof MouseEvent) ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const trigger =
      event.target instanceof Element
        ? event.target.closest("[data-event-link], [data-event]")
        : null;
    if (!trigger || drawer.contains(trigger)) return;
    const slug = trigger.dataset.eventLink || trigger.dataset.event;
    if (!slug) return;
    event.preventDefault();
    openEvent(slug, trigger);
  });
  closeButton?.addEventListener("click", () => close());
  backdrop?.addEventListener("click", () => close());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("open")) close();
  });
  addEventListener("popstate", () => {
    const slug = new URLSearchParams(location.search).get("event");
    if (slug) openEvent(slug, undefined, false);
    else close(false, false);
  });

  const initialEvent = new URLSearchParams(location.search).get("event");
  if (initialEvent) openEvent(initialEvent, undefined, false);
}

function renderDrawerEvent(root, event, labels, eventBase) {
  root.replaceChildren();
  const article = createNode("article", "event-drawer-article");
  article.append(
    createNode(
      "span",
      "section-kicker",
      `${event.category || "event"} · ${formatDrawerDate(latestEventDate(event))}`,
    ),
    createNode("h2", "", event.title),
  );

  const fact = createNode("section", "preview-fact");
  fact.append(createNode("span", "", labels.fact), createNode("p", "", event.factSummary));
  article.append(fact);

  const evidence = Array.isArray(event.evidence) ? event.evidence : [];
  const sourceCount = new Set(evidence.map((item) => item.source)).size;
  const evidenceLine = createNode("div", "evidence-line");
  evidenceLine.append(
    createNode("span", "evidence-badge", drawerEvidenceLabel(evidence)),
    createNode(
      "span",
      "",
      `${evidence.length} ${labels.evidence} · ${sourceCount} ${labels.sources}`,
    ),
  );
  article.append(evidenceLine);

  const story = createNode("section", "drawer-story");
  story.append(createNode("h3", "", labels.story), buildDrawerJourney(evidence, labels));
  article.append(story);

  const insights = createNode("div", "drawer-insight-grid");
  insights.append(
    drawerInsight(labels.context, event.summary, "analysis"),
    drawerInsight(labels.technical, event.technicalInsight, "analysis"),
    drawerInsight(labels.why, event.industryInsight, "impact"),
    drawerInsight(labels.business, event.businessValue, "impact"),
    drawerInsight(
      labels.confidence,
      `${Number.isFinite(event.confidenceScore) ? event.confidenceScore : "—"}/100 · ${drawerEvidenceLabel(evidence)}`,
      "assessment",
    ),
    drawerInsight(labels.next, event.futureOutlook, "forecast"),
  );
  article.append(insights);

  if (evidence.length) {
    const sources = createNode("section", "drawer-evidence-list");
    sources.append(createNode("h3", "", labels.source));
    evidence.forEach((item) => {
      const url = safeHttpUrl(item.url);
      if (!url) return;
      const link = createNode("a", "");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(
        createNode("strong", "", item.title),
        createNode("span", "", `${item.source} · ${formatDrawerDate(item.publishedAt)}`),
      );
      sources.append(link);
    });
    article.append(sources);
  }

  const actions = createNode("div", "preview-actions");
  const full = createNode("a", "button primary", labels.full);
  full.href = `${eventBase}${encodeURIComponent(event.slug)}/`;
  actions.append(full);
  const sourceUrl = safeHttpUrl(evidence[0]?.url);
  if (sourceUrl) {
    const source = createNode("a", "button quiet", labels.source);
    source.href = sourceUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    actions.append(source);
  }
  article.append(actions);
  root.append(article);
}

function buildDrawerJourney(evidence, labels) {
  const journey = createNode("ol", "event-journey compact");
  const ordered = [...evidence].sort(
    (left, right) => Date.parse(left.publishedAt) - Date.parse(right.publishedAt),
  );
  ordered.forEach((item, originalIndex) => {
    const kind =
      originalIndex === 0
        ? "origin"
        : item.role === "primary"
          ? "official"
          : item.role === "amplification"
            ? "discussion"
            : "response";
    const row = createNode("li", `event-step ${kind}`);
    const url = safeHttpUrl(item.url);
    const body = url ? createNode("a", "") : createNode("div", "");
    if (url && body instanceof HTMLAnchorElement) {
      body.href = url;
      body.target = "_blank";
      body.rel = "noopener noreferrer";
    }
    body.append(
      createNode("span", "", labels[kind]),
      createNode("time", "", formatDrawerDate(item.publishedAt)),
      createNode("strong", "", item.title),
      createNode("small", "", item.source),
    );
    row.append(body);
    journey.append(row);
  });
  return journey;
}

function drawerInsight(label, value, kind) {
  const section = createNode("section", `insight ${kind}`);
  section.append(createNode("span", "", label), createNode("p", "", value || "—"));
  return section;
}

function createNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text ?? "");
  return node;
}

function safeHttpUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function latestEventDate(event) {
  const dates = [event.happenedAt, ...(event.evidence || []).map((item) => item.publishedAt)]
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  return dates.length ? new Date(Math.max(...dates)).toISOString() : event.happenedAt;
}

function formatDrawerDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function drawerEvidenceLabel(evidence) {
  const sources = new Set(evidence.map((item) => item.source)).size;
  const primary = evidence.some((item) => item.role === "primary");
  const en = document.documentElement.lang === "en";
  if (primary && sources >= 2) return en ? "Official + corroborated" : "官方资料 + 多源佐证";
  if (primary) return en ? "Single official source" : "单一官方资料";
  if (sources >= 2) return en ? "Multi-source reports" : "多源报道";
  return en ? "Secondary report" : "二手报道";
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
