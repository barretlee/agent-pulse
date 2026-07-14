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
setupHomeDynamics();
setupScrollReveals();
setupSignalBrowser();
setupTrendModules();
setupGithubStarCount();
setupBackToTop();
const timeline = document.querySelector("[data-timeline]");
if (timeline) import("./timeline.js").then(({ setupTimeline }) => setupTimeline(timeline));
setupCardFilters();
setupSourceFilters();
setupMobileListPagination();
setupStockWidgets();

function runWhenIdle(callback, timeout = 2400) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout });
    return;
  }
  setTimeout(callback, Math.min(timeout, 800));
}

function setupBackToTop() {
  const button = document.querySelector("[data-back-to-top]");
  if (!button) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frame = 0;
  const update = () => {
    const pageIsLong = document.documentElement.scrollHeight - innerHeight > innerHeight * 0.75;
    const visible = pageIsLong && scrollY > Math.max(480, innerHeight * 0.65);
    button.classList.toggle("is-visible", visible);
    button.setAttribute("aria-hidden", String(!visible));
    button.tabIndex = visible ? 0 : -1;
    frame = 0;
  };
  const queueUpdate = () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    button.blur();
  });
  addEventListener("scroll", queueUpdate, { passive: true });
  addEventListener("resize", queueUpdate);
  update();
}

function setupHomeDynamics() {
  const trendItems = [...document.querySelectorAll("[data-random-trend]")];
  if (trendItems.length) {
    let selectedIndex = -1;
    const showRandomTrend = () => {
      if (trendItems.length === 1) selectedIndex = 0;
      else {
        const offset = 1 + Math.floor(Math.random() * (trendItems.length - 1));
        selectedIndex = (Math.max(0, selectedIndex) + offset) % trendItems.length;
      }
      trendItems.forEach((item, index) => {
        item.hidden = index !== selectedIndex;
      });
      const selected = trendItems[selectedIndex];
      selected?.classList.remove("trend-refresh-in");
      if (selected) void selected.offsetWidth;
      selected?.classList.add("trend-refresh-in");
    };
    trendItems.forEach((item) => {
      item.querySelector("[data-random-trend-next]")?.addEventListener("click", showRandomTrend);
    });
    selectedIndex = Math.floor(Math.random() * trendItems.length);
    trendItems.forEach((item, index) => {
      item.hidden = index !== selectedIndex;
    });
  }

  revealRandomItems("[data-random-recent-list]", "[data-random-recent]");

  document.querySelectorAll("[data-industry-carousel]").forEach(setupIndustryCarousel);
}

function revealRandomItems(rootSelector, itemSelector) {
  document.querySelectorAll(rootSelector).forEach((root) => {
    const visible = Math.max(1, Number(root.dataset.randomVisible || 1));
    const items = [...root.querySelectorAll(itemSelector)];
    const current = new Set(items.filter((item) => !item.hidden));
    let shuffled = shuffle([...items]);
    if (items.length > visible && shuffled.slice(0, visible).every((item) => current.has(item))) {
      shuffled = [...shuffled.slice(visible), ...shuffled.slice(0, visible)];
    }
    const selectedItems = shuffled.slice(0, visible);
    const selected = new Set(selectedItems);
    items.forEach((item) => {
      item.hidden = !selected.has(item);
    });
  });
}

function setupScrollReveals() {
  if (!("IntersectionObserver" in window)) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;
  const modules = [
    ...document.querySelectorAll(
      "main > section:not([data-no-scroll-reveal]), main > .trend-detail > section:not([data-no-scroll-reveal])",
    ),
  ];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10%", threshold: 0.08 },
  );
  modules.forEach((module) => {
    const rect = module.getBoundingClientRect();
    module.classList.add("scroll-reveal");
    if (rect.top < innerHeight * 0.92) module.classList.add("is-visible");
    else observer.observe(module);
  });
}

