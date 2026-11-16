#!/usr/bin/env node
/**
 * Builds xinport.com into dist/ and checks it. One file on purpose: the check that keeps
 * invented claims off the site sits next to the only strings the site may contain.
 *
 *   node build.mjs                        # build + check; exits 1 if any check fails
 *   HOME_ADDRESS="..." node build.mjs     # also fail if that address's street line appears
 *
 * Every visible line on the site is one of TEXT below or a value from identity.json.
 * A new line on the site starts as a new entry in TEXT, where the founder can see it.
 * dist/ is written even when a check fails, so a draft can still be previewed.
 */

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const id = JSON.parse(readFileSync('identity.json', 'utf8'));
const address = id.addressLines.join(', ');

// The only words on the site besides identity.json.
// Founder 2026-11-12: no formation date, no owner name, no "based in" or office claim (the
// address is Northwest's registered-agent office, so it is only ever a "Mailing address"),
// and Wholechart is "in closed testing on Android", never implied to be in a store.
// Founder 2026-11-15: "in development for iPhone and Android", never "available on".
// The product lines are the approved ones from wholechart.app and the 10-27 welcome email.
const LEAD = 'Xinport LLC develops mobile apps. Its first app is Wholechart, an astrology, BaZi and numerology app.';
const STATUS = 'Wholechart is in development for iPhone and Android. It is in closed testing on Android and is not yet available in any app store.';
const TEXT = {
  entity: 'A Texas limited liability company.',
  nav: ['Home', 'About', 'Wholechart', 'Contact'],
  about: [
    'About',
    'Xinport LLC is a Texas limited liability company that develops mobile apps.',
    'xinport.com is the company’s website. For questions about the company, write to admin@xinport.com. For help with Wholechart, write to support@wholechart.app.',
  ],
  app: [
    'Wholechart',
    'Wholechart is Xinport LLC’s first app.',
    'It reads your birth details three ways — your Western chart, your Chinese Four Pillars and your numerology — and tells you each day how much the three agree.',
    'Western astrology', 'Ten bodies to the degree, whole-sign houses, transits.',
    'Chinese BaZi', 'Four Pillars, the solar-term year boundary, and your Day Master.',
    'Numerology', 'Life Path, Expression, Soul Urge, Personality.',
    'Status', 'In development for iPhone and Android. In closed testing on Android. Not yet available in any app store.',
    'Wholechart is for entertainment and self-reflection. It is not medical, psychological, legal, or financial advice.',
    'Website', 'wholechart.app', 'Support',
  ],
  contact: ['Contact', 'Email', 'Mailing address', 'Wholechart support'],
  copyright: '© 2026 Xinport LLC',
  privacy: 'Wholechart Privacy Policy',
  terms: 'Wholechart Terms of Service',
  notFound: 'Page not found',
  home: 'Go to the Xinport LLC home page',
};
const SUPPORT = 'support@wholechart.app';
const LINK = {
  app: 'https://wholechart.app',
  privacy: 'https://wholechart.app/privacy',
  terms: 'https://wholechart.app/terms',
  site: 'https://xinport.com',
};
const PAGES = [['/', 'Home'], ['/about', 'About'], ['/wholechart', 'Wholechart'], ['/contact', 'Contact']];
const FONT = '/fonts/instrument-serif-400.woff2';

// The CSP travels in a <meta> tag because GitHub Pages cannot send headers. It allows the one
// inline stylesheet by hash, so no script or outside resource can run even if one were added by
// mistake. connect-src 'self' only because Lighthouse fetches /robots.txt from inside the page.
// No frame-ancestors: browsers ignore it in <meta> and Chrome logs a console error for it.
// It sits straight after <meta charset> because a meta policy only covers what follows it.
const META_CSP = () => `default-src 'none'; style-src 'sha256-${createHash('sha256').update(CSS).digest('base64')}'; font-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mail = (e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`;
// Puts links on words inside an approved sentence without changing its text.
const linkify = (s, links) => Object.entries(links).reduce((h, [word, a]) => h.replace(esc(word), a), esc(s));

