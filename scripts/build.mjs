// Builds two outputs from src/:
//   dist/qab.html   single self-contained file (double-click to run on a desktop; no network use)
//   docs/           same app + manifest, icons and service worker for GitHub Pages (iPad home-screen install)
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const out = (p) => new URL("../" + p, import.meta.url);

const js = (await build({ entryPoints: [out("src/app.js").pathname], bundle: true, minify: true, format: "iife", write: false, target: "es2020" })).outputFiles[0].text;
const css = read("src/style.css");
const cards = {};
for (const f of readdirSync(out("assets/cards"))) {
  if (f.endsWith(".jpg")) cards[f.replace(".jpg", "")] = "data:image/jpeg;base64," + readFileSync(out("assets/cards/" + f)).toString("base64");
}
const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
const fill = (html, pwa) => html
  .replace("<!--PWA-->", pwa)
  .replace("/*CSS*/", () => css)
  .replace("/*CARDS*/{}", () => JSON.stringify(cards))
  .replace("/*JS*/", () => safe(js));

const tpl = read("src/index.template.html");
const single = fill(tpl, "");
const build_id = createHash("sha1").update(single).digest("hex").slice(0, 10);

mkdirSync(out("dist"), { recursive: true });
writeFileSync(out("dist/qab.html"), single);

rmSync(out("docs"), { recursive: true, force: true });
mkdirSync(out("docs"), { recursive: true });
writeFileSync(out("docs/index.html"), fill(tpl, '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icon-192.png">'));
writeFileSync(out("docs/sw.js"), read("src/sw.js").replace("__BUILD__", build_id));
writeFileSync(out("docs/manifest.webmanifest"), read("src/manifest.webmanifest"));
copyFileSync(out("assets/icons/icon-192.png"), out("docs/icon-192.png"));
copyFileSync(out("assets/icons/icon-512.png"), out("docs/icon-512.png"));
writeFileSync(out("docs/.nojekyll"), "");
console.log(`built dist/qab.html (${(single.length / 1e6).toFixed(2)} MB) and docs/ [${build_id}]`);