function setupIndustryCarousel(root) {
  const track = root.querySelector("[data-carousel-track]");
  const slides = [...root.querySelectorAll("[data-carousel-slide]")];
  const previous = root.querySelector("[data-carousel-prev]");
  const next = root.querySelector("[data-carousel-next]");
  const dots = root.querySelector("[data-carousel-dots]");
  const status = root.querySelector("[data-carousel-status]");
  if (!track || slides.length < 2) return;

  let index = 0;
  let timer;
  let touchStart = 0;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dotButtons = slides.map((_, dotIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${dotIndex + 1} / ${slides.length}`);
    button.addEventListener("click", () => goTo(dotIndex, true));
    dots?.append(button);
    return button;
  });

  const render = () => {
    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    slides.forEach((slide, slideIndex) => {
      slide.setAttribute("aria-hidden", String(slideIndex !== index));
    });
    dotButtons.forEach((button, dotIndex) => {
      button.setAttribute("aria-current", String(dotIndex === index));
    });
    if (status) status.textContent = `${index + 1} / ${slides.length}`;
  };
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const start = () => {
    stop();
    if (reducedMotion) return;
    timer = setInterval(() => goTo(index + 1, false), 6_500);
  };
  const goTo = (nextIndex, manual) => {
    index = (nextIndex + slides.length) % slides.length;
    render();
    if (manual) start();
  };

  previous?.addEventListener("click", () => goTo(index - 1, true));
  next?.addEventListener("click", () => goTo(index + 1, true));
  root.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    goTo(index + (event.key === "ArrowRight" ? 1 : -1), true);
  });
  root.addEventListener("pointerenter", stop);
  root.addEventListener("pointerleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", start);
  root.addEventListener("touchstart", (event) => {
    touchStart = event.changedTouches[0]?.clientX || 0;
    stop();
  });
  root.addEventListener("touchend", (event) => {
    const delta = (event.changedTouches[0]?.clientX || 0) - touchStart;
    if (Math.abs(delta) > 42) goTo(index + (delta < 0 ? 1 : -1), true);
    else start();
  });
  render();
  start();
}

function setupSignalBrowser() {
  const root = document.querySelector("[data-signal-browser]");
  const list = root?.querySelector("[data-signal-list]");
  const search = root?.querySelector("[data-signal-search]");
  const region = root?.querySelector("[data-signal-region]");
  const more = root?.querySelector("[data-signal-more]");
  const count = root?.querySelector("[data-signal-count]");
  if (!root || !list) return;

  const mobileQuery = matchMedia("(max-width: 820px)");
  const desktopPageSize = Math.max(12, Number(root.dataset.pageSize || 48));
  const mobilePageSize = Math.max(6, Number(root.dataset.mobilePageSize || 12));
  const pageSize = () => (mobileQuery.matches ? mobilePageSize : desktopPageSize);
  let visible = pageSize();
  let signals = null;
  let signalsPromise;

  const limitInitialCards = () => {
    if (signals) {
      visible = pageSize();
      render();
      return;
    }
    const cards = [...list.children];
    visible = pageSize();
    cards.forEach((card, index) => {
      card.hidden = index >= visible;
    });
    const shown = Math.min(visible, cards.length);
    const total =
      Number(
        String(count?.textContent || "")
          .split("/")
          .pop()
          ?.trim(),
      ) || cards.length;
    if (count) count.textContent = `${shown} / ${total}`;
  };

  const loadSignals = () => {
    if (signals) return Promise.resolve(signals);
    if (signalsPromise) return signalsPromise;
    signalsPromise = fetch(root.dataset.signalsSrc, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`Signal feed request failed: ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!Array.isArray(payload.signals)) throw new Error("Signal feed has no signals");
        signals = payload.signals;
        return signals;
      })
      .catch((error) => {
        signalsPromise = undefined;
        throw error;
      });
    return signalsPromise;
  };

  const render = () => {
    const query = String(search?.value || "")
      .trim()
      .toLowerCase();
    const selectedRegion = String(region?.value || "all");
    const filtered = (signals || []).filter((signal) => {
      const haystack = [
        signal.title,
        signal.description,
        signal.sourceName,
        signal.sourceSlug,
        signal.category,
        signal.sourceRegion,
        ...(Array.isArray(signal.tags) ? signal.tags : []),
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (selectedRegion === "all" || signal.sourceRegion === selectedRegion)
      );
    });
    const page = filtered.slice(0, visible);
    list.replaceChildren(...page.map(signalObservationNode));
    if (count) count.textContent = `${page.length} / ${filtered.length}`;
    if (more) more.hidden = page.length >= filtered.length;
  };

  const applyFilter = () => {
    visible = pageSize();
    loadSignals()
      .then(render)
      .catch(() => {});
  };
  search?.addEventListener("input", applyFilter);
  region?.addEventListener("change", applyFilter);
  more?.addEventListener("click", () => {
    loadSignals()
      .then(() => {
        visible += pageSize();
        render();
      })
      .catch(() => {});
  });
  mobileQuery.addEventListener("change", limitInitialCards);
  limitInitialCards();
}

