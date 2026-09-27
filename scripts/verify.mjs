import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const root=new URL("../dist",import.meta.url).pathname;
if(!existsSync(root)) throw new Error("dist missing; run npm run build");
const files=[];const walk=d=>readdirSync(d).forEach(n=>{const p=join(d,n);statSync(p).isDirectory()?walk(p):p.endsWith("index.html")&&files.push(p)});walk(root);
const titles=new Set(),canonicals=new Set();
for(const f of files){const h=readFileSync(f,"utf8");const title=h.match(/<title>(.*?)<\/title>/)?.[1];const canonical=h.match(/rel="canonical" href="([^"]+)/)?.[1];if(!title||!canonical||!/<h1>/.test(h)||!/<meta name="description"/.test(h))throw new Error(`SEO field missing: ${f}`);if(titles.has(title))throw new Error(`Duplicate title: ${title}`);if(canonicals.has(canonical))throw new Error(`Duplicate canonical: ${canonical}`);titles.add(title);canonicals.add(canonical);JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1]||"{}");}
const sitemap=readFileSync(join(root,"sitemap.xml"),"utf8");if((sitemap.match(/<url>/g)||[]).length!==files.length)throw new Error("Sitemap/page count mismatch");
console.log(`Verified ${files.length} pages: unique titles, canonicals, H1s and parseable JSON-LD.`);