// Wholechart's tokens (wholechart-website/src/css/tokens.css), light first.
const CSS = `@font-face{font-family:'Instrument Serif';font-style:normal;font-weight:400;font-display:swap;src:url(${FONT}) format('woff2')}
:root{color-scheme:light dark;--bg:#FBFAF7;--ink:#15172A;--ink2:#5A5F78;--rule:#E6E2D8;--gold:#E3A247}
@media (prefers-color-scheme:dark){:root{--bg:#05060C;--ink:#F2F4FF;--ink2:#A7AEC9;--rule:#23263A}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 1.0625rem/1.6 system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
.page{max-width:40rem;min-height:100vh;margin:0 auto;padding:0 16px;display:flex;flex-direction:column}
header{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.25rem 1.5rem;padding:1.25rem 0;border-bottom:1px solid var(--rule)}
.brand{margin:0;font:400 1.5rem/1 'Instrument Serif',Georgia,serif}
.brand a{text-decoration:none}
nav ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:0 1.25rem}
nav a{display:inline-block;padding:.5rem 0;color:var(--ink2);text-decoration:none}
nav a[aria-current]{color:var(--ink);text-decoration:underline}
main{flex:1;padding:clamp(3rem,10vh,6rem) 0 4rem}
main::before{content:'';display:block;width:48px;height:3px;background:var(--gold);margin-bottom:2rem}
h1{font:400 clamp(3rem,11vw,4.5rem)/1 'Instrument Serif',Georgia,serif;letter-spacing:-.01em;margin:0 0 .75rem}
.entity{margin:0 0 2.5rem;color:var(--ink2)}
.lead{margin:0 0 1.5rem;font-size:1.1875rem;max-width:34rem}
main>p{max-width:34rem}
.note{color:var(--ink2)}
dl{margin:2rem 0;padding-top:2rem;border-top:1px solid var(--rule);display:grid;gap:1.5rem}
dt{margin:0 0 .25rem;font-size:.8125rem;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
dd{margin:0}
address{font-style:normal}
a{color:inherit;text-decoration-thickness:1px;text-underline-offset:3px}
a:hover{text-decoration-thickness:2px}
a:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:2px}
footer{padding:1.5rem 0 2rem;border-top:1px solid var(--rule);font-size:.875rem;color:var(--ink2);display:grid;gap:.5rem}
footer p,footer ul{margin:0}
footer ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.5rem 1.5rem}`;

const FOOTER = `<footer>
<p>${TEXT.copyright}</p>
<p>${mail(id.email)}</p>
<p>${TEXT.contact[2]}: ${esc(address)}</p>
<ul>
<li><a href="${LINK.privacy}">${TEXT.privacy}</a></li>
<li><a href="${LINK.terms}">${TEXT.terms}</a></li>
</ul>
</footer>`;