function signalObservationNode(signal) {
  const url = safeHttpUrl(signal.url);
  const tone = signalObservationTone(signal);
  const article = createNode(
    url ? "a" : "article",
    `signal-observation-card${tone ? ` ${tone}` : ""}`,
  );
  if (url && article instanceof HTMLAnchorElement) {
    article.href = url;
    article.target = "_blank";
    article.rel = "noopener noreferrer";
  }
  const meta = createNode("div", "signal-observation-meta");
  const tags = createNode("span", "signal-observation-tags");
  tags.append(
    createNode("span", "signal-tag category", signal.category || "update"),
    createNode("span", "signal-tag region", signal.sourceRegion || "GLOBAL"),
  );
  meta.append(tags, createNode("time", "", formatDrawerDate(signal.publishedAt)));
  article.append(meta, createNode("h2", "", signal.title || "Untitled source update"));
  if (signal.description) article.append(createNode("p", "", signal.description));
  const footer = createNode("footer", "");
  footer.append(
    createNode(
      "span",
      "signal-source-name",
      `${signal.sourceName || signal.sourceSlug || "Source"} · Tier ${signal.sourceTier || "—"}`,
    ),
  );
  if (url) {
    const action = createNode(
      "span",
      "signal-source-action",
      document.documentElement.lang === "en" ? "Open source" : "查看原文",
    );
    action.append(createIconNode("external-link"));
    footer.append(action);
  }
  article.append(footer);
  return article;
}

function signalObservationTone(signal) {
  const category = String(signal.category || "").toLowerCase();
  const source = `${signal.sourceSlug || ""} ${signal.sourceName || ""}`.toLowerCase();
  const tags = Array.isArray(signal.tags)
    ? signal.tags.map((tag) => String(tag).toLowerCase())
    : [];
  if (
    category.includes("research") ||
    category.includes("paper") ||
    source.includes("arxiv") ||
    tags.some((tag) => tag === "paper" || tag === "arxiv")
  )
    return "research";
  return Number(signal.sourceTier) === 1 ? "high-confidence" : "";
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

function setupGithubStarCount() {
  const button = document.querySelector("[data-github-star-button]");
  const count = button?.querySelector("[data-github-star-count]");
  if (!button || !count) return;

  let repository;
  try {
    const url = new URL(button.href);
    const [owner, name] = url.pathname
      .replace(/^\//, "")
      .replace(/\.git$/, "")
      .split("/");
    if (url.hostname !== "github.com" || !owner || !name) return;
    repository = `${owner}/${name}`;
  } catch {
    return;
  }

  const apply = (stars, source) => {
    if (!Number.isInteger(stars) || stars < 0) return;
    count.textContent = new Intl.NumberFormat("en-US").format(stars);
    button.dataset.githubStarsSource = source;
    button.setAttribute(
      "aria-label",
      document.documentElement.lang === "en"
        ? `Star Agent Pulse on GitHub, ${stars} stars`
        : `在 GitHub 为 Agent Pulse 点赞，当前 ${stars} 个 Star`,
    );
  };

  const cacheKey = `agent-pulse-github-stars:${repository}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (
      Number.isInteger(cached?.stars) &&
      Date.now() - Number(cached?.fetchedAt) < 6 * 60 * 60 * 1000
    ) {
      if (count.textContent?.trim() === "—") apply(cached.stars, "cache");
    }
  } catch {
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      // Ignore blocked storage and continue with a live request.
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  fetch(`https://api.github.com/repos/${repository}`, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: controller.signal,
  })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error("GitHub API"))))
    .then((metadata) => {
      const stars = metadata?.stargazers_count;
      if (!Number.isInteger(stars) || stars < 0) return;
      apply(stars, "live");
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ stars, fetchedAt: Date.now() }));
      } catch {
        // A blocked cache must not prevent the public counter from updating.
      }
    })
    .catch(() => {})
    .finally(() => clearTimeout(timeout));
}

