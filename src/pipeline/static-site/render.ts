import type { GithubData } from "./dto.js";

export type PageKey =
  | "home"
  | "lines"
  | "timeline"
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
  bodyClass?: string;
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

export function icon(name: string, label?: string): string {
  const aria = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  return `<svg class="icon" ${aria}><use href="__PREFIX__assets/icons.svg#${escapeHtml(name)}"></use></svg>`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日期未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function pageLayout(input: PageChrome): string {
  const prefix = input.depth === 0 ? "./" : "../".repeat(input.depth);
  const canonical = new URL(input.route.replace(/^\//, ""), ensureSlash(input.siteUrl)).toString();
  const stars = input.github.stars === null ? "Star on GitHub" : `★ ${input.github.stars}`;
  const nav = [
    ["home", "今日", ""],
    ["lines", "六条主线", "lines/"],
    ["timeline", "证据时间轴", "timeline/"],
    ["scout", "决策工具", "scout/"],
    ["changelog", "Changelog", "changelog/"],
  ] as const;
  const navHtml = nav
    .map(
      ([key, label, route]) =>
        `<a href="${prefix}${route}"${isActive(input.active, key) ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
  const mobileNav = [
    ["home", "home", "今日", ""],
    ["lines", "route", "主线", "lines/"],
    ["timeline", "clock", "时间轴", "timeline/"],
    ["scout", "sparkles", "工具", "scout/"],
    ["changelog", "menu", "更多", "changelog/"],
  ] as const;

  return `<!doctype html>
<html lang="zh-CN" data-theme="midnight">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(input.description)}">
  <meta name="theme-color" content="#080a0f">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(input.title)}">
  <meta property="og:description" content="${escapeHtml(input.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${prefix}assets/app.css">
  <title>${escapeHtml(input.title)}</title>
</head>
<body class="${escapeHtml(input.bodyClass || "")}" data-page="${input.active}">
  <a class="skip-link" href="#main">跳到主要内容</a>
  <header class="topbar">
    <a class="brand" href="${prefix}" aria-label="Agent Pulse 首页">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span><strong>AGENT PULSE</strong><small>决策情报 · 不是新闻流</small></span>
    </a>
    <nav class="desktop-nav" aria-label="主导航">${navHtml}</nav>
    <div class="top-actions">
      <button class="icon-button" data-theme-toggle type="button" aria-label="切换主题">${icon("sun")}</button>
      <a class="github-button" href="${escapeHtml(input.github.repositoryUrl)}" target="_blank" rel="noopener noreferrer">${stars}</a>
    </div>
  </header>
  <main id="main">${input.body.replaceAll("__PREFIX__", prefix)}</main>
  <footer class="site-footer">
    <div class="shell footer-grid">
      <div><strong>AGENT PULSE</strong><p>Signal, not noise.</p></div>
      <nav aria-label="页脚导航">
        <a href="${prefix}sources/">来源地图</a><a href="${prefix}legal/">版权与纠错</a><a href="${prefix}changelog/">Changelog</a>
      </nav>
      <p>一手来源优先 · 事实与判断分离 · 证据可追溯<br>静态快照 ${escapeHtml(formatDate(input.generatedAt))}</p>
    </div>
  </footer>
  <nav class="mobile-nav" aria-label="移动导航">
    ${mobileNav
      .map(
        ([key, iconName, label, route]) =>
          `<a href="${prefix}${route}"${isActive(input.active, key) ? ' aria-current="page"' : ""}>${icon(iconName)}<span>${label}</span></a>`,
      )
      .join("")}
  </nav>
  <script type="module" src="${prefix}assets/core.js"></script>
</body>
</html>`.replaceAll("__PREFIX__", prefix);
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
