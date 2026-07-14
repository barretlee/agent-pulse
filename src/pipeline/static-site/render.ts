import type { GithubData } from "./dto.js";
import type { Locale } from "./i18n.js";
import { t } from "./i18n.js";

export type PageKey =
  | "home"
  | "lines"
  | "timeline"
  | "signals"
  | "scout"
  | "actors"
  | "resources"
  | "product"
  | "changelog"
  | "sources"
  | "legal";

export interface PageChrome {
  title: string;
  description: string;
  route: string;
  depth: number;
  active: PageKey;
  body: string;
  siteUrl: string;
  github: GithubData;
  generatedAt: string;
  /** Locale for this page (defaults to zh-CN in pageLayout if omitted). */
  locale: Locale;
  bodyClass?: string;
  /** Override robots meta (defaults to "index, follow"). */
  robots?: string;
  /** Baidu site verification content (if set, adds baidu-site-verification meta). */
  baiduVerification?: string;
  /** Additional JSON-LD objects beyond the WebSite schema (e.g., Article for events). */
  jsonLd?: Record<string, unknown>[];
  ogType?: "website" | "article";
}

export function escapeHtml(value: unknown): string {
  return decodeEntities(String(value ?? ""))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function safeExternalLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const codePoint = character.codePointAt(0);
    return codePoint === undefined ? "" : `\\u${codePoint.toString(16).padStart(4, "0")}`;
  });
}

export function icon(name: string, label?: string): string {
  const aria = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  return `<svg class="icon" ${aria}><use href="__ASSET_PREFIX__assets/icons.svg#${escapeHtml(name)}"></use></svg>`;
}