function setupTrendModules() {
  const root = document.querySelector("[data-trend-detail]");
  if (!root) return;
  const centerTrendTab = (tab) => {
    const nav = tab?.closest(".trend-switcher");
    if (!nav || !tab) return;
    const left = tab.offsetLeft - (nav.clientWidth - tab.clientWidth) / 2;
    nav.scrollTo({
      left: Math.max(0, left),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };
  root.querySelectorAll("[data-module-expand]").forEach((button) => {
    button.addEventListener("click", () => {
      const module = button.closest("[data-module-expand-root]");
      const expanded = !module?.classList.contains("is-expanded");
      module?.classList.toggle("is-expanded", expanded);
      button.setAttribute("aria-expanded", String(expanded));
      const label = button.querySelector("span");
      if (label) {
        label.textContent = expanded
          ? button.dataset.expandedLabel || "Show less"
          : button.dataset.collapsedLabel || "View all";
      }
    });
  });
  root.querySelectorAll(".phase-rail").forEach((rail) => {
    rail.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      rail.scrollBy({ left: event.key === "ArrowRight" ? 320 : -320, behavior: "smooth" });
    });
  });
  requestAnimationFrame(() => {
    centerTrendTab(root.querySelector('.trend-switcher [aria-current="page"]'));
  });
  root.querySelector(".trend-switcher")?.addEventListener("click", (event) => {
    if (event.target?.closest(".trend-tab")) navigator.vibrate?.(30);
  });
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
    content.scrollTop = 0;
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
      content.scrollTop = 0;
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

  if (evidence.length > 1) {
    const story = createNode("section", "drawer-story");
    story.append(createNode("h3", "", labels.story), buildDrawerJourney(evidence, labels));
    article.append(story);
  }

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

function createIconNode(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  use.setAttribute("href", new URL(`icons.svg#${name}`, import.meta.url).href);
  svg.append(use);
  return svg;
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
  if (primary) return en ? "Official source" : "官方资料";
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
      grid?.dispatchEvent(new Event("mobile-list:refresh"));
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
    grid.dispatchEvent(new Event("mobile-list:refresh"));
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

function setupMobileListPagination() {
  const en = document.documentElement.lang === "en";
  document.querySelectorAll("[data-mobile-list]").forEach((list) => {
    const limit = Math.max(1, Number(list.dataset.mobileLimit || 6));
    const step = Math.max(1, Number(list.dataset.mobileStep || limit));
    let visible = limit;
    const button = createNode("button", "mobile-list-more button quiet");
    const label = createNode("span", "");
    button.type = "button";
    button.append(label, createIconNode("chevron-down"));
    list.after(button);

    const refresh = (reset = false) => {
      if (reset) visible = limit;
      const items = [...list.children];
      items.forEach((item) => {
        item.removeAttribute("data-mobile-list-extra");
      });
      const eligible = items.filter((item) => !item.hidden);
      eligible.forEach((item, index) => {
        item.toggleAttribute("data-mobile-list-extra", index >= visible);
      });
      const remaining = Math.max(0, eligible.length - visible);
      const next = Math.min(step, remaining);
      button.hidden = remaining === 0;
      label.textContent = en
        ? `Show ${next} more · ${remaining} remaining`
        : `再看 ${next} 条 · 还剩 ${remaining} 条`;
    };

    button.addEventListener("click", () => {
      visible += step;
      refresh();
    });
    list.addEventListener("mobile-list:refresh", () => refresh(true));
    refresh();
  });
}

function setupStockWidgets() {
  const containers = [...document.querySelectorAll(".actor-stock-chart[data-stock-ticker]")];
  if (!containers.length) return;

  const loadWidget = (container) => {
    if (container.dataset.stockLoaded === "true") return;
    const ticker = container.dataset.stockTicker;
    if (!ticker) return;
    container.dataset.stockLoaded = "true";
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    const widgetEl = document.createElement("div");
    widgetEl.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    const config = JSON.stringify({
      symbol: ticker,
      width: "100%",
      height: 130,
      locale: document.documentElement.lang === "zh-CN" ? "zh_CN" : "en",
      dateRange: "6M",
      colorTheme: document.documentElement.dataset.theme === "midnight" ? "dark" : "light",
      isTransparent: true,
      autosize: false,
      noTimeScale: false,
    });
    script.text = config;
    // TradingView's mini-symbol-overview script reads its own text content for config.
    // SRI is not applicable here because TradingView serves this as a dynamic endpoint.
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    widgetContainer.append(widgetEl, script);
    container.append(widgetContainer);
  };

  if (!("IntersectionObserver" in window)) {
    runWhenIdle(() => containers.forEach(loadWidget));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadWidget(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "360px 0px" },
  );
  containers.forEach((container) => {
    observer.observe(container);
  });
}