function page({ path, title, description, main }) {
  const nav = PAGES.map(([href, label]) =>
    `<li><a href="${href}"${href === path ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${META_CSP()}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${path ? `<link rel="canonical" href="${LINK.site}${path}">\n` : ''}<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${FONT}" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
</head>
<body>
<div class="page">
<header>
<p class="brand"><a href="/">${esc(id.legalName)}</a></p>
<nav aria-label="Site">
<ul>
${nav}
</ul>
</nav>
</header>
<main>
${main}
</main>
${FOOTER}
</div>
</body>
</html>
`;
}

const OUT = {
  'index.html': page({
    path: '/',
    title: id.legalName,
    description: LEAD,
    main: `<h1>${esc(id.legalName)}</h1>
<p class="entity">${TEXT.entity}</p>
<p class="lead">${linkify(LEAD, { Wholechart: '<a href="/wholechart">Wholechart</a>' })}</p>
<p class="note">${STATUS}</p>`,
  }),
  'about.html': page({
    path: '/about',
    title: `${TEXT.about[0]} · ${id.legalName}`,
    description: TEXT.about[1],
    main: `<h1>${TEXT.about[0]}</h1>
<p class="lead">${TEXT.about[1]}</p>
<p>${linkify(LEAD.split('. ')[1], { Wholechart: '<a href="/wholechart">Wholechart</a>' })}</p>
<p>${STATUS}</p>
<p>${linkify(TEXT.about[2], { [id.email]: mail(id.email), [SUPPORT]: mail(SUPPORT) })}</p>`,
  }),
  'wholechart.html': page({
    path: '/wholechart',
    title: `${TEXT.app[0]} · ${id.legalName}`,
    description: TEXT.app[1],
    main: `<h1>${TEXT.app[0]}</h1>
<p class="entity">${TEXT.app[1]}</p>
<p class="lead">${esc(TEXT.app[2])}</p>
<dl>
<div><dt>${TEXT.app[3]}</dt><dd>${TEXT.app[4]}</dd></div>
<div><dt>${TEXT.app[5]}</dt><dd>${TEXT.app[6]}</dd></div>
<div><dt>${TEXT.app[7]}</dt><dd>${TEXT.app[8]}</dd></div>
<div><dt>${TEXT.app[9]}</dt><dd>${TEXT.app[10]}</dd></div>
<div><dt>${TEXT.app[12]}</dt><dd><a href="${LINK.app}">${TEXT.app[13]}</a></dd></div>
<div><dt>${TEXT.app[14]}</dt><dd>${mail(SUPPORT)}</dd></div>
</dl>
<p class="note">${TEXT.app[11]}</p>`,
  }),
  'contact.html': page({
    path: '/contact',
    title: `${TEXT.contact[0]} · ${id.legalName}`,
    description: `${TEXT.contact[1]}: ${id.email}`,
    main: `<h1>${TEXT.contact[0]}</h1>
<p class="entity">${esc(id.legalName)}</p>
<dl>
<div><dt>${TEXT.contact[1]}</dt><dd>${mail(id.email)}</dd></div>
<div><dt>${TEXT.contact[2]}</dt><dd><address>${id.addressLines.map(esc).join('<br>')}</address></dd></div>
<div><dt>${TEXT.contact[3]}</dt><dd>${mail(SUPPORT)}</dd></div>
</dl>`,
  }),
  '404.html': page({
    path: null,
    title: `${TEXT.notFound} · ${id.legalName}`,
    description: TEXT.notFound,
    main: `<h1>${TEXT.notFound}</h1>
<p class="entity"><a href="/">${TEXT.home}</a></p>`,
  }),
};

const FAVICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#15172A"/>' +
  '<path d="M22 21 42 43M42 21 22 43" stroke="#F0B45A" stroke-width="6" stroke-linecap="round"/></svg>\n';

// The Cloudflare Worker (kept until both stores show Xinport LLC) reads _headers; GitHub Pages
// does not, and the Pages workflow deletes this file before publishing.
const styleHash = createHash('sha256').update(CSS).digest('base64');
const HEADERS = `/*
  Content-Security-Policy: default-src 'none'; style-src 'sha256-${styleHash}'; font-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/fonts', { recursive: true });
for (const [name, html] of Object.entries(OUT)) writeFileSync(`dist/${name}`, html);
writeFileSync('dist/favicon.svg', FAVICON);
writeFileSync('dist/_headers', HEADERS);
// Without it, crawlers asking for /robots.txt get the 404 page.
writeFileSync('dist/robots.txt', 'User-agent: *\nAllow: /\n');
copyFileSync('fonts/instrument-serif-400.woff2', 'dist/fonts/instrument-serif-400.woff2');

// ---- checks ----------------------------------------------------------------------
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) failed++; };

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const visibleLines = (html) => html
  .replace(/<head>[\s\S]*?<\/head>/, '')
  .replace(/<br>/g, '\n')
  .replace(/<\/(h1|p|dt|dd|li|address)>/g, '\n')
  .replace(/<[^>]+>/g, '')
  .split('\n').map((l) => decode(l).replace(/\s+/g, ' ').trim()).filter(Boolean);

const allowedText = new Set([id.legalName, LEAD, LEAD.split('. ')[1], STATUS, ...Object.values(TEXT).flat(),
  ...id.addressLines, id.email, SUPPORT, `${TEXT.contact[2]}: ${address}`, `${TEXT.contact[1]}: ${id.email}`]);
const allowedUrls = new Set([...Object.values(LINK), ...PAGES.map(([p]) => p), ...PAGES.map(([p]) => LINK.site + p),
  `mailto:${id.email}`, `mailto:${SUPPORT}`, '/favicon.svg', FONT]);
// Words that would claim an office, a location, a store listing, a date or a user base.
const OVERCLAIM = /headquarter|\boffice\b|based in|located in|download|available on|available in the|get it on|founded|since 20|users|customers|testimonial/i;

ok(id.legalName === 'Xinport LLC', `legal name is "${id.legalName}"`);
for (const [name, html] of Object.entries(OUT)) {
  const lines = visibleLines(html);
  const extra = lines.filter((l) => !allowedText.has(l));
  ok(extra.length === 0, `${name}: every visible line is approved${extra.length ? ' (not approved: ' + extra.map((l) => `"${l}"`).join(', ') + ')' : ''}`);
  const urls = [...html.matchAll(/(?:href|src)="([^"]*)"|url\(([^)]*)\)/g)].map((m) => decode(m[1] ?? m[2]));
  const stray = urls.filter((u) => !allowedUrls.has(u));
  ok(stray.length === 0, `${name}: every link and resource is approved${stray.length ? ' (' + stray.join(', ') + ')' : ''}`);
  ok(!/<script/i.test(html), `${name}: no scripts`);
  ok(html.includes(`<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${META_CSP()}">`),
    `${name}: CSP meta tag comes straight after charset and matches the stylesheet`);
  // US-style phone numbers in any common punctuation; a ZIP or ZIP+4 does not match.
  const phone = lines.find((l) => /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(l));
  ok(!phone, `${name}: no phone number${phone ? ` ("${phone}")` : ''}`);
  const claim = lines.find((l) => OVERCLAIM.test(l));
  ok(!claim, `${name}: no office, location, store, date or user-count claim${claim ? ` ("${claim}")` : ''}`);
  // The address only ever appears under the "Mailing address" label.
  const bare = html.split(esc(id.addressLines[0])).length - 1;
  const labelled = (html.match(new RegExp(`${TEXT.contact[2]}(</dt><dd><address>|: )${esc(id.addressLines[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')) || []).length;
  ok(bare === labelled, `${name}: the address appears only as "${TEXT.contact[2]}"`);
}
ok(OUT['index.html'].includes(STATUS) && OUT['about.html'].includes(STATUS), 'Home and About carry the closed-testing status');

const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); });
walk('dist');
const texts = files.filter((f) => !f.endsWith('.woff2')).map((f) => readFileSync(f, 'utf8')).join('\n');
const placeholder = texts.match(/TODO[-\w]*|\[PASTE[^\]]*\]?/);
ok(!placeholder, `no placeholders left${placeholder ? ` ("${placeholder[0]}" - fill identity.json)` : ''}`);
ok(/^[^@\s]+@xinport\.com$/.test(id.email), `contact email is on xinport.com ("${id.email}")`);
const street = (process.env.HOME_ADDRESS || '').split(',')[0].trim();
ok(!street || !texts.toLowerCase().includes(street.toLowerCase()),
  street ? 'home address street line does not appear' : 'home address check skipped (HOME_ADDRESS not set)');
const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
ok(bytes < 64 * 1024, `whole site ${(bytes / 1024).toFixed(1)} KB, under 64 KB`);

if (failed) {
  console.error(`\n${failed} check(s) failed. dist/ was still written for preview; do not deploy it.`);
  process.exit(1);
}
console.log('\nsite ok -> dist/');
