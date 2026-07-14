import { readFile, writeFile, mkdir } from "node:fs/promises";

const DOMAIN = "atlasagrotrade.com";
const SITE_URL = `https://${DOMAIN}`;
const API = `https://www.overrank.ai/api/articles/public?site=${DOMAIN}`;
const OUT = "blog";
const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

const index = await readFile("index.html","utf8").catch(()=>"");
const grabAll = (re) => (index.match(re)||[]).join("\n");
const fonts = grabAll(/<link[^>]*fonts\.g(?:oogleapis|static)\.com[^>]*>/gi);
const styles = grabAll(/<style[\s\S]*?<\/style>/gi);
const homeify = (b) => b.replace(/\s*onclick="[^"]*"/gi,"").replace(/href="#"/gi,`href="${SITE_URL}/"`);
const nav = homeify((index.match(/<nav[\s\S]*?<\/nav>/i)||[""])[0]);
const footer = homeify((index.match(/<footer[\s\S]*?<\/footer>/i)||[""])[0]);
const menuJs = `<script>function toggleMenu(){var n=document.getElementById('navLinks');if(n)n.classList.toggle('open');}</script>`;

const ARTICLE_CSS = `<style>
.ovr-main{max-width:840px;margin:0 auto;padding:36px 5% 72px}
.ovr-crumb{font-size:.8rem;color:var(--gray-500,#8a8f98);margin-bottom:18px}.ovr-crumb a{color:var(--green,#2e7d32);text-decoration:none}
.ovr-hero{width:100%;height:auto;border-radius:14px;margin:0 0 26px}
.ovr-article{line-height:1.8;color:var(--gray-800,#374151);font-family:var(--font-body,'Open Sans',system-ui,sans-serif);font-size:1.05rem}
.ovr-article h1{font-family:var(--font-display,'Playfair Display',serif);font-size:2.2rem;line-height:1.2;margin:.1em 0 .3em;color:var(--gray-900,#1a1a1a)}
.ovr-article h2{font-family:var(--font-display,'Playfair Display',serif);font-size:1.5rem;margin:2rem 0 .6rem}.ovr-article h3{margin:1.5rem 0 .4rem}
.ovr-article img{max-width:100%;height:auto;border-radius:12px;display:block;margin:24px auto}.ovr-article a{color:var(--green,#2e7d32)}
.ovr-meta{color:var(--gray-500,#8a8f98);font-size:.85rem;margin:0 0 20px}
.ovr-cta{display:inline-block;background:var(--green,#2e7d32);color:#fff!important;padding:14px 30px;border-radius:10px;font-weight:600;margin:26px 0 0;text-decoration:none}
.ovr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px;margin-top:8px}
.ovr-card{display:block;border:1px solid var(--gray-100,#eceef3);border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;background:#fff;transition:box-shadow .2s,transform .2s}
.ovr-card:hover{box-shadow:0 10px 30px rgba(0,0,0,.08);transform:translateY(-2px)}
.ovr-card img{width:100%;height:180px;object-fit:cover;display:block}
.ovr-card-body{padding:16px 18px 20px}
.ovr-card h2{font-family:var(--font-display,'Playfair Display',serif);font-size:1.15rem;margin:0 0 8px;line-height:1.3}
.ovr-card p{margin:0;color:var(--gray-600,#667085);font-size:.9rem;line-height:1.5}
</style>`;

function shell({title,description,canonical,image,jsonLd,main}){return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
${image?`<meta property="og:image" content="${esc(image)}">`:""}<meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary_large_image">
${jsonLd?`<script type="application/ld+json">${jsonLd}</script>`:""}
${fonts}
${styles}
${ARTICLE_CSS}
</head><body>
${nav}
${main}
${footer}
${menuJs}
</body></html>`;}

const list = await (await fetch(API,{headers:{"user-agent":"overrank-static-build"}})).json();
const arts = list.articles||[];
if(!arts.length){console.log("No published articles yet.");process.exit(0);}
await mkdir(OUT,{recursive:true});
const urls=[`${SITE_URL}/${OUT}/`];
for(const item of arts){
  const r = await (await fetch(`${API}&slug=${encodeURIComponent(item.slug)}`,{headers:{"user-agent":"overrank-static-build"}})).json();
  const a=(r.articles&&r.articles[0])||r.article||r;
  if(!a||!a.content)continue;
  const canonical=`${SITE_URL}/${OUT}/${a.slug}/`;
  const cta=a.ctaButton&&a.ctaButton.text&&a.ctaButton.url?`<a class="ovr-cta" href="${esc(a.ctaButton.url)}">${esc(a.ctaButton.text)}</a>`:`<a class="ovr-cta" href="${SITE_URL}/">Learn more at ${esc(DOMAIN)}</a>`;
  const faqLd=Array.isArray(a.faqs)&&a.faqs.length?JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:a.faqs.map(f=>({"@type":"Question",name:f.question,acceptedAnswer:{"@type":"Answer",text:f.answer}}))}):"";
  const articleLd=JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:a.title,image:a.thumbnailUrl||undefined,datePublished:a.publishedAt,author:{"@type":"Organization",name:a.siteName||DOMAIN},mainEntityOfPage:canonical});
  const jsonLd=faqLd?`${articleLd}</script><script type="application/ld+json">${faqLd}`:articleLd;
  const main=`<main class="ovr-main"><div class="ovr-crumb"><a href="${SITE_URL}/">Home</a> &rsaquo; <a href="${SITE_URL}/${OUT}/">Blog</a></div>${a.thumbnailUrl?`<img class="ovr-hero" src="${esc(a.thumbnailUrl)}" alt="${esc(a.title)}">`:""}<article class="ovr-article"><h1>${esc(a.title)}</h1><div class="ovr-meta">${a.readingTime?esc(a.readingTime)+" min read":""}</div>${a.content}${cta}</article></main>`;
  await mkdir(`${OUT}/${a.slug}`,{recursive:true});
  await writeFile(`${OUT}/${a.slug}/index.html`,shell({title:a.title,description:a.metaDescription||a.excerpt||"",canonical,image:a.thumbnailUrl,jsonLd,main}));
  console.log(`  wrote ${OUT}/${a.slug}/index.html`); urls.push(canonical);
}
const cards=arts.map(a=>`<a class="ovr-card" href="${SITE_URL}/${OUT}/${esc(a.slug)}/">${a.thumbnailUrl?`<img src="${esc(a.thumbnailUrl)}" alt="${esc(a.title)}">`:""}<div class="ovr-card-body"><h2>${esc(a.title)}</h2><p>${esc(a.excerpt||a.metaDescription||"")}</p></div></a>`).join("\n");
const indexMain=`<main class="ovr-main"><div class="ovr-crumb"><a href="${SITE_URL}/">Home</a> &rsaquo; Blog</div><h1 class="ovr-article" style="margin-bottom:24px">Insights &amp; Guides</h1><div class="ovr-grid">${cards}</div></main>`;
await writeFile(`${OUT}/index.html`,shell({title:`Blog | ${DOMAIN}`,description:`Insights and guides from ${DOMAIN}.`,canonical:`${SITE_URL}/${OUT}/`,image:arts[0].thumbnailUrl,jsonLd:"",main:indexMain}));
const sm=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(`${OUT}/sitemap.xml`,sm);
console.log(`Done. ${urls.length-1} article page(s).`);
