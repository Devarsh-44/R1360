// Builds the app icon and splash sources (assets/*.png) from public/ri360-mark.svg, then
// `npm run app:assets` turns them into every Android and iOS size.
const fs = require("fs");
const path = require("path");
const sharp = require(path.resolve("node_modules/sharp"));
const mark = fs.readFileSync("public/ri360-mark.svg", "utf8");
const glyphs = [...mark.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]); // "RI" and the speed bar
const RED = "#d7261e", PAPER = "#f7f3ea", PIT = "#12100d";
const art = (fill) => glyphs.map((d) => `<path d="${d}" fill="${fill}"/>`).join("");
// letters sit inside the 128 box at roughly x 26–104, y 33–110; centre them
const svg = (size, bg, inner, scale, round = 0) => {
  const s = (size / 128) * scale, off = (size - 128 * s) / 2;
  const back = bg ? `<rect width="${size}" height="${size}" rx="${round}" fill="${bg}"/>` : "";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${back}<g transform="translate(${off} ${off + 1.5 * s}) scale(${s})">${inner}</g></svg>`);
};
const tile = () => `<rect x="0" y="0" width="128" height="128" rx="24" fill="${RED}"/>${art(PAPER)}`;
(async () => {
  fs.mkdirSync("assets", { recursive: true });
  // iOS / legacy icon: full-bleed red square (the system rounds the corners)
  await sharp(svg(1024, RED, art(PAPER), 1)).png().toFile("assets/icon-only.png");
  // Android adaptive icon: letters inside the 66% safe zone, red background layer
  await sharp(svg(1024, null, art(PAPER), 0.62)).png().toFile("assets/icon-foreground.png");
  await sharp(svg(1024, RED, "", 1)).png().toFile("assets/icon-background.png");
  // splash: the rounded red tile centred on paper (light) or pit wall (dark)
  await sharp(svg(2732, PAPER, tile(), 0.22)).png().toFile("assets/splash.png");
  await sharp(svg(2732, PIT, tile(), 0.22)).png().toFile("assets/splash-dark.png");
  console.log(fs.readdirSync("assets").join(", "));
})();