export function formatDate(value: string, locale: Locale = "zh-CN"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("date.unknown", locale);
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function pageLayout(input: PageChrome): string {
  const locale = input.locale ?? ("zh-CN" as Locale);
  const prefix = input.depth === 0 ? "./" : "../".repeat(input.depth);
  const assetPrefix: string = (() => {
    if (locale === "zh-CN") return prefix;
    // en pages are one directory deeper (inside /en/), need one extra ../ for assets
    return input.depth === 0 ? "../" : "../".repeat(input.depth + 1);
  })();
  const route = input.route;
  const canonical = new URL(route.replace(/^\//, ""), ensureSlash(input.siteUrl)).toString();

  // ── Navigation ──────────────────────────────────────────────
  const navItems: Array<{ key: PageKey; label: string; route: string }> = [
    { key: "home", label: t("nav.home", locale), route: "" },
    { key: "lines", label: t("nav.lines", locale), route: "lines/" },
    { key: "timeline", label: t("nav.timeline", locale), route: "timeline/" },
    {
      key: "signals",
      label: locale === "en" ? "Source Updates" : "来源动态",
      route: "signals/",
    },
    { key: "scout", label: t("nav.scout", locale), route: "scout/" },
  ];
  const navHtml = navItems
    .map(
      ({ key, label, route: r }) =>
        `<a href="${prefix}${r}"${isActive(input.active, key) ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");

  const mobileNav: Array<{ key: PageKey; icon: string; label: string; route: string }> = [
    { key: "home", icon: "home", label: t("mobile.home", locale), route: "" },
    { key: "lines", icon: "route", label: t("mobile.lines", locale), route: "lines/" },
    { key: "timeline", icon: "clock", label: t("mobile.timeline", locale), route: "timeline/" },
    {
      key: "signals",
      icon: "menu",
      label: locale === "en" ? "Updates" : "动态",
      route: "signals/",
    },
    { key: "scout", icon: "sparkles", label: t("mobile.scout", locale), route: "scout/" },
  ];

  // ── Language switcher ───────────────────────────────────────
  const otherLocaleHref = (() => {
    if (route === "/404.html") return locale === "zh-CN" ? "./en/" : "../";
    if (locale === "zh-CN") {
      // zh-CN → go to /en/{route}
      const relPath = route === "/" ? "" : route.replace(/^\//, "");
      return `${prefix}en/${relPath}`;
    }
    // en → go to root-level {route without /en/}
    const cnRelPath = route.replace(/^\/en\//, "/").replace(/^\//, "");
    return `${"../".repeat(input.depth + 1)}${cnRelPath}`;
  })();

  // ── SEO / Meta ──────────────────────────────────────────────
  const robots = input.robots ?? "index, follow";
  const twitterCard = "summary";
  const repository = input.github.repositoryUrl.replace(/\/$/, "");
  const snapshotUrl = `${repository}/commits/main/`;

  // ── JSON-LD: page identity and site relationship ───────────
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": canonical,
    url: canonical,
    name: input.title,
    description: input.description,
    inLanguage: locale,
    dateModified: input.generatedAt,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${ensureSlash(input.siteUrl)}#website`,
      name: "Agent Pulse",
      url: ensureSlash(input.siteUrl),
    },
  };

  // ── Hreflang ────────────────────────────────────────────────
  const hreflangZhUrl = new URL(
    locale === "zh-CN"
      ? route.replace(/^\//, "")
      : route.replace(/^\/en\//, "/").replace(/^\//, ""),
    ensureSlash(input.siteUrl),
  ).toString();
  const hreflangEnUrl = new URL(
    locale === "en" ? route.replace(/^\//, "") : `en/${route.replace(/^\//, "")}`,
    ensureSlash(input.siteUrl),
  ).toString();

  return `<!doctype html>
<html lang="${locale === "en" ? "en" : "zh-CN"}" data-theme="paper">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(input.description)}">
  <meta name="theme-color" content="#eeece5">
  <meta name="robots" content="${escapeHtml(robots)}">
  <meta property="og:type" content="${input.ogType ?? "website"}">
  <meta property="og:site_name" content="Agent Pulse">
  <meta property="og:title" content="${escapeHtml(input.title)}">
  <meta property="og:description" content="${escapeHtml(input.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:locale" content="${locale === "en" ? "en_US" : "zh_CN"}">
  <meta name="twitter:card" content="${escapeHtml(twitterCard)}">
  <meta name="twitter:title" content="${escapeHtml(input.title)}">
  <meta name="twitter:description" content="${escapeHtml(input.description)}">
  ${input.baiduVerification ? `<meta name="baidu-site-verification" content="${escapeHtml(input.baiduVerification)}">` : ""}
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="alternate" hreflang="zh-CN" href="${escapeHtml(hreflangZhUrl)}">
  <link rel="alternate" hreflang="en" href="${escapeHtml(hreflangEnUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(hreflangZhUrl)}">
  <link rel="icon" href="${assetPrefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${assetPrefix}assets/app.css">
  <script type="module" src="${assetPrefix}assets/core.js"></script>
  <script type="application/ld+json">${serializeJsonLd(webPageJsonLd)}</script>
  ${(input.jsonLd ?? []).map((obj) => `<script type="application/ld+json">${serializeJsonLd(obj)}</script>`).join("\n  ")}
  <title>${escapeHtml(input.title)}</title>
</head>
<body class="${escapeHtml(input.bodyClass || "")}" data-page="${input.active}">
  <a class="skip-link" href="#main">${escapeHtml(t("ui.skipMain", locale))}</a>
  <header class="topbar">
    <a class="brand" href="${prefix}" aria-label="${escapeHtml(t("brand.aria", locale))}">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span><strong>AGENT PULSE</strong><small>${escapeHtml(t("brand.subtitle", locale))}</small></span>
    </a>
    <nav class="desktop-nav" aria-label="${escapeHtml(t("ui.desktopNav", locale))}">${navHtml}</nav>
    <div class="top-actions">
      <button class="icon-button" data-theme-toggle type="button" aria-label="${escapeHtml(t("ui.toggleTheme", locale))}">${icon("sun")}</button>
      ${githubStarButton(input.github, locale)}
    </div>
  </header>
  <main id="main">${input.body.replaceAll("__PREFIX__", prefix)}</main>
  ${eventDrawerShell(locale, assetPrefix, prefix)}
  <footer class="site-footer">
    <div class="shell footer-grid">
      <div class="footer-brand"><strong>AGENT PULSE</strong><p>${escapeHtml(t("footer.tagline", locale))}</p>${footerSubscriptions(input.github, locale)}${footerContacts(locale)}</div>
      <div class="footer-links">
        <nav aria-label="${locale === "en" ? "Explore" : "探索"}"><span>${locale === "en" ? "EXPLORE" : "探索"}</span><a href="${prefix}lines/">${escapeHtml(t("footer.lines", locale))}</a><a href="${prefix}industry-evolution/">${locale === "en" ? "Industry Evolution" : "行业演化"}</a><a href="${prefix}timeline/">${escapeHtml(t("footer.timeline", locale))}</a><a href="${prefix}signals/">${locale === "en" ? "Source updates" : "来源动态"}</a><a href="${prefix}scout/">${escapeHtml(t("footer.scout", locale))}</a><a href="${prefix}sources/">${escapeHtml(t("footer.sources", locale))}</a></nav>
        <nav aria-label="${locale === "en" ? "More" : "更多"}"><span>${locale === "en" ? "MORE" : "更多"}</span><a href="${prefix}actors/">${escapeHtml(t("tab.actors", locale))}</a><a href="${prefix}resources/">${escapeHtml(t("tab.resources", locale))}</a><a href="${prefix}legal/">${escapeHtml(t("footer.legal", locale))}</a><a href="${prefix}changelog/">${escapeHtml(t("footer.changelog", locale))}</a></nav>
      </div>
    </div>
    <div class="shell footer-meta">
      <p>${escapeHtml(t("footer.principles", locale))}<br><a class="footer-snapshot" href="${escapeHtml(snapshotUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("footer.snapshot", locale).replace("{date}", formatDate(input.generatedAt, locale)))}${icon("external-link")}</a></p>
      <div><a class="footer-lang" href="${escapeHtml(otherLocaleHref)}" aria-label="${escapeHtml(t("lang.label", locale))}">${t("brand.switchLang", locale)}</a><span>OPEN SOURCE · STATIC BY DEFAULT</span></div>
    </div>
  </footer>
  <nav class="mobile-nav" aria-label="${escapeHtml(t("ui.mobileNav", locale))}">
    ${mobileNav
      .map(
        ({ key, icon: iconName, label, route: r }) =>
          `<a href="${prefix}${r}"${isActive(input.active, key) ? ' aria-current="page"' : ""}>${icon(iconName)}<span>${label}</span></a>`,
      )
      .join("")}
  </nav>
  <button class="back-to-top" data-back-to-top type="button" aria-label="${locale === "en" ? "Back to top" : "回到顶部"}" aria-hidden="true" tabindex="-1">${icon("arrow-right")}</button>
</body>
</html>`
    .replaceAll("__ASSET_PREFIX__", assetPrefix)
    .replaceAll("__PREFIX__", prefix);
}

function footerSubscriptions(github: GithubData, locale: Locale): string {
  const repository = github.repositoryUrl.replace(/\/$/, "");
  const watchUrl = `${repository}/subscription`;
  const weeklyUrl = `${repository}/issues?q=is%3Aissue+label%3Aweekly-brief`;
  return `<nav class="footer-subscriptions" aria-label="${locale === "en" ? "Agent Pulse subscriptions" : "Agent Pulse 订阅入口"}"><a href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener noreferrer">${icon("github")} Watch</a><a href="${escapeHtml(weeklyUrl)}" target="_blank" rel="noopener noreferrer">${icon("route")} ${locale === "en" ? "Weekly brief" : "AI 周报"}</a></nav>`;
}

function footerContacts(locale: Locale): string {
  const contacts = [
    { name: "X", iconName: "x-social", href: "https://x.com/Barret_China" },
    { name: "Weibo", iconName: "weibo", href: "https://www.weibo.com/u/1812166904" },
    { name: "GitHub", iconName: "github", href: "https://github.com/barretlee" },
    { name: "Email", iconName: "mail", href: "mailto:barret.china@gmail.com" },
  ];
  return `<nav class="footer-contacts" aria-label="${escapeHtml(t("footer.contacts", locale))}"><span>${escapeHtml(t("footer.contacts", locale))}</span>${contacts
    .map(
      (contact) =>
        `<a href="${escapeHtml(contact.href)}"${contact.href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener noreferrer"'} aria-label="${escapeHtml(contact.name)}" data-label="${escapeHtml(contact.name)}">${icon(contact.iconName)}</a>`,
    )
    .join("")}</nav>`;
}

function eventDrawerShell(locale: Locale, assetPrefix: string, prefix: string): string {
  const label = locale === "en" ? "Event evidence drawer" : "事件证据抽屉";
  const kicker = locale === "en" ? "EVENT BRIEF" : "事件判断";
  const close = locale === "en" ? "Close event drawer" : "关闭事件抽屉";
  return `<aside class="timeline-preview event-drawer" id="event-drawer" role="dialog" aria-modal="true" aria-hidden="true" aria-label="${escapeHtml(label)}" data-event-drawer data-timeline-src="${escapeHtml(`${assetPrefix}data/timeline.json`)}" data-event-base="${escapeHtml(`${prefix}events/`)}" inert><header class="drawer-header"><span>${escapeHtml(kicker)}</span><button class="preview-close" type="button" data-event-drawer-close aria-label="${escapeHtml(close)}">${icon("x")}</button></header><div class="event-drawer-content" data-event-drawer-content></div></aside><div class="preview-backdrop" data-event-drawer-backdrop hidden></div>`;
}

function githubStarButton(github: GithubData, locale: Locale): string {
  const count = github.stars === null ? "—" : new Intl.NumberFormat("en-US").format(github.stars);
  const label =
    locale === "en"
      ? `Star Agent Pulse on GitHub, ${github.stars ?? "count unavailable"} stars`
      : `在 GitHub 为 Agent Pulse 点赞，当前 ${github.stars ?? "未知"} 个 Star`;
  return `<a class="github-star-button" data-github-star-button href="${escapeHtml(github.repositoryUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}"><span class="github-star-action">${icon("github")}<span>Star</span></span><strong class="github-star-count" data-github-star-count>${escapeHtml(count)}</strong></a>`;
}

function ensureSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isActive(active: PageKey, key: PageKey): boolean {
  if (active === key) return true;
  if (key === "scout" && ["actors", "resources", "product"].includes(active)) return true;
  return key === "changelog" && ["sources", "legal"].includes(active);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (entity, decimal: string) => decodeCodePoint(entity, Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (entity, hexadecimal: string) =>
      decodeCodePoint(entity, Number.parseInt(hexadecimal, 16)),
    )
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function decodeCodePoint(entity: string, codePoint: number): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) return entity;
  return String.fromCodePoint(codePoint);
}
