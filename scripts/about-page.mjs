// Writes public/about/index.html: the story's words as one plain page that search engines read without running the
// 3D site. Run after editing src/portfolio-content.js: node scripts/about-page.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { people, labRooms, classroomRooms, heritage, admissions, labs, guide, footer } from '../src/portfolio-content.js';

const SITE = 'https://instrument-technology-au.pages.dev';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const li = (items) => `<ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;
const title = 'About IST | Department of Instrument Technology, Andhra University';
const description = 'The Department of Instrument Technology (IST), AU College of Engineering (A), Andhra University, Visakhapatnam: history since 1937, B.Tech, M.Tech and Ph.D programmes, eleven laboratories, research and faculty.';
const ld = {
  '@context': 'https://schema.org', '@type': 'AboutPage', url: `${SITE}/about/`, name: title, description,
  about: { '@type': 'CollegeOrUniversity', name: 'Department of Instrument Technology, Andhra University', url: `${SITE}/`,
    parentOrganization: { '@type': 'CollegeOrUniversity', name: 'Andhra University', url: 'https://www.andhrauniversity.edu.in/' } },
  breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE}/about/` }] },
};
const head = Object.values(people).find((p) => /Head/.test(p.role));

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${SITE}/about/" />
  <link rel="icon" href="/favicon.ico" />
  <meta name="theme-color" content="#0a1120" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${SITE}/about/" />
  <meta property="og:image" content="${SITE}/media/og-image.jpg" />
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <style>
    @font-face { font-family: 'Instrument Sans'; font-weight: 400 700; font-display: swap; src: url('/media/instrument-sans.woff2') format('woff2'); }
    :root { color-scheme: dark; }
    body { margin: 0; background: #0a1120; color: #e8e3d6; font: 16px/1.65 'Instrument Sans', system-ui, sans-serif; }
    main { max-width: 760px; margin: 0 auto; padding: 56px 20px 72px; }
    h1 { font-size: clamp(30px, 5.5vw, 46px); line-height: 1.15; font-weight: 600; margin: 0 0 16px; }
    h2 { font-size: 22px; font-weight: 600; margin: 48px 0 12px; color: #f3eee2; }
    h3 { font-size: 17px; font-weight: 600; margin: 22px 0 4px; }
    p, li { color: #c9c3b5; } ul { padding-left: 20px; } li { margin: 4px 0; }
    a { color: #9ad6fb; } a:focus-visible { outline: 2px solid #9ad6fb; outline-offset: 2px; }
    .walk { display: inline-block; margin-top: 12px; padding: 12px 22px; border: 1px solid rgb(243 238 226 / .35); border-radius: 999px; color: #f3eee2; text-decoration: none; }
    .walk:hover, .walk:focus-visible { background: #f3eee2; color: #0a1120; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 18px; } dt { color: #f3eee2; font-weight: 600; } dd { margin: 0; color: #c9c3b5; }
    footer { margin-top: 56px; font-size: 14px; color: #8f8a7f; }
  </style>
</head>
<body>
<main>
  <h1>IST: Department of Instrument Technology, Andhra University</h1>
  <p>The Department of Instrument Technology (IST) is part of AU College of Engineering (A), Andhra University, Visakhapatnam. ${esc(heritage.lead)}</p>
  <p>${esc(heritage.now)}</p>
  <a class="walk" href="/">Walk through the department in 3D</a>

  <h2>History</h2>
  <dl>${heritage.events.map((e) => `<dt>${e.year}</dt><dd>${esc(e.text)}</dd>`).join('')}</dl>

  <h2>${esc(admissions.title.replace(/\.$/, ''))}</h2>
  <p>${esc(admissions.lead)}</p>
  ${admissions.list.map((p) => `<h3>${esc(p.name)}</h3><p>${esc(p.length)}. ${esc(p.entry)}</p>`).join('')}
  <h3>${esc(admissions.objectivesTitle)}</h3>
  ${li(admissions.objectives.map(esc))}

  <h2>${esc(labs.title.replace(/\.$/, ''))}</h2>
  <p>${esc(labs.lead)}</p>
  ${Object.values(labRooms).map((l) => `<h3>${esc(l.title)}</h3><p>${esc(l.lead)}</p>`).join('')}
  <h3>Research areas</h3>
  ${li(labs.research.map(esc))}
  ${li(labs.facts.map(esc))}

  <h2>Classrooms</h2>
  ${Object.values(classroomRooms).map((c) => `<h3>${esc(c.title)}</h3><p>${esc(c.lead)}</p>`).join('')}

  <h2>Faculty</h2>
  ${head ? `<p>The Head of the Department is ${esc(head.name)}.</p>` : ''}
  ${Object.values(people).map((p) => `<h3>${esc(p.name)}</h3><p>${esc(p.role)}. ${esc(p.degrees)}. ${esc(p.area)}.${p.note ? ' ' + esc(p.note) : ''}</p>`).join('')}

  <h2>${esc(guide.title.replace(/\.$/, ''))}</h2>
  ${guide.groups.filter((g) => g.items?.length).map((g) => `<h3>${esc(g.title)}</h3>${li(g.items.map(esc))}`).join('')}

  <h2>Contact</h2>
  <p>${footer.address.map(esc).join('<br>')}</p>
  ${li(footer.phones.map(([k, v]) => `${esc(k)}: ${esc(v)}`))}

  <footer><p>${esc(footer.note)} Official information: <a href="https://www.andhrauniversity.edu.in/">andhrauniversity.edu.in</a>.</p></footer>
</main>
</body>
</html>
`;
mkdirSync(new URL('../public/about/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/about/index.html', import.meta.url), html);
console.log('wrote public/about/index.html', html.length, 'bytes');
// The same words in the home page's own HTML, inside #app (the app replaces it when it starts): a search engine reads
// the department without running the 3D scene, and a browser without scripts shows it (index.html hides the loader).
const home = new URL('../index.html', import.meta.url), page = readFileSync(home, 'utf8');
const text = html.slice(html.indexOf('<main>'), html.indexOf('</main>') + 7).replace('<a class="walk" href="/">Walk through the department in 3D</a>', '<a href="/about/">About the department</a>');
if (!/<!--story-text-->[\s\S]*?<!--\/story-text-->/.test(page)) throw new Error('index.html: the story-text markers are missing');
writeFileSync(home, page.replace(/<!--story-text-->[\s\S]*?<!--\/story-text-->/, () => `<!--story-text-->${text}<!--/story-text-->`));
console.log('wrote the story text into index.html', text.length, 'bytes');
