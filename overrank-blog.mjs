import { writeFile, mkdir } from "node:fs/promises";

const DOMAIN = "atlasagrotrade.com";
const SITE_URL = `https://${DOMAIN}`;
const API = `https://www.overrank.ai/api/articles/public?site=${DOMAIN}`;
const OUT = "blog";
const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const CSS = `body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.7;color:#1a1a1a;margin:0}.wrap{max-width:760px;margin:0 auto;padding:28px 20px 64px}a{color:#6847eb;text-decoration:none}a:hover{text-decoration:underline}.nav{font-size:14px;color:#667085;margin-bottom:24px}h1{font-size:2.1rem;line-height:1.2}h2{margin-top:2rem}img{max-width:100%;height:auto;border-radius:10px;display:block;margin:20px auto}.hero{margin:0 0 24px}.meta{color:#667085;font-size:14px}.cta{display:inline-block;background:#7c5cfc;color:#fff!important;padding:13px 26px;border-radius:999px;font-weight:600;margin:28px 0}.card{display:block;border:1px solid #eceef3;border-radius:14px;padding:18px 20px;margin:14px 0;color:inherit}.card:hover{border-color:#d9d3fb}.card h2{margin:0 0 6px;font-size:1.15rem}.card p{margin:0;color:#667085;font-size:14.5px}footer{margin-top:48px;padding-top:20px;border-top:1px solid #eee;font-size:13px;color:#667085}`;
function shell({title,description,canonical,image,jsonLd,body}){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${image?`<meta property="og:image" content="${esc(image)}">`:""}<meta property="og:url" content="${esc(canonical)}"><meta name="twitter:card" content="summary_large_image">${jsonLd?`<script type="application/ld+json">${jsonLd}</script>`:""}<style>${CSS}</style></head><body><div class="wrap">${body}<footer>Published by <a href="${SITE_URL}">${esc(DOMAIN)}</a></footer></div></body></html>`;}
async function main(){
  const list = await (await fetch(API,{headers:{"user-agent":"overrank-static-build"}})).json();
  const arts = list.articles || [];
  if(!arts.length){console.log("No published articles yet.");return;}
  await mkdir(OUT,{recursive:true});
  const urls=[`${SITE_URL}/${OUT}/`];
  for(const item of arts){
    const r = await (await fetch(`${API}&slug=${encodeURIComponent(item.slug)}`,{headers:{"user-agent":"overrank-static-build"}})).json();
    const a = (r.articles&&r.articles[0])||r.article||r;
    if(!a||!a.content){continue;}
    const canonical=`${SITE_URL}/${OUT}/${a.slug}/`;
    const cta = a.ctaButton&&a.ctaButton.text&&a.ctaButton.url?`<a class="cta" href="${esc(a.ctaButton.url)}">${esc(a.ctaButton.text)}</a>`:`<a class="cta" href="${SITE_URL}">Learn more at ${esc(DOMAIN)}</a>`;
    const faqLd = Array.isArray(a.faqs)&&a.faqs.length?JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:a.faqs.map(f=>({"@type":"Question",name:f.question,acceptedAnswer:{"@type":"Answer",text:f.answer}}))}):"";
    const articleLd = JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:a.title,image:a.thumbnailUrl||undefined,datePublished:a.publishedAt,author:{"@type":"Organization",name:a.siteName||DOMAIN},mainEntityOfPage:canonical});
    const jsonLd = faqLd?`${articleLd}</script><script type="application/ld+json">${faqLd}`:articleLd;
    const body=`<div class="nav"><a href="${SITE_URL}">Home</a> &rsaquo; <a href="${SITE_URL}/${OUT}/">Blog</a></div>${a.thumbnailUrl?`<img class="hero" src="${esc(a.thumbnailUrl)}" alt="${esc(a.title)}">`:""}<h1>${esc(a.title)}</h1><div class="meta">${a.readingTime?esc(a.readingTime)+" min read":""}</div>${a.content}${cta}`;
    await mkdir(`${OUT}/${a.slug}`,{recursive:true});
    await writeFile(`${OUT}/${a.slug}/index.html`,shell({title:a.title,description:a.metaDescription||a.excerpt||"",canonical,image:a.thumbnailUrl,jsonLd,body}));
    urls.push(canonical);
  }
  const cards = arts.map(a=>`<a class="card" href="${SITE_URL}/${OUT}/${esc(a.slug)}/"><h2>${esc(a.title)}</h2><p>${esc(a.excerpt||a.metaDescription||"")}</p></a>`).join("");
  await writeFile(`${OUT}/index.html`,shell({title:`Blog | ${DOMAIN}`,description:`Insights and guides from ${DOMAIN}.`,canonical:`${SITE_URL}/${OUT}/`,image:arts[0].thumbnailUrl,body:`<div class="nav"><a href="${SITE_URL}">Home</a> &rsaquo; Blog</div><h1>Blog</h1>${cards}`}));
  const sm=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`;
  await writeFile(`${OUT}/sitemap.xml`,sm);
  console.log(`Done. ${urls.length-1} article page(s) built.`);
}
main().catch(e=>{console.error("Build failed:",e);process.exit(1);});
