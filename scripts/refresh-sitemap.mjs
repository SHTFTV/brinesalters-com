import { readdirSync,readFileSync,statSync,writeFileSync } from "node:fs";
import { join } from "node:path";
const out=new URL("../dist",import.meta.url).pathname,files=[];
const walk=d=>readdirSync(d).forEach(n=>{const p=join(d,n);statSync(p).isDirectory()?walk(p):n==="index.html"&&files.push(p)});walk(out);
const urls=files.map(f=>readFileSync(f,"utf8").match(/<link rel="canonical" href="([^"]+)/)?.[1]).filter(Boolean).sort();
writeFileSync(join(out,"sitemap.xml"),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${u}</loc><lastmod>2026-09-27</lastmod></url>`).join("")}</urlset>`);
console.log(`Refreshed sitemap with ${urls.length} URLs.`);
