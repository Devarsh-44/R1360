// RI360 App Builder: a one-shot Figma plugin.
// Builds the RI360 phone app from docs/app-design/ri360-app-blueprint.html:
// variables, text styles, components, 22 screens and every prototype transition.
// Run it in an empty design file (it clears and rebuilds its own pages if you run it again).

const LOG = [];
const note = (m) => LOG.push(m);
let STAGE = "setup";

// ---------------------------------------------------------------- data
const RACES = [[1,"Australian","Melbourne","Mar 8","RUS",7,0],[2,"Chinese","Shanghai","Mar 15","ANT",4,0],[3,"Japanese","Suzuka","Mar 29","ANT",6,0],[4,"Miami","Miami Gardens","May 3","ANT",6,0],[5,"Canadian","Montréal","May 24","ANT",5,0],[6,"Monaco","Monaco","Jun 7","ANT",11,0],[7,"Barcelona","Barcelona","Jun 14","HAM",5,0],[8,"Austrian","Spielberg","Jun 28","RUS",4,0],[9,"British","Silverstone","Jul 5","LEC",7,0],[10,"Belgian","Spa","Jul 19","ANT",7,0],[11,"Hungarian","Budapest","Jul 26","NOR",2,0],[12,"Dutch","Zandvoort","Aug 23","NOR",7,0],[13,"Italian","Monza","Sep 6","ANT",6,0],[14,"Spanish","Madrid","Sep 13","ANT",2,0],[15,"Azerbaijan","Baku","Sep 26","RUS",8,0],[16,"Bahrain","Kuala Lumpur","Oct 4","VER",16,0],[17,"Singapore","Singapore","Oct 11","VER",4,0],[18,"United States","Austin","Oct 25","ANT",4,0],[19,"Mexico City","Mexico City","Nov 1","VER",10,0],[20,"São Paulo","São Paulo","Nov 8","NOR",0,1]];
const SP = [["NOR","Lando Norris","McLaren",1,3,[["I",16],["S",33],["S",13],["I",9]],"1:14.958"],["VER","Max Verstappen","Red Bull Racing",2,13,[["I",17],["S",28],["S",17],["I",9]],"1:15.161"],["HAD","Isack Hadjar","Red Bull Racing",3,4,[["I",16],["S",34],["S",12],["I",9]],"1:15.418"],["RUS","George Russell","Mercedes",4,5,[["I",16],["S",45],["I",10]],"1:15.084"],["ANT","Kimi Antonelli","Mercedes",5,1,[["I",17],["S",36],["S",9],["I",9]],"1:14.832"],["PIA","Oscar Piastri","McLaren",6,8,[["I",16],["S",35],["S",11],["I",9]],"1:15.079"],["LAW","Liam Lawson","Racing Bulls",7,2,[["I",16],["S",32],["S",13],["I",10]],"1:15.880"],["LEC","Charles Leclerc","Ferrari",8,15,[["I",16],["S",45],["I",10]],"1:15.892"],["HAM","Lewis Hamilton","Ferrari",9,9,[["I",14],["S",24],["S",24],["I",8]],"1:15.109"],["HUL","Nico Hulkenberg","Audi",10,6,[["I",16],["S",28],["S",17],["I",9]],"1:15.833"]];
const TRACE = { NOR: [0,-33.53,-64.52,-99.99,-125,-105.22,-81.22,-54.26,-25.51,2.72,8.81,43.76,70.17,23.89,0], VER: [-6.75,-41.15,-73.7,-102.29,-131.25,-113.11,-89.17,-62.84,-35.87,-33.35,2.14,35.94,56.22,12.21,-14.48] };
const SEASON = [["ANT","Mercedes",9,16,"2,1,1,1,1,1,16,3,15,1,3,2,1,1,5,2,3,1,3,5"],["VER","Red Bull",3,12,"6,16,8,5,3,-,4,2,20,3,2,-,3,2,2,1,1,3,1,2"],["RUS","Mercedes",3,8,"1,2,4,4,19,12,2,1,2,-,7,3,2,5,1,20,9,8,6,4"],["NOR","McLaren",3,6,"5,-,5,2,18,19,3,7,4,7,1,1,4,3,18,9,4,5,5,1"],["HAM","Ferrari",1,7,"4,3,6,6,2,2,1,5,3,4,5,4,6,22,6,3,6,4,2,9"],["LEC","Ferrari",1,6,"3,4,3,8,4,17,15,8,1,2,4,5,22,4,4,4,2,2,4,8"],["PIA","McLaren",0,2,"-,-,2,3,11,4,5,4,11,5,20,6,5,8,13,6,5,7,13,6"],["HAD","Red Bull",0,3,"20,8,12,22,5,3,6,6,5,6,6,-,-,-,3,5,10,6,9,3"]];
const NUMS = { NOR: "4", LEC: "16" };
const CNAME = { S: "Soft", M: "Medium", H: "Hard", I: "Inter", W: "Wet" };
const TYRE_TOKEN = { S: "tyre/soft", M: "tyre/medium", H: "tyre/hard", I: "tyre/inter", W: "tyre/wet" };

// ---------------------------------------------------------------- motion (seconds)
const EZ = {
  ios: { type: "CUSTOM_CUBIC_BEZIER", easingFunctionCubicBezier: { x1: 0.32, y1: 0.72, x2: 0, y2: 1 } },
  std: { type: "CUSTOM_CUBIC_BEZIER", easingFunctionCubicBezier: { x1: 0.2, y1: 0, x2: 0, y2: 1 } },
  out: { type: "EASE_OUT" },
  bouncy: { type: "CUSTOM_SPRING", easingFunctionSpring: { mass: 1, stiffness: 300, damping: 20, initialVelocity: 0 } },
};
const TR = {
  tab: { type: "DISSOLVE", easing: EZ.out, duration: 0.16 },
  fade: { type: "DISSOLVE", easing: EZ.out, duration: 0.4 },
  push: { type: "PUSH", direction: "LEFT", matchLayers: false, easing: EZ.ios, duration: 0.36 },
  shared: { type: "SMART_ANIMATE", easing: EZ.ios, duration: 0.36 },
  segment: { type: "SMART_ANIMATE", easing: EZ.std, duration: 0.24 },
  sheet: { type: "SMART_ANIMATE", easing: EZ.ios, duration: 0.44 },
  spring: { type: "SMART_ANIMATE", easing: EZ.bouncy, duration: 0.52 },
};
const click = { type: "ON_CLICK" };
const go = (dest, transition) => ({ type: "NODE", destinationId: dest.id, navigation: "NAVIGATE", transition, resetScrollPosition: true });
const changeTo = (dest) => ({ type: "NODE", destinationId: dest.id, navigation: "CHANGE_TO", transition: TR.segment });
async function react(node, trigger, action) {
  try { await node.setReactionsAsync([{ trigger, actions: [action] }]); } catch (e) { note(`Interaction on "${node.name}" not set: ${e.message}`); }
}

// ---------------------------------------------------------------- tokens
const COLORS = {
  "surface/page": ["#f7f3ea", "#12100d"], "surface/card": ["#fffdf8", "#1c1915"], "surface/sunken": ["#efe9dc", "#0b0a08"],
  "line/subtle": ["#e3dccb", "#2c2721"], "line/strong": ["#948a76", "#6b6253"],
  "text/primary": ["#16130f", "#f3ede1"], "text/muted": ["#5b5446", "#a89f8e"], "text/on-red": ["#ffffff", "#12100d"],
  "race-red/base": ["#d7261e", "#ff5a4a"], "race-red/tint": ["#f9dcd6", "#3a1814"],
  "petrol/base": ["#1f4e5f", "#6fb2c6"], "petrol/tint": ["#d9e7ea", "#16303a"], "podium/base": ["#c9a227", "#e2bd4a"],
  "tyre/soft": ["#d7261e", "#ff5a4a"], "tyre/medium": ["#c9a227", "#e2bd4a"], "tyre/hard": ["#16130f", "#f3ede1"], "tyre/inter": ["#2f8a4a", "#4fb36a"], "tyre/wet": ["#2d6fb0", "#5b9be0"],
  "hero/surface": ["#16130f", "#241f19"], "hero/text": ["#f3ede1", "#f3ede1"], "hero/accent": ["#ff7a6d", "#ff7a6d"], "hero/muted": ["#a89f8e", "#a89f8e"],
};
const SIZES = { "space/1": 4, "space/2": 8, "space/3": 12, "space/4": 16, "space/5": 20, "space/6": 24, "space/7": 32, "space/8": 48, "radius/sm": 4, "radius/md": 8, "radius/lg": 14, "radius/hero": 18, "radius/sheet": 22, "radius/pill": 999 };
const SPACE_BY_VALUE = { 4: "space/1", 8: "space/2", 12: "space/3", 16: "space/4", 20: "space/5", 24: "space/6", 32: "space/7", 48: "space/8" };
const RADIUS_BY_VALUE = { 4: "radius/sm", 8: "radius/md", 14: "radius/lg", 18: "radius/hero", 22: "radius/sheet", 999: "radius/pill" };
const TEXT_STYLES = [
  ["Display/Large title", "display", "ExtraBold", 40, 38, 0, "UPPER"], ["Display/Hero", "display", "ExtraBold", 34, 31, 0, "UPPER"],
  ["Display/Section", "display", "Bold", 22, 22, 0, "UPPER"], ["Display/Sheet title", "display", "Bold", 24, 24, 0, "UPPER"],
  ["Display/Big stat", "display", "ExtraBold", 44, 44, 0, "ORIGINAL"], ["Display/Driver code", "display", "ExtraBold", 28, 28, 0, "ORIGINAL"],
  ["Display/Round", "display", "Bold", 22, 22, 0, "ORIGINAL"], ["Display/Wordmark", "display", "ExtraBold", 64, 64, -1, "ORIGINAL"],
  ["UI/Nav title", "ui", "Bold", 16, 20, 0, "ORIGINAL"], ["UI/Row title", "ui", "Medium", 16, 20, 0, "ORIGINAL"],
  ["UI/Body", "ui", "Regular", 15, 21, 0, "ORIGINAL"], ["UI/Small", "ui", "Regular", 13, 18, 0, "ORIGINAL"],
  ["UI/Button", "ui", "Bold", 15, 20, 0, "ORIGINAL"], ["UI/Kicker", "ui", "Bold", 11, 14, 14, "UPPER"],
  ["UI/Label", "ui", "Bold", 10, 13, 12, "UPPER"], ["UI/Tab label", "ui", "Medium", 10.5, 12, 0, "ORIGINAL"],
  ["Data/Value", "data", "Medium", 14, 19, 0, "ORIGINAL"], ["Data/Big", "data", "Bold", 22, 26, 0, "ORIGINAL"],
  ["Data/Chip", "data", "Bold", 13, 16, 0, "ORIGINAL"], ["Data/Tag", "data", "Bold", 10, 12, 4, "ORIGINAL"], ["Data/Axis", "data", "Medium", 10, 12, 0, "ORIGINAL"],
];
const FAMILY = { display: "Barlow Condensed", ui: "Space Grotesk", data: "JetBrains Mono" };
const INTER_FALLBACK = { ExtraBold: "Extra Bold", Bold: "Bold", Medium: "Medium", Regular: "Regular" };

const VAR = {}, PITVAR = {}, STY = {}, FONT = {};
let COLOR_COLL = null, PIT_COLL = null, PIT_MODE = null;

const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const paint = (token, opacity) => {
  const p = { type: "SOLID", color: hex(COLORS[token][0]) };
  if (opacity != null) p.opacity = opacity;
  return figma.variables.setBoundVariableForPaint(p, "color", VAR[token]);
};
const black = (opacity) => ({ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity });
const white = () => ({ type: "SOLID", color: { r: 1, g: 1, b: 1 } });

// ---------------------------------------------------------------- node helpers
function bindNum(node, field, value, table) { const k = table[value]; if (k && VAR[k]) { try { node.setBoundVariable(field, VAR[k]); return; } catch (e) { /* fall through */ } } node[field] = value; }
function radius(node, r) {
  if (RADIUS_BY_VALUE[r]) { for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) bindNum(node, f, r, RADIUS_BY_VALUE); }
  else node.cornerRadius = r;
}
function stroke(node, token, w = 1, sides) {
  node.strokes = [paint(token)]; node.strokeAlign = "INSIDE";
  if (sides) { node.strokeTopWeight = sides.includes("t") ? w : 0; node.strokeBottomWeight = sides.includes("b") ? w : 0; node.strokeLeftWeight = sides.includes("l") ? w : 0; node.strokeRightWeight = sides.includes("r") ? w : 0; }
  else node.strokeWeight = w;
}
// Frame (or component) with optional auto layout. o: dir, gap, pad [t,r,b,l], w, h, fill, r, stroke, align, cross, clip, wrap, rowGap
function F(name, o = {}, make = () => figma.createFrame()) {
  const f = make(); f.name = name; f.fills = o.fill ? [paint(o.fill, o.fillOpacity)] : [];
  if (o.dir) {
    f.layoutMode = o.dir;
    f.resize(o.w || 100, o.h || 100);
    const horiz = o.dir === "HORIZONTAL";
    f.primaryAxisSizingMode = (horiz ? o.w : o.h) ? "FIXED" : "AUTO";
    f.counterAxisSizingMode = (horiz ? o.h : o.w) ? "FIXED" : "AUTO";
    bindNum(f, "itemSpacing", o.gap || 0, SPACE_BY_VALUE);
    const [t, r, b, l] = o.pad || [0, 0, 0, 0];
    bindNum(f, "paddingTop", t, SPACE_BY_VALUE); bindNum(f, "paddingRight", r, SPACE_BY_VALUE); bindNum(f, "paddingBottom", b, SPACE_BY_VALUE); bindNum(f, "paddingLeft", l, SPACE_BY_VALUE);
    if (o.align) f.primaryAxisAlignItems = o.align;
    if (o.cross) f.counterAxisAlignItems = o.cross;
    if (o.wrap) { f.layoutWrap = "WRAP"; f.counterAxisSpacing = o.rowGap || o.gap || 0; }
  } else if (o.w || o.h) f.resize(o.w || 100, o.h || 100);
  if (o.r != null) radius(f, o.r);
  if (o.stroke) stroke(f, o.stroke, o.strokeW || 1, o.sides);
  f.clipsContent = !!o.clip;
  return f;
}
const C = (name, o) => F(name, o, () => figma.createComponent());
// append with sizing: fill "h" | "v" | "hv"; abs {x,y}
function add(parent, child, o = {}) {
  parent.appendChild(child);
  if (o.abs) { child.layoutPositioning = "ABSOLUTE"; child.x = o.abs.x; child.y = o.abs.y; }
  if (o.fill && o.fill.includes("h")) { child.layoutSizingHorizontal = "FILL"; if (child.type === "TEXT") child.textAutoResize = "HEIGHT"; }
  if (o.fill && o.fill.includes("v")) child.layoutSizingVertical = "FILL";
  return child;
}
async function T(chars, style, token = "text/primary", o = {}) {
  const t = figma.createText();
  t.fontName = FONT[style];
  t.characters = String(chars);
  await t.setTextStyleIdAsync(STY[style].id);
  t.fills = [paint(token)];
  t.name = o.name || String(chars).slice(0, 40);
  if (o.w) { t.resize(o.w, t.height); t.textAutoResize = "HEIGHT"; }
  if (o.align) t.textAlignHorizontal = o.align;
  if (o.opacity != null) t.opacity = o.opacity;
  return t;
}
function rect(name, w, h, token, r) { const x = figma.createRectangle(); x.name = name; x.resize(w, h); x.fills = token ? [paint(token)] : []; if (r != null) radius(x, r); return x; }
function icon(name, svg, token, w, h = w) {
  const n = figma.createNodeFromSvg(svg.replace(/currentColor/g, "#000000"));
  n.name = name; n.resize(w, h); n.fills = [];
  for (const v of n.findAll((x) => x.type === "VECTOR" || x.type === "ELLIPSE" || x.type === "RECTANGLE")) {
    if (v.strokes && v.strokes.length) v.strokes = [paint(token)];
    if (v.fills && v.fills.length) v.fills = [paint(token)];
  }
  return n;
}
const SVG = {
  home: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  races: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 21V4M5 4h13l-2.5 4L18 12H5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  lab: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5" stroke="currentColor" stroke-width="1.8"/></svg>',
  seasons: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.8"/></svg>',
  more: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>',
  back: '<svg width="21" height="21" viewBox="0 0 21 21" fill="none"><path d="M13 2.5L5 10.5l8 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2.5l4.5 4.5L5 11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 5l4.5 4.5L11.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 13V2.5M6.5 6L10 2.5 13.5 6M4.5 9.5v7h11v-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.8"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  bell: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 8a5 5 0 0 1 10 0v4l1.5 2.5h-13L5 12z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 17a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.8"/></svg>',
  wifi: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 6a9.5 9.5 0 0 1 13 0M4 9a6 6 0 0 1 8 0M6.5 12a2.4 2.4 0 0 1 3 0M2 2l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  status: '<svg width="70" height="13" viewBox="0 0 70 13" fill="none"><rect x="0" y="9" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="6.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="4" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="1" width="3" height="12" rx="1" fill="currentColor"/><path d="M30 3.6c2.2 0 4.2.9 5.7 2.3l1.1-1.1A9.6 9.6 0 0 0 30 2a9.6 9.6 0 0 0-6.8 2.8l1.1 1.1A8 8 0 0 1 30 3.6zM30 10l1.7-1.7a2.4 2.4 0 0 0-3.4 0z" fill="currentColor"/><rect x="42.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor"/><rect x="44" y="2" width="18" height="9" rx="2" fill="currentColor"/></svg>',
};

// ---------------------------------------------------------------- setup: pages, cleanup
async function getPage(name, index) {
  let p = figma.root.children.find((x) => x.name === name);
  if (!p && index === 0) { const first = figma.root.children[0]; await first.loadAsync(); const ours = ["Foundations", "Components", "Screens + Prototype"]; if (!ours.includes(first.name) && first.children.length === 0) { first.name = name; p = first; } }
  if (!p) { try { p = figma.createPage(); p.name = name; } catch (e) { note(`Could not add page "${name}" (Starter allows 3 pages); using "${figma.root.children[0].name}".`); p = figma.root.children[0]; } }
  await p.loadAsync();
  for (const c of [...p.children]) c.remove();
  return p;
}
async function cleanup() {
  for (const c of await figma.variables.getLocalVariableCollectionsAsync()) if (c.name.startsWith("RI360")) c.remove();
  const names = new Set(TEXT_STYLES.map((t) => t[0]));
  for (const s of await figma.getLocalTextStylesAsync()) if (names.has(s.name)) s.remove();
  for (const s of await figma.getLocalEffectStylesAsync()) if (s.name === "Elevation/Sheet" || s.name === "Elevation/Banner") s.remove();
}
async function loadFonts() {
  const needed = new Set(TEXT_STYLES.map(([, fam, st]) => `${fam}|${st}`));
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  for (const k of needed) {
    const [fam, st] = k.split("|");
    const want = { family: FAMILY[fam], style: st };
    try { await figma.loadFontAsync(want); FONT[k] = want; }
    catch (e) { const fb = { family: "Inter", style: INTER_FALLBACK[st] }; await figma.loadFontAsync(fb); FONT[k] = fb; note(`Font ${want.family} ${st} missing: used Inter ${fb.style}. Install it from Google Fonts and run again.`); }
  }
  for (const [name, fam, st] of TEXT_STYLES) FONT[name] = FONT[`${fam}|${st}`];
}
async function tokens() {
  COLOR_COLL = figma.variables.createVariableCollection("RI360 colour");
  COLOR_COLL.renameMode(COLOR_COLL.modes[0].modeId, "Paper");
  try { PIT_MODE = COLOR_COLL.addMode("Pit wall"); } catch (e) {
    PIT_MODE = null; COLOR_COLL.name = "RI360 colour · Paper";
    PIT_COLL = figma.variables.createVariableCollection("RI360 colour · Pit wall");
    PIT_COLL.renameMode(PIT_COLL.modes[0].modeId, "Pit wall");
    note("Your plan allows one mode per collection, so Pit wall is a separate colour collection. Pit wall screens are re-bound to it.");
  }
  for (const [n, [a, b]] of Object.entries(COLORS)) {
    const scopes = n.startsWith("text/") ? ["TEXT_FILL"] : n.startsWith("line/") ? ["STROKE_COLOR"] : ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR", "TEXT_FILL"];
    const v = figma.variables.createVariable(n, COLOR_COLL, "COLOR"); v.scopes = scopes;
    v.setValueForMode(COLOR_COLL.modes[0].modeId, hex(a));
    if (PIT_MODE) v.setValueForMode(PIT_MODE, hex(b));
    else { const w = figma.variables.createVariable(n, PIT_COLL, "COLOR"); w.scopes = scopes; w.setValueForMode(PIT_COLL.modes[0].modeId, hex(b)); PITVAR[v.id] = w; }
    VAR[n] = v;
  }
  const size = figma.variables.createVariableCollection("RI360 size");
  for (const [n, val] of Object.entries(SIZES)) {
    const v = figma.variables.createVariable(n, size, "FLOAT");
    v.scopes = n.startsWith("space") ? ["GAP"] : ["CORNER_RADIUS"];
    v.setValueForMode(size.modes[0].modeId, val); VAR[n] = v;
  }
  for (const [n, , , fs, lh, ls, tc] of TEXT_STYLES) {
    const s = figma.createTextStyle(); s.name = n; s.fontName = FONT[n]; s.fontSize = fs;
    s.lineHeight = { unit: "PIXELS", value: lh }; s.letterSpacing = { unit: "PERCENT", value: ls }; s.textCase = tc; STY[n] = s;
  }
  const sh = figma.createEffectStyle(); sh.name = "Elevation/Sheet";
  sh.effects = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.18 }, offset: { x: 0, y: -4 }, radius: 24, spread: 0, visible: true, blendMode: "NORMAL" }];
  const bn = figma.createEffectStyle(); bn.name = "Elevation/Banner";
  bn.effects = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 10 }, radius: 30, spread: 0, visible: true, blendMode: "NORMAL" }];
  STY.sheet = sh; STY.banner = bn;
}

// ---------------------------------------------------------------- foundations page
async function foundations(page) {
  await figma.setCurrentPageAsync(page);
  const wrap = F("RI360 foundations", { dir: "VERTICAL", gap: 32, pad: [48, 48, 48, 48], fill: "surface/page", w: 1240 });
  page.appendChild(wrap);
  add(wrap, await T("RI360 app · foundations", "Display/Large title"));
  add(wrap, await T("Colour variables. Paper is the light theme, Pit wall the dark one. Names match frontend/src/styles/tokens.css.", "UI/Body", "text/muted", { w: 900 }));
  const grid = F("Colour swatches", { dir: "HORIZONTAL", gap: 12, wrap: true, w: 1144 });
  add(wrap, grid);
  for (const [n, [a, b]] of Object.entries(COLORS)) {
    const sw = F(n, { dir: "VERTICAL", gap: 6, w: 176, pad: [0, 0, 8, 0], fill: "surface/card", r: 8, stroke: "line/subtle", clip: true });
    add(grid, sw);
    const chip = F("chip", { dir: "HORIZONTAL", h: 44 }); add(sw, chip, { fill: "h" });
    const pa = figma.createRectangle(); pa.resize(88, 44); pa.fills = [paint(n)]; pa.name = "paper"; add(chip, pa, { fill: "h" });
    const pb = figma.createRectangle(); pb.resize(88, 44); pb.fills = [{ type: "SOLID", color: hex(b) }]; pb.name = "pit wall"; add(chip, pb, { fill: "h" });
    const l = F("label", { dir: "VERTICAL", gap: 2, pad: [0, 8, 0, 8] }); add(sw, l, { fill: "h" });
    add(l, await T(n, "Data/Tag")); add(l, await T(`${a} · ${b}`, "Data/Axis", "text/muted"));
  }
  add(wrap, await T("Text styles", "Display/Section"));
  for (const [n] of TEXT_STYLES) {
    const row = F(n, { dir: "HORIZONTAL", gap: 24, cross: "CENTER" }); add(wrap, row);
    add(row, await T(n, "Data/Value", "text/muted", { w: 220 }));
    add(row, await T(n.startsWith("Display/Wordmark") ? "RI360" : n.startsWith("Data") ? "1:34:03.1 · NOR · SC 7" : "São Paulo Grand Prix", n));
  }
  add(wrap, await T("Motion tokens", "Display/Section"));
  add(wrap, await T("press 90ms · fast 160ms (tabs, fades) · base 240ms (segments, chips, switches) · push 360ms · sheet 440ms in / 300ms out · chart 800ms\nstandard cubic-bezier(.2,0,0,1) · enter cubic-bezier(0,0,.2,1) · move cubic-bezier(.32,.72,0,1) · notification spring mass 1, stiffness 300, damping 20", "Data/Value", "text/primary", { w: 1100 }));
}

// ---------------------------------------------------------------- components
const K = {}; // component handles and property keys
function variant(set, props) { const name = Object.entries(props).map(([k, v]) => `${k}=${v}`).join(", "); return set.children.find((c) => c.name === name); }
function showSet(set, x, y, title) { set.x = x; set.y = y; set.layoutMode = "HORIZONTAL"; set.layoutWrap = "WRAP"; set.itemSpacing = 16; set.counterAxisSpacing = 16; set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 16; set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO"; set.fills = []; set.strokes = [{ type: "SOLID", color: hex("#948a76") }]; set.dashPattern = [6, 4]; set.strokeWeight = 1; set.description = title; }
function place(node, page, x, y) { page.appendChild(node); node.x = x; node.y = y; }

async function components(page) {
  await figma.setCurrentPageAsync(page);
  let y = 40;

  // Status bar
  {
    const c = C("Status bar", { dir: "HORIZONTAL", w: 390, h: 54, pad: [14, 30, 0, 34], align: "SPACE_BETWEEN", cross: "CENTER", fill: "surface/page" });
    add(c, await T("9:41", "UI/Nav title", "text/primary", { name: "Time" }));
    add(c, icon("Signal, wi-fi, battery", SVG.status, "text/primary", 70, 13));
    place(c, page, 40, y); c.description = "iOS status bar. Fixed when scrolling."; K.status = c; y += 100;
  }
  // Nav bar
  {
    const parts = [];
    for (const state of ["Expanded", "Collapsed"]) {
      const c = C(`State=${state}`, { dir: "HORIZONTAL", w: 390, h: 44, pad: [0, 12, 0, 12], cross: "CENTER", fill: "surface/page" });
      if (state === "Collapsed") stroke(c, "line/subtle", 1, "b");
      const left = F("Left", { dir: "HORIZONTAL", w: 110, h: 44, cross: "CENTER" }); add(c, left);
      const back = F("Back", { dir: "HORIZONTAL", gap: 2, cross: "CENTER", pad: [8, 4, 8, 0] }); add(left, back);
      add(back, icon("chevron", SVG.back, "race-red/base", 21));
      add(back, await T("Races", "UI/Row title", "race-red/base", { name: "Back label" }));
      const title = await T("Race", "UI/Nav title", "text/primary", { name: "Title", align: "CENTER" });
      add(c, title, { fill: "h" }); title.opacity = state === "Collapsed" ? 1 : 0;
      const right = F("Right", { dir: "HORIZONTAL", w: 110, h: 44, cross: "CENTER", align: "MAX" }); add(c, right);
      const act = F("Action", { dir: "HORIZONTAL", w: 36, h: 36, r: 8, stroke: "line/subtle", align: "CENTER", cross: "CENTER" }); add(right, act);
      add(act, icon("share", SVG.share, "text/primary", 18));
      parts.push(c);
    }
    const set = figma.combineAsVariants(parts, page); set.name = "Nav bar";
    K.navTitle = set.addComponentProperty("Title", "TEXT", "Race");
    K.navBack = set.addComponentProperty("Back label", "TEXT", "Races");
    K.navShowBack = set.addComponentProperty("Show back", "BOOLEAN", true);
    K.navShowAction = set.addComponentProperty("Show action", "BOOLEAN", true);
    for (const v of set.children) {
      v.findOne((n) => n.name === "Title").componentPropertyReferences = { characters: K.navTitle };
      v.findOne((n) => n.name === "Back label").componentPropertyReferences = { characters: K.navBack };
      const back = v.findOne((n) => n.name === "Back"); back.componentPropertyReferences = { visible: K.navShowBack };
      v.findOne((n) => n.name === "Action").componentPropertyReferences = { visible: K.navShowAction };
      await react(back, click, { type: "BACK" });
    }
    showSet(set, 40, y, "Expanded: large title visible below, compact title hidden. Collapsed: shown after scrolling 40pt. Back plays the push in reverse.");
    K.nav = set; y += 160;
  }
  // Tab bar
  {
    const tabs = [["Overview", "home"], ["Races", "races"], ["Lab", "lab"], ["Seasons", "seasons"], ["More", "more"]];
    const parts = [];
    for (const [active] of tabs) {
      const c = C(`Active=${active}`, { dir: "HORIZONTAL", w: 390, h: 88, pad: [8, 6, 34, 6], fill: "surface/card", stroke: "line/subtle", sides: "t" });
      for (const [label, ic] of tabs) {
        const tok = label === active ? "race-red/base" : "text/muted";
        const it = F(`Tab/${label}`, { dir: "VERTICAL", gap: 4, pad: [2, 0, 0, 0], cross: "CENTER" }); add(c, it, { fill: "hv" });
        add(it, icon(ic, SVG[ic], tok, 24)); add(it, await T(label, "UI/Tab label", tok));
      }
      add(c, rect("Home indicator", 134, 5, "text/primary", 4), { abs: { x: 128, y: 75 } });
      parts.push(c);
    }
    const set = figma.combineAsVariants(parts, page); set.name = "Tab bar";
    showSet(set, 40, y, "Bottom tab bar. Each tab dissolves to its screen in 160ms (wired by the builder)."); K.tab = set; y += 440;
  }
  // Tyre badge
  {
    const parts = [];
    for (const c of ["S", "M", "H", "I", "W"]) {
      const comp = C(`Compound=${c}`, { dir: "HORIZONTAL", w: 20, h: 20, r: 999, stroke: TYRE_TOKEN[c], strokeW: 2, align: "CENTER", cross: "CENTER" });
      add(comp, await T(c, "Data/Tag", TYRE_TOKEN[c], { name: "Letter" }));
      parts.push(comp);
    }
    const set = figma.combineAsVariants(parts, page); set.name = "Tyre badge"; showSet(set, 40, y, "Pirelli compound ring with its letter."); K.tyre = set; y += 90;
  }
  // Chip
  {
    const parts = [];
    for (const state of ["Default", "Selected"]) for (const dot of ["None", "Focus", "Compare"]) {
      const sel = state === "Selected";
      const c = C(`State=${state}, Dot=${dot}`, { dir: "HORIZONTAL", gap: 6, pad: [9, 12, 9, 12], cross: "CENTER", r: 999, stroke: sel ? "text/primary" : "line/subtle", fill: sel ? "text/primary" : undefined });
      if (dot !== "None") { const d = figma.createEllipse(); d.name = "Dot"; d.resize(8, 8); d.fills = [paint(dot === "Focus" ? "race-red/base" : "petrol/base")]; add(c, d); }
      if (sel) add(c, await T("✓", "Data/Chip", "surface/page", { name: "Check" }));
      add(c, await T("NOR", "Data/Chip", sel ? "surface/page" : "text/muted", { name: "Label" }));
      parts.push(c);
    }
    const set = figma.combineAsVariants(parts, page); set.name = "Chip";
    K.chipLabel = set.addComponentProperty("Label", "TEXT", "NOR");
    for (const v of set.children) v.findOne((n) => n.name === "Label").componentPropertyReferences = { characters: K.chipLabel };
    for (const dot of ["None", "Focus", "Compare"]) {
      const a = variant(set, { State: "Default", Dot: dot }), b = variant(set, { State: "Selected", Dot: dot });
      await react(a, click, changeTo(b)); await react(b, click, changeTo(a));
    }
    showSet(set, 40, y, "Interactive: tap toggles Selected (Smart animate 240ms)."); K.chip = set; y += 140;
  }
  // Switch
  {
    const parts = [];
    for (const on of ["True", "False"]) {
      const c = C(`On=${on}`, { w: 50, h: 30, r: 999, fill: on === "True" ? "tyre/inter" : "line/strong" });
      const knob = figma.createEllipse(); knob.name = "Knob"; knob.resize(24, 24); knob.fills = [white()];
      knob.effects = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: "NORMAL" }];
      c.appendChild(knob); knob.x = on === "True" ? 23 : 3; knob.y = 3; parts.push(c);
    }
    const set = figma.combineAsVariants(parts, page); set.name = "Switch";
    const a = variant(set, { On: "True" }), b = variant(set, { On: "False" });
    await react(a, click, changeTo(b)); await react(b, click, changeTo(a));
    showSet(set, 40, y, "Interactive: knob slides 20pt in 240ms."); K.sw = set; y += 90;
  }
  // Button
  {
    const parts = [];
    for (const st of ["Primary", "Ghost"]) {
      const p = st === "Primary";
      const c = C(`Style=${st}`, { dir: "HORIZONTAL", w: 350, h: p ? 52 : 44, r: 14, align: "CENTER", cross: "CENTER", fill: p ? "race-red/base" : undefined, stroke: p ? undefined : "line/subtle" });
      add(c, await T("Continue", "UI/Button", p ? "text/on-red" : "text/primary", { name: "Label" }));
      parts.push(c);
    }
    const set = figma.combineAsVariants(parts, page); set.name = "Button";
    K.btnLabel = set.addComponentProperty("Label", "TEXT", "Continue");
    for (const v of set.children) v.findOne((n) => n.name === "Label").componentPropertyReferences = { characters: K.btnLabel };
    showSet(set, 40, y, "Primary: race red. Ghost: outline. Press: scale 97.5%."); K.btn = set; y += 110;
  }
  // Stat tile
  {
    const c = C("Stat tile", { dir: "VERTICAL", gap: 4, pad: [12, 14, 12, 14], w: 140, fill: "surface/card", stroke: "line/subtle", r: 14 });
    add(c, await T("Laps analysed", "UI/Label", "text/muted", { name: "Label" }), { fill: "h" });
    add(c, await T("172,337", "Data/Big", "text/primary", { name: "Value" }));
    K.statLabel = c.addComponentProperty("Label", "TEXT", "Laps analysed"); K.statValue = c.addComponentProperty("Value", "TEXT", "172,337");
    c.findOne((n) => n.name === "Label").componentPropertyReferences = { characters: K.statLabel };
    c.findOne((n) => n.name === "Value").componentPropertyReferences = { characters: K.statValue };
    place(c, page, 40, y); K.stat = c; y += 100;
  }
  // Race row
  {
    const c = C("Race row", { dir: "HORIZONTAL", w: 390, gap: 12, pad: [14, 20, 14, 20], cross: "CENTER", fill: "surface/page", stroke: "line/subtle", sides: "b" });
    add(c, await T("20", "Display/Round", "text/muted", { name: "Round", w: 28 }));
    const mid = F("Text", { dir: "VERTICAL", gap: 3 }); add(c, mid, { fill: "h" });
    add(mid, await T("São Paulo", "UI/Row title", "text/primary", { name: "Name" }), { fill: "h" });
    const meta = F("Meta row", { dir: "HORIZONTAL", gap: 8, cross: "CENTER" }); add(mid, meta);
    add(meta, await T("São Paulo · Nov 8", "UI/Small", "text/muted", { name: "Meta" }));
    const sc = F("SC tag", { dir: "HORIZONTAL", pad: [4, 6, 4, 6], r: 4, fill: "podium/base" }); add(meta, sc);
    add(sc, await T("SC 7", "Data/Tag", "hero/surface", { name: "SC label" }));
    const wet = F("WET tag", { dir: "HORIZONTAL", pad: [4, 6, 4, 6], r: 4, fill: "tyre/wet" }); add(meta, wet);
    add(wet, await T("WET", "Data/Tag", "hero/text"));
    const right = F("Winner", { dir: "HORIZONTAL", gap: 8, cross: "CENTER" }); add(c, right);
    const pill = F("Pill", { dir: "HORIZONTAL", pad: [3, 6, 3, 6], r: 4, fill: "text/primary" }); add(right, pill);
    add(pill, await T("NOR", "Data/Chip", "surface/page", { name: "Winner code" }));
    add(right, icon("chevron", SVG.chev, "text/muted", 14));
    const props = { Round: "20", Name: "São Paulo", Meta: "São Paulo · Nov 8", "Winner code": "NOR", "SC label": "SC 7" };
    K.row = {};
    for (const [layer, def] of Object.entries(props)) { K.row[layer] = c.addComponentProperty(layer, "TEXT", def); c.findOne((n) => n.name === layer).componentPropertyReferences = { characters: K.row[layer] }; }
    K.row.sc = c.addComponentProperty("Show SC", "BOOLEAN", true); sc.componentPropertyReferences = { visible: K.row.sc };
    K.row.wet = c.addComponentProperty("Show WET", "BOOLEAN", true); wet.componentPropertyReferences = { visible: K.row.wet };
    place(c, page, 40, y); c.description = "One race in the archive list. Tap pushes the race screen."; K.raceRow = c; y += 110;
  }
  // Segmented control (library version, interactive)
  {
    const parts = [];
    for (const sel of [1, 2, 3]) {
      const c = C(`Selected=${sel}`, { w: 350, h: 36, r: 8, fill: "surface/sunken" });
      const ind = rect("Indicator", 114.67, 30, "surface/card", 8); c.appendChild(ind); ind.x = 3 + (sel - 1) * 114.67; ind.y = 3;
      ind.effects = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: "NORMAL" }];
      for (let i = 1; i <= 3; i++) {
        const it = F(`Item ${i}`, { dir: "HORIZONTAL", w: 114.67, h: 30, align: "CENTER", cross: "CENTER" }); c.appendChild(it); it.x = 3 + (i - 1) * 114.67; it.y = 3;
        add(it, await T(["Trace", "Strategy", "Results"][i - 1], "UI/Button", i === sel ? "text/primary" : "text/muted", { name: `Label ${i}` }));
      }
      parts.push(c);
    }
    const set = figma.combineAsVariants(parts, page); set.name = "Segmented control";
    K.seg = [];
    for (let i = 1; i <= 3; i++) { K.seg[i] = set.addComponentProperty(`Label ${i}`, "TEXT", ["Trace", "Strategy", "Results"][i - 1]); for (const v of set.children) v.findOne((n) => n.name === `Label ${i}`).componentPropertyReferences = { characters: K.seg[i] }; }
    for (const v of set.children) for (let i = 1; i <= 3; i++) { const dest = variant(set, { Selected: i }); if (dest !== v) await react(v.findOne((n) => n.name === `Item ${i}`), click, changeTo(dest)); }
    showSet(set, 40, y, "Interactive: the indicator slides to the tapped item (Smart animate 240ms)."); K.segSet = set; y += 120;
  }
}
const inst = (set, props) => variant(set, props).createInstance();

// ---------------------------------------------------------------- screen scaffolding
const W = 390, H = 844;
async function screen(name, o = {}) {
  STAGE = name;
  const f = F(name, { w: W, h: H, fill: o.dark ? "hero/surface" : "surface/page", clip: true });
  const top = o.nav === false ? 54 : 98;
  const body = F("Body", { dir: "VERTICAL", w: W, gap: 0, pad: [0, 0, o.tab ? 120 : 48, 0] });
  f.appendChild(body); body.x = 0; body.y = top;
  let fixed = 0;
  if (!o.dark) { const s = K.status.createInstance(); f.appendChild(s); s.x = 0; s.y = 0; fixed++; }
  if (o.nav !== false) {
    const n = inst(K.nav, { State: o.collapsed ? "Collapsed" : "Expanded" }); n.name = "Nav bar"; f.appendChild(n); n.x = 0; n.y = 54;
    const props = { [K.navTitle]: o.title || "RI360", [K.navShowBack]: !!o.back, [K.navShowAction]: !!o.action };
    if (o.back) props[K.navBack] = o.back;
    n.setProperties(props);
    fixed++;
  }
  if (o.tab) { const t = inst(K.tab, { Active: o.tab }); t.name = "Tab bar"; f.appendChild(t); t.x = 0; t.y = H - 88; fixed++; }
  else { const hi = rect("Home indicator", 134, 5, o.dark ? "hero/text" : "text/primary", 4); f.appendChild(hi); hi.x = 128; hi.y = H - 13; fixed++; }
  f.numberOfFixedChildren = fixed;
  f.overflowDirection = "VERTICAL";
  return { f, body };
}
function addFixed(f, node, x, y, before = 0) {
  // insert a fixed (non-scrolling) layer; `before` = how many existing top layers stay above it
  f.insertChild(f.children.length - before, node); node.x = x; node.y = y; f.numberOfFixedChildren = f.numberOfFixedChildren + 1;
}
const padRow = (name, gap = 0, dir = "HORIZONTAL", o = {}) => F(name, { dir, gap, pad: [0, 20, 0, 20], ...o });
async function largeTitle(body, kicker, title, lede, titleName) {
  const b = F("Large title", { dir: "VERTICAL", gap: 4, pad: [4, 20, 16, 20] }); add(body, b, { fill: "h" });
  if (kicker) add(b, await T(kicker, "UI/Kicker", "race-red/base"), { fill: "h" });
  add(b, await T(title, "Display/Large title", "text/primary", { name: titleName || "Title" }), { fill: "h" });
  if (lede) add(b, await T(lede, "UI/Body", "text/muted"), { fill: "h" });
}
async function secHead(body, title, action) {
  const r = F(`Section · ${title}`, { dir: "HORIZONTAL", pad: [20, 20, 10, 20], align: "SPACE_BETWEEN", cross: "MAX" }); add(body, r, { fill: "h" });
  add(r, await T(title, "Display/Section"));
  let a = null; if (action) { a = await T(action, "UI/Button", "race-red/base", { name: `Action · ${action}` }); add(r, a); }
  return a;
}
function hscroll(name, gap = 10, pad = [0, 20, 4, 20]) { const s = F(name, { dir: "HORIZONTAL", gap, pad, w: W, clip: true }); s.overflowDirection = "HORIZONTAL"; return s; }
function card(name, o = {}) { return F(name, { dir: "VERTICAL", gap: 6, pad: [12, 12, 12, 12], fill: "surface/card", stroke: "line/subtle", r: 14, ...o }); }
async function tyres(parent, seq) { for (const c of seq) add(parent, inst(K.tyre, { Compound: c })); }
function stintBar(name, stints, total, width) {
  const bar = F(name, { dir: "HORIZONTAL", gap: 2, w: width, h: 10, r: 4, clip: true });
  stints.forEach(([c, n], i) => { const r = rect(`stint-${i + 1}`, Math.max(2, (n / total) * (width - 2 * (stints.length - 1))), 10, TYRE_TOKEN[c]); if (c === "H") r.fills = [paint("surface/card")], stroke(r, "line/strong"); bar.appendChild(r); });
  return bar;
}
function chip(label, state = "Default", dot = "None") { const c = inst(K.chip, { State: state, Dot: dot }); c.setProperties({ [K.chipLabel]: label }); return c; }
function button(label, style = "Primary") { const b = inst(K.btn, { Style: style }); b.setProperties({ [K.btnLabel]: label }); return b; }
async function facts(body, list) {
  const g = F("Facts", { dir: "HORIZONTAL", gap: 16, rowGap: 14, wrap: true, w: 350 });
  const w = F("Facts wrap", { dir: "HORIZONTAL", pad: [4, 20, 18, 20] }); add(body, w, { fill: "h" }); add(w, g);
  for (const [k, v] of list) { const c = F(k, { dir: "VERTICAL", gap: 2, w: 167 }); add(g, c); add(c, await T(k, "UI/Label", "text/muted"), { fill: "h" }); add(c, await T(v, "Data/Value"), { fill: "h" }); }
}
async function segmented(body, labels, sel, name = "Segment") {
  const wrap = F(`${name} wrap`, { dir: "HORIZONTAL", pad: [8, 20, 12, 20] }); add(body, wrap, { fill: "h" });
  const s = F(name, { w: 350, h: 36, r: 8, fill: "surface/sunken" }); add(wrap, s);
  const iw = (350 - 6) / labels.length;
  const ind = rect("seg-indicator", iw, 30, "surface/card", 8); s.appendChild(ind); ind.x = 3 + sel * iw; ind.y = 3;
  ind.effects = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: "NORMAL" }];
  const items = [];
  for (let i = 0; i < labels.length; i++) {
    const it = F(`seg-${labels[i]}`, { dir: "HORIZONTAL", w: iw, h: 30, align: "CENTER", cross: "CENTER" }); s.appendChild(it); it.x = 3 + i * iw; it.y = 3;
    add(it, await T(labels[i], "UI/Button", i === sel ? "text/primary" : "text/muted", { name: `seg-label-${i}` })); items.push(it);
  }
  return items;
}
async function sheet(title, sub) {
  const s = F("sheet", { dir: "VERTICAL", gap: 0, w: W, pad: [8, 0, 40, 0], fill: "surface/card" });
  for (const f of ["topLeftRadius", "topRightRadius"]) bindNum(s, f, 22, RADIUS_BY_VALUE);
  await s.setEffectStyleIdAsync(STY.sheet.id);
  const g = F("Grabber row", { dir: "HORIZONTAL", align: "CENTER", pad: [0, 0, 12, 0] }); add(s, g, { fill: "h" });
  add(g, rect("Grabber", 40, 5, "line/strong", 4));
  const h = F("Head", { dir: "VERTICAL", gap: 6, pad: [0, 20, 14, 20] }); add(s, h, { fill: "h" });
  add(h, await T(title, "Display/Sheet title"), { fill: "h" }); add(h, await T(sub, "UI/Small", "text/muted"), { fill: "h" });
  return s;
}
function scrim() { const r = figma.createRectangle(); r.name = "scrim"; r.resize(W, H); r.fills = [black(0.4)]; return r; }

// ---------------------------------------------------------------- screens
const S = {};
async function buildScreens(page) {
  await figma.setCurrentPageAsync(page);

  // 01 Splash
  {
    const { f, body } = await screen("01 Splash", { dark: true, nav: false });
    const sb = F("Status bar (light)", { dir: "HORIZONTAL", w: W, h: 54, pad: [14, 30, 0, 34], align: "SPACE_BETWEEN", cross: "CENTER" });
    add(sb, await T("9:41", "UI/Nav title", "hero/text")); add(sb, icon("status", SVG.status, "hero/text", 70, 13));
    addFixed(f, sb, 0, 0);
    body.primaryAxisAlignItems = "CENTER"; body.counterAxisAlignItems = "CENTER"; body.itemSpacing = 18; body.resize(W, 690); body.primaryAxisSizingMode = "FIXED";
    const wm = await T("RI360", "Display/Wordmark", "hero/text", { name: "Wordmark" }); wm.setRangeFills(2, 5, [paint("race-red/base")]); add(body, wm);
    const line = icon("Race line", '<svg width="240" height="40" viewBox="0 0 240 40" fill="none"><path d="M2 30 C40 30 50 8 80 10 S120 34 150 26 S200 6 238 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>', "race-red/base", 240, 40);
    add(body, line);
    add(body, await T("EVERY LAP SINCE 2019", "Data/Value", "hero/muted"));
    S.splash = f;
  }
  // 02 Onboarding
  {
    const { f, body } = await screen("02 Onboarding · Pick drivers", { nav: false });
    await largeTitle(body, "Step 1 of 2 · Welcome", "Pick your drivers", "We'll put them first on the overview and tell you when their race has been analysed.");
    const g = F("Driver grid", { dir: "HORIZONTAL", gap: 8, rowGap: 8, wrap: true, w: 350 }); const gw = padRow("Driver grid wrap"); add(body, gw, { fill: "h" }); add(gw, g);
    for (const c of ["NOR", "VER", "HAD", "RUS", "ANT", "PIA", "LAW", "LEC", "HAM", "HUL", "ALO", "GAS", "SAI", "ALB", "BEA"]) { const ch = chip(c, c === "NOR" || c === "LEC" ? "Selected" : "Default"); add(g, ch); }
    const cw = F("Notify wrap", { dir: "HORIZONTAL", pad: [22, 20, 8, 20] }); add(body, cw, { fill: "h" });
    const c = card("Notify card", { dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER", pad: [12, 14, 12, 14] }); add(cw, c, { fill: "h" });
    add(c, await T("Notify me after each race", "UI/Body")); add(c, inst(K.sw, { On: "True" }));
    const n = padRow("Note", 0, "HORIZONTAL", { pad: [4, 20, 28, 20] }); add(body, n, { fill: "h" }); add(n, await T("You can change this any time in More. RI360 never collects personal data.", "UI/Small", "text/muted"), { fill: "h" });
    const bw = F("Buttons", { dir: "VERTICAL", gap: 10, pad: [0, 20, 0, 20] }); add(body, bw, { fill: "h" });
    S.onbContinue = button("Continue"); S.onbContinue.name = "Continue button"; add(bw, S.onbContinue, { fill: "h" });
    S.onbSkip = button("Skip", "Ghost"); S.onbSkip.name = "Skip button"; add(bw, S.onbSkip, { fill: "h" });
    S.onboard = f;
  }
  // 03 Overview
  async function overview(name) {
    const { f, body } = await screen(name, { title: "Overview", tab: "Overview" });
    await largeTitle(body, "8 seasons · 172,337 laps", "Overview");
    const hw = padRow("Hero wrap"); add(body, hw, { fill: "h" });
    const hero = F("Latest race card", { dir: "VERTICAL", gap: 12, pad: [18, 18, 18, 18], r: 18, fill: "hero/surface" }); add(hw, hero, { fill: "h" });
    add(hero, await T("Latest · Round 20 · Analysed", "UI/Kicker", "hero/accent"), { fill: "h" });
    add(hero, await T("São Paulo Grand Prix", "Display/Hero", "hero/text", { name: "race-title", w: 260 }));
    const row = F("Facts", { dir: "HORIZONTAL", gap: 18 }); add(hero, row);
    for (const [k, v] of [["Winner", "NOR · from P3"], ["Rain", "36% of laps"]]) { const c = F(k, { dir: "VERTICAL", gap: 2 }); add(row, c); add(c, await T(k, "UI/Label", "hero/muted")); add(c, await T(v, "Data/Value", "hero/text")); }
    const tr = F("Strategy", { dir: "HORIZONTAL", gap: 6, cross: "CENTER" }); add(hero, tr); await tyres(tr, "ISSI"); add(tr, await T("Winning strategy", "UI/Label", "hero/muted"));
    const go1 = F("Open", { dir: "HORIZONTAL", w: 32, h: 32, r: 999, fill: "hero/accent", align: "CENTER", cross: "CENTER" }); add(go1, icon("arrow", SVG.arrow, "hero/surface", 16)); add(hero, go1, { abs: { x: 0, y: 16 } }); go1.x = 350 - 16 - 32;
    await secHead(body, "Your drivers", "Edit");
    const fav = hscroll("Your drivers"); add(body, fav);
    const favCards = [];
    for (const [c, t, l, w] of [["NOR", "McLaren", "P1 · São Paulo", "3 wins in 2026"], ["LEC", "Ferrari", "P8 · São Paulo", "1 win in 2026"]]) {
      const k = card(`Driver · ${c}`, { w: 150 }); add(fav, k); favCards.push(k);
      const pill = F("Number", { dir: "HORIZONTAL", pad: [3, 6, 3, 6], r: 4, fill: "text/primary" }); add(k, pill); add(pill, await T(NUMS[c], "Data/Chip", "surface/page"));
      add(k, await T(c, "Display/Driver code")); add(k, await T(t, "UI/Small", "text/muted")); add(k, await T(l, "Data/Value")); add(k, await T(w, "Data/Value", "race-red/base"));
    }
    await secHead(body, "By the numbers");
    const tick = hscroll("Ticker"); add(body, tick);
    for (const [k, v] of [["Laps analysed", "172,337"], ["Grands Prix", "157"], ["Pit stops", "5,558"], ["Laps under SC/VSC", "731"], ["Models fitted", "151"], ["Timing match", "100%"]]) { const s = K.stat.createInstance(); s.setProperties({ [K.statLabel]: k, [K.statValue]: v }); add(tick, s); }
    await secHead(body, "What the laps say", "Method");
    const car = hscroll("Findings carousel", 12); add(body, car);
    for (const [k, big, h, p] of [["Pit lane · 32 circuits", "28.9s", "Imola charges 29s a stop. Monaco barely 19.", "Median green-flag pit loss by circuit, dry races only."], ["Tyres · 289 stint fits", "1.2×", "A soft costs 1.2× more per lap of age than a hard.", "0.056s vs 0.045s per lap, after fuel and driver pace."], ["2026 season", "9/20", "wins for Kimi Antonelli, the season's pace benchmark.", "He led 451 laps. Next best: 0.38% slower in clean air."], ["Data quality", "14.0%", "of the exported lap table was the same lap twice.", "27,986 duplicates dropped; 94,490 laps cross-checked."]]) {
      const c = card(`Finding · ${k}`, { w: 300, gap: 8, pad: [16, 16, 16, 16] }); add(car, c);
      add(c, await T(k, "UI/Label", "text/muted"), { fill: "h" }); add(c, await T(big, "Display/Big stat", "race-red/base")); add(c, await T(h, "UI/Row title"), { fill: "h" }); add(c, await T(p, "UI/Small", "text/muted"), { fill: "h" });
    }
    const dots = F("Page dots", { dir: "HORIZONTAL", gap: 6, pad: [8, 0, 0, 0], align: "CENTER" }); add(body, dots, { fill: "h" });
    add(dots, rect("dot-active", 18, 6, "race-red/base", 4)); for (let i = 0; i < 3; i++) add(dots, rect("dot", 6, 6, "line/strong", 4));
    return { f, body, hero, favCards };
  }
  const ov = await overview("03 Overview"); S.home = ov.f; S.hero = ov.hero; S.favCards = ov.favCards;

  // 04 Overview · offline + refreshing
  {
    const o = await overview("04 Overview · Offline + refresh");
    const ring = icon("Refresh ring", '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 3a11 11 0 1 1-10.4 7.4" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>', "tyre/soft", 28);
    const rw = F("Pull to refresh", { dir: "HORIZONTAL", h: 56, align: "CENTER", cross: "CENTER" }); rw.appendChild(ring); o.body.insertChild(0, rw); rw.layoutSizingHorizontal = "FILL";
    const bw = F("Offline wrap", { dir: "HORIZONTAL", pad: [0, 20, 14, 20] });
    const b = F("Offline banner", { dir: "HORIZONTAL", gap: 8, pad: [10, 12, 10, 12], r: 8, fill: "race-red/tint", cross: "CENTER" });
    b.appendChild(icon("wifi off", SVG.wifi, "text/primary", 16)); bw.appendChild(b); b.appendChild(await T("You're offline. Showing data saved on 8 Nov.", "UI/Small"));
    o.body.insertChild(1, bw); bw.layoutSizingHorizontal = "FILL"; b.layoutSizingHorizontal = "FILL";
    S.offline = o.f;
  }
  // 16a/16b notification
  async function banner() {
    const b = F("notification", { dir: "HORIZONTAL", gap: 10, w: 370, pad: [12, 14, 12, 14], r: 22, fill: "surface/card", cross: "CENTER" });
    await b.setEffectStyleIdAsync(STY.banner.id);
    const ic = F("App icon", { dir: "HORIZONTAL", w: 38, h: 38, r: 8, fill: "race-red/base", align: "CENTER", cross: "CENTER" }); add(b, ic); add(ic, icon("bell", SVG.bell, "text/on-red", 20));
    const tx = F("Text", { dir: "VERTICAL", gap: 2 }); add(b, tx, { fill: "h" });
    add(tx, await T("RI360 · São Paulo GP analysed", "UI/Nav title"), { fill: "h" }); add(tx, await T("Norris won from P3 on inters-slicks-inters. See the race trace →", "UI/Small", "text/muted"), { fill: "h" });
    add(b, await T("now", "UI/Small", "text/muted"));
    return b;
  }
  {
    const a = await overview("16a Notification · before"); addFixed(a.f, await banner(), 10, -140);
    const b = await overview("16b Notification · shown"); addFixed(b.f, await banner(), 10, 58);
    S.notifA = a.f; S.notifB = b.f;
  }

  // 05 Races
  async function racesScreen(name, loading) {
    const { f, body } = await screen(name, { title: "Races", tab: "Races" });
    await largeTitle(body, "Race archive", "Races");
    const yc = hscroll("Season chips", 8, [0, 20, 12, 20]); add(body, yc);
    for (const y of [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]) add(yc, chip(String(y), y === 2026 ? "Selected" : "Default"));
    const sw = padRow("Search wrap", 0, "HORIZONTAL", { pad: [0, 20, 12, 20] }); add(body, sw, { fill: "h" });
    const se = F("Search", { dir: "HORIZONTAL", gap: 8, pad: [10, 12, 10, 12], r: 8, fill: "surface/sunken", cross: "CENTER" }); add(sw, se, { fill: "h" });
    add(se, icon("search", SVG.search, "text/muted", 16)); add(se, await T("Search circuits, winners…", "UI/Body", "text/muted"));
    const list = F("Race list", { dir: "VERTICAL" }); add(body, list, { fill: "h" });
    const rows = [];
    if (loading) {
      for (let i = 0; i < 8; i++) {
        const r = F("Skeleton row", { dir: "HORIZONTAL", gap: 12, pad: [14, 20, 14, 20], cross: "CENTER", stroke: "line/subtle", sides: "b" }); add(list, r, { fill: "h" });
        add(r, rect("bone", 28, 24, "surface/sunken", 8)); const m = F("lines", { dir: "VERTICAL", gap: 6 }); add(r, m, { fill: "h" });
        add(m, rect("bone", 200, 15, "surface/sunken", 8)); add(m, rect("bone", 130, 11, "surface/sunken", 8)); add(r, rect("bone", 44, 22, "surface/sunken", 8));
      }
    } else {
      for (const [r, n, loc, d, w, sc, wet] of RACES.slice().reverse()) {
        const row = K.raceRow.createInstance();
        row.setProperties({ [K.row.Round]: String(r).padStart(2, "0"), [K.row.Name]: n, [K.row.Meta]: `${loc} · ${d}`, [K.row["Winner code"]]: w, [K.row["SC label"]]: `SC ${sc}`, [K.row.sc]: sc > 0, [K.row.wet]: !!wet });
        add(list, row, { fill: "h" }); rows.push(row);
      }
    }
    return { f, rows };
  }
  { const r = await racesScreen("05 Races"); S.races = r.f; S.raceRows = r.rows; }
  { const r = await racesScreen("06 Races · Loading", true); S.racesLoading = r.f; }

  // 07/08/09 Race
  async function raceScreen(name, tab) {
    const { f, body } = await screen(name, { title: "São Paulo GP", back: "Races", action: true, tab: "Races" });
    await largeTitle(body, "Round 20 · Interlagos · 8 Nov 2026", "São Paulo Grand Prix", "Norris won from P3 on an inter-slick-slick-inter strategy, with Verstappen up 11 places to second.", "race-title");
    await facts(body, [["Laps", "71"], ["Winner", "NOR · McLaren"], ["Fastest lap", "ANT 1:12.689"], ["Pit loss", "33.9s"], ["Rain", "36% of laps"], ["Neutralised", "None"]]);
    const items = await segmented(body, ["Trace", "Strategy", "Results"], ["trace", "strategy", "results"].indexOf(tab));
    const panel = F("Panel", { dir: "VERTICAL", gap: 10 }); add(body, panel, { fill: "h" });
    let compareChip = null;
    if (tab === "trace") {
      const lg = padRow("Legend", 14); add(panel, lg, { fill: "h" });
      for (const [c, tok] of [["NOR", "race-red/base"], ["VER", "petrol/base"]]) { const l = F(c, { dir: "HORIZONTAL", gap: 6, cross: "CENTER" }); add(lg, l); add(l, rect("swatch", 14, 3, tok, 4)); add(l, await T(c, "Data/Chip")); }
      add(lg, await T("gap, seconds", "Data/Axis", "text/muted"));
      const cw = padRow("Chart wrap"); add(panel, cw, { fill: "h" });
      const ch = F("Race trace", { w: 350, h: 190 }); add(cw, ch);
      const lo = -150, hi = 100, X = (i) => 34 + (i / 14) * (350 - 42), Y = (v) => 8 + (1 - (v - lo) / (hi - lo)) * 160;
      for (let v = lo; v <= hi; v += 50) { const g = rect("grid", 350 - 34, 1, "line/subtle"); ch.appendChild(g); g.x = 34; g.y = Y(v); const t = await T(v > 0 ? `+${v}` : String(v), "Data/Axis", "text/muted", { w: 30, align: "RIGHT" }); ch.appendChild(t); t.x = 0; t.y = Y(v) - 6; }
      const band = rect("Pit window", X(3.4) - X(3), 160, "petrol/tint"); ch.appendChild(band); band.x = X(3); band.y = 8; band.opacity = 0.7;
      for (const lap of [1, 25, 50, 71]) { const t = await T(`L${lap}`, "Data/Axis", "text/muted", { w: 30, align: "CENTER" }); ch.appendChild(t); t.x = X(((lap - 1) / 70) * 14) - 15; t.y = 174; }
      for (const [c, tok] of [["VER", "petrol/base"], ["NOR", "race-red/base"]]) {
        const d = TRACE[c].map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
        const ln = figma.createNodeFromSvg(`<svg width="350" height="190" viewBox="0 0 350 190" fill="none"><path d="${d}" stroke="#000000" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`);
        ln.name = `trace-${c}`; ln.fills = []; for (const v of ln.findAll((n) => n.type === "VECTOR")) v.strokes = [paint(tok)];
        ch.appendChild(ln); ln.x = 0; ln.y = 0;
      }
      const chips = padRow("Driver chips", 8); add(panel, chips, { fill: "h" });
      add(chips, chip("NOR", "Default", "Focus")); add(chips, chip("VER", "Default", "Compare"));
      compareChip = chip("Compare drivers", "Default"); add(chips, compareChip); compareChip.name = "Compare button";
      const p = padRow("Explainer"); add(panel, p, { fill: "h" });
      add(p, await T("Lines rise when a driver gains time on a steady reference pace. Both pitted for slicks on laps 16–17 as the track dried, then back to inters for the final rain.", "UI/Small", "text/muted"), { fill: "h" });
    } else if (tab === "strategy") {
      for (const [c, , , p, , st] of SP) {
        const r = padRow(`Strategy · ${c}`, 8, "HORIZONTAL", { cross: "CENTER" }); add(panel, r, { fill: "h" });
        add(r, await T(`P${p}`, "Data/Chip", "text/muted", { w: 34 })); add(r, await T(c, "Data/Chip", "text/primary", { w: 40 }));
        add(r, stintBar(`Stints · ${c}`, st, 71, 260));
      }
      const lg = padRow("Compound key", 12, "HORIZONTAL", { cross: "CENTER", pad: [6, 20, 0, 20] }); add(panel, lg, { fill: "h" });
      for (const c of ["S", "I"]) { const l = F(CNAME[c], { dir: "HORIZONTAL", gap: 6, cross: "CENTER" }); add(lg, l); add(l, inst(K.tyre, { Compound: c })); add(l, await T(CNAME[c], "UI/Small", "text/muted")); }
    } else {
      for (const [c, name, team, p, g, , pace] of SP) {
        const r = F(`Result · ${c}`, { dir: "HORIZONTAL", gap: 8, pad: [11, 0, 11, 0], cross: "CENTER", stroke: "line/subtle", sides: "b" });
        const rw = padRow(`Result row · ${c}`); add(panel, rw, { fill: "h" }); add(rw, r, { fill: "h" });
        add(r, await T(String(p), "Display/Round", "text/primary", { w: 26 }));
        const pill = F("Code", { dir: "HORIZONTAL", pad: [3, 6, 3, 6], r: 4, fill: "text/primary" }); add(r, pill); add(pill, await T(c, "Data/Chip", "surface/page"));
        const mid = F("Name", { dir: "VERTICAL", gap: 1 }); add(r, mid, { fill: "h" });
        add(mid, await T(name, "UI/Row title"), { fill: "h" }); add(mid, await T(`${team} · from P${g}`, "UI/Small", "text/muted"), { fill: "h" });
        add(r, await T(pace, "Data/Value"));
      }
      const p = padRow("Note", 0, "HORIZONTAL", { pad: [8, 20, 0, 20] }); add(panel, p, { fill: "h" }); add(p, await T("Right column: median clean-air lap.", "UI/Small", "text/muted"), { fill: "h" });
    }
    return { f, items, compareChip };
  }
  const rt = await raceScreen("07 Race · Trace", "trace"); S.raceTrace = rt.f; S.traceItems = rt.items; S.compareChip = rt.compareChip;
  const rs = await raceScreen("08 Race · Strategy", "strategy"); S.raceStrat = rs.f; S.stratItems = rs.items;
  const rr = await raceScreen("09 Race · Results", "results"); S.raceRes = rr.f; S.resItems = rr.items;
  // 07b collapsed nav state (for the scroll demo)
  {
    const c = S.raceTrace.clone(); c.name = "07b Race · Trace · Scrolled";
    const nav = c.findOne((n) => n.type === "INSTANCE" && n.name === "Nav bar"); if (nav) nav.setProperties({ State: "Collapsed" });
    const body = c.findOne((n) => n.name === "Body"); if (body) body.y = 98 - 120;
    S.raceScrolled = c;
  }
  // compare sheet: off-screen in 07, raised in 10
  async function compareSheet() {
    const s = await sheet("Compare drivers", "Pick two. Red is the focus driver, petrol the comparison.");
    const g = F("Chips", { dir: "HORIZONTAL", gap: 8, rowGap: 8, wrap: true, w: 350 }); const gw = padRow("Chips wrap", 0, "HORIZONTAL", { pad: [0, 20, 18, 20] }); add(s, gw, { fill: "h" }); add(gw, g);
    for (const [c, , , p] of SP) { const ch = chip(`P${p} ${c}`, c === "NOR" || c === "VER" ? "Selected" : "Default", c === "NOR" ? "Focus" : c === "VER" ? "Compare" : "None"); add(g, ch); }
    const bw = padRow("Button wrap"); add(s, bw, { fill: "h" }); const b = button("Show NOR vs VER"); add(bw, b, { fill: "h" }); b.name = "Close sheet";
    return s;
  }
  { const s = await compareSheet(); addFixed(S.raceTrace, s, 0, H + 20); }
  {
    const c = S.raceTrace.clone(); c.name = "10 Race · Compare sheet";
    const s = c.findOne((n) => n.name === "sheet"); s.y = H - s.height;
    const sc = scrim(); c.insertChild(c.children.length - 1, sc); sc.x = 0; sc.y = 0; c.numberOfFixedChildren = c.numberOfFixedChildren + 1;
    S.compare = c; S.compareScrim = sc; S.compareClose = s.findOne((n) => n.name === "Close sheet");
  }

  // 11 Strategy lab (A = your plan, B = soft first stint)
  async function lab(name, firstCompound) {
    const { f, body } = await screen(name, { title: "Strategy lab", tab: "Lab" });
    body.paddingBottom = 200;
    await largeTitle(body, "Strategy lab", "Re-run the race", "Plan the stints yourself. The fitted pace model predicts every lap.");
    const sel = padRow("Selectors", 10); add(body, sel, { fill: "h" });
    for (const [k, v] of [["Race", "2026 Austin"], ["Driver", "ANT · P1"]]) { const c = card(k, { gap: 4, pad: [10, 12, 10, 12] }); add(sel, c, { fill: "h" }); add(c, await T(k, "UI/Label", "text/muted")); const r = F("Value", { dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER" }); add(c, r, { fill: "h" }); add(r, await T(v, "UI/Nav title")); add(r, icon("down", SVG.down, "text/muted", 14)); }
    const best = await secHead(body, "Your plan", "Best plans");
    const plan = [[firstCompound, 24], ["H", 32]];
    const cmpButtons = {};
    for (let i = 0; i < 2; i++) {
      const w = F(`Stint ${i + 1} wrap`, { dir: "HORIZONTAL", pad: [0, 20, 10, 20] }); add(body, w, { fill: "h" });
      const c = card(`Stint ${i + 1}`, { gap: 10 }); add(w, c, { fill: "h" });
      const top = F("Top", { dir: "HORIZONTAL", align: "SPACE_BETWEEN", cross: "CENTER" }); add(c, top, { fill: "h" });
      add(top, await T(`Stint ${i + 1}`, "UI/Nav title"));
      const st = F("Stepper", { dir: "HORIZONTAL", gap: 10, cross: "CENTER" }); add(top, st);
      for (const [lab2, txt] of [["minus", "−"], ["laps", `${plan[i][1]} laps`], ["plus", "+"]]) {
        if (lab2 === "laps") add(st, await T(txt, "Data/Value", "text/primary", { w: 64, align: "CENTER" }));
        else { const b = F(lab2, { dir: "HORIZONTAL", w: 32, h: 32, r: 8, stroke: "line/subtle", align: "CENTER", cross: "CENTER" }); add(st, b); add(b, await T(txt, "UI/Nav title")); }
      }
      const row = F("Compounds", { dir: "HORIZONTAL", gap: 6 }); add(c, row, { fill: "h" });
      for (const k of ["S", "M", "H"]) {
        const on = plan[i][0] === k;
        const b = F(`stint${i + 1}-${CNAME[k]}`, { dir: "HORIZONTAL", gap: 6, pad: [9, 0, 9, 0], r: 8, align: "CENTER", cross: "CENTER", stroke: on ? "text/primary" : "line/subtle", fill: on ? "surface/sunken" : undefined });
        add(row, b, { fill: "h" }); add(b, inst(K.tyre, { Compound: k })); add(b, await T(CNAME[k], "UI/Button"));
        cmpButtons[`${i}${k}`] = b;
      }
    }
    const bw = padRow("Plan bar", 0, "HORIZONTAL", { pad: [4, 20, 0, 20] }); add(body, bw, { fill: "h" }); add(bw, stintBar("lab-stints", plan, 56, 350));
    const nt = padRow("Note", 0, "HORIZONTAL", { pad: [10, 20, 0, 20] }); add(body, nt, { fill: "h" }); add(nt, await T("Pit loss 21.8s · 56 laps · stint lengths always add up to the race distance.", "UI/Small", "text/muted"), { fill: "h" });
    // result bar (fixed above the tab bar)
    const rb = F("Result bar", { dir: "HORIZONTAL", w: 366, h: 64, pad: [10, 14, 10, 14], r: 14, fill: "text/primary", align: "SPACE_BETWEEN", cross: "CENTER" });
    const tx = F("Text", { dir: "VERTICAL", gap: 2 }); add(rb, tx);
    add(tx, await T("Predicted race time", "UI/Label", "surface/page", { opacity: 0.65 }));
    add(tx, await T(firstCompound === "M" ? "1:34:03.1" : "1:34:00.4", "Data/Big", "surface/page", { name: "pred-time" }));
    const faster = firstCompound !== "M";
    const dl = F("delta", { dir: "HORIZONTAL", pad: [7, 9, 7, 9], r: 8, fill: faster ? "tyre/inter" : "line/strong" }); add(rb, dl);
    add(dl, await T(faster ? "−2.7s" : "±0.0s", "Data/Chip", "hero/text"));
    addFixed(f, rb, 12, H - 88 - 12 - 64, 1);
    return { f, best, cmpButtons };
  }
  const la = await lab("11 Strategy lab", "M"); S.lab = la.f; S.labBest = la.best; S.labButtons = la.cmpButtons;
  const lb = await lab("11b Strategy lab · Soft first stint", "S"); S.labB = lb.f; S.labBButtons = lb.cmpButtons; S.labBBest = lb.best;
  async function bestSheet() {
    const s = await sheet("Fastest plans", "Exhaustive search with the race's own model, two-compound rule applied.");
    for (const [label, time, d, plan] of [["Best one-stop", "1:33:58.9", "−4.2s", [["S", 29], ["H", 27]]], ["Best two-stop", "1:34:05.0", "+1.9s", [["S", 19], ["H", 18], ["H", 19]]]]) {
      const w = padRow(`${label} wrap`, 0, "HORIZONTAL", { pad: [0, 20, 10, 20] }); add(s, w, { fill: "h" });
      const c = card(label, { gap: 10, pad: [14, 14, 14, 14] }); add(w, c, { fill: "h" });
      const top = F("Top", { dir: "HORIZONTAL", align: "SPACE_BETWEEN" }); add(c, top, { fill: "h" });
      add(top, await T(label, "UI/Nav title")); add(top, await T(`${time} · ${d}`, "Data/Value"));
      add(c, stintBar("stints", plan, 56, 320));
      add(c, await T(plan.map(([k, n]) => `${CNAME[k]} ${n}`).join(" → "), "Data/Axis", "text/muted"));
      const b = button("Use this plan", "Ghost"); add(c, b, { fill: "h" }); b.name = "Close sheet";
    }
    return s;
  }
  { const s = await bestSheet(); addFixed(S.lab, s, 0, H + 20); }
  {
    const c = S.lab.clone(); c.name = "12 Strategy lab · Best plans sheet";
    const s = c.findOne((n) => n.name === "sheet"); s.y = H - s.height;
    const sc = scrim(); c.insertChild(c.children.length - 1, sc); sc.x = 0; sc.y = 0; c.numberOfFixedChildren = c.numberOfFixedChildren + 1;
    S.best = c; S.bestScrim = sc; S.bestClose = s.findAll((n) => n.name === "Close sheet");
  }

  // 13 Seasons
  {
    const { f, body } = await screen("13 Seasons", { title: "Seasons", tab: "Seasons" });
    await largeTitle(body, "2026 · 20 rounds", "Seasons");
    const yc = hscroll("Season chips", 8, [0, 20, 12, 20]); add(body, yc);
    for (const y of [2026, 2025, 2024, 2023, 2022]) add(yc, chip(String(y), y === 2026 ? "Selected" : "Default"));
    await segmented(body, ["Finishing position", "Clean-air pace"], 0, "Colour by");
    const hs = hscroll("Heat map", 3, [0, 20, 0, 20]); hs.layoutMode = "VERTICAL"; hs.primaryAxisSizingMode = "AUTO"; hs.counterAxisSizingMode = "FIXED"; add(body, hs);
    const head = F("Rounds", { dir: "HORIZONTAL", gap: 3 }); add(hs, head); add(head, F("spacer", { w: 40, h: 16 }));
    for (let i = 1; i <= 20; i++) add(head, await T(String(i), "Data/Axis", "text/muted", { w: 24, align: "CENTER" }));
    for (const [c, , , , s] of SEASON) {
      const r = F(`Row · ${c}`, { dir: "HORIZONTAL", gap: 3, cross: "CENTER" }); add(hs, r);
      add(r, await T(c, "Data/Chip", "text/primary", { w: 40 }));
      for (const p of s.split(",")) {
        const n = +p, cls = p === "-" ? "dnf" : n === 1 ? "win" : n <= 3 ? "pod" : n <= 10 ? "pts" : "out";
        const fill = { win: "podium/base", pod: "race-red/tint", pts: "petrol/tint", out: "surface/sunken", dnf: undefined }[cls];
        const cell = F(`R${p}`, { dir: "HORIZONTAL", w: 24, h: 24, r: 4, fill, stroke: cls === "dnf" ? "line/subtle" : undefined, align: "CENTER", cross: "CENTER" }); add(r, cell);
        if (p !== "-") add(cell, await T(p, "Data/Tag", cls === "win" ? "hero/surface" : cls === "out" ? "text/muted" : "text/primary"));
      }
    }
    const lg = padRow("Legend", 12, "HORIZONTAL", { pad: [12, 20, 0, 20], cross: "CENTER" }); add(body, lg, { fill: "h" });
    for (const [l, tok] of [["Win", "podium/base"], ["Podium", "race-red/tint"], ["Points", "petrol/tint"]]) { const k = F(l, { dir: "HORIZONTAL", gap: 4, cross: "CENTER" }); add(lg, k); add(k, rect("key", 10, 10, tok, 4)); add(k, await T(l, "UI/Small", "text/muted")); }
    await secHead(body, "Most wins");
    for (const [i, [c, t, w, p]] of SEASON.slice(0, 4).entries()) {
      const rw = padRow(`Wins · ${c}`); add(body, rw, { fill: "h" });
      const r = F("Row", { dir: "HORIZONTAL", gap: 8, pad: [11, 0, 11, 0], cross: "CENTER", stroke: "line/subtle", sides: "b" }); add(rw, r, { fill: "h" });
      add(r, await T(String(i + 1), "Display/Round", "text/primary", { w: 26 }));
      const pill = F("Code", { dir: "HORIZONTAL", pad: [3, 6, 3, 6], r: 4, fill: "text/primary" }); add(r, pill); add(pill, await T(c, "Data/Chip", "surface/page"));
      const m = F("Team", { dir: "VERTICAL" }); add(r, m, { fill: "h" }); add(m, await T(t, "UI/Row title"), { fill: "h" }); add(m, await T(`${p} podiums`, "UI/Small", "text/muted"), { fill: "h" });
      add(r, await T(`${w} wins`, "Data/Value"));
    }
    S.seasons = f;
  }
  // 14 More
  {
    const { f, body } = await screen("14 More", { title: "More", tab: "More" });
    await largeTitle(body, null, "More");
    async function group(title, rows) {
      const g = F(`Group · ${title}`, { dir: "VERTICAL", gap: 8, pad: [0, 20, 18, 20] }); add(body, g, { fill: "h" });
      add(g, await T(title, "UI/Label", "text/muted"));
      const c = F("Card", { dir: "VERTICAL", fill: "surface/card", stroke: "line/subtle", r: 14, clip: true }); add(g, c, { fill: "h" });
      const out = {};
      for (const [label, right, kind] of rows) {
        const r = F(`Row · ${label}`, { dir: "HORIZONTAL", pad: [13, 14, 13, 14], align: "SPACE_BETWEEN", cross: "CENTER", stroke: "line/subtle", sides: "b" }); add(c, r, { fill: "h" });
        add(r, await T(label, "UI/Body"));
        if (kind === "switch") add(r, inst(K.sw, { On: "True" }));
        else if (kind === "seg") { r.remove(); const s = F("Theme", { dir: "HORIZONTAL", gap: 4, pad: [3, 3, 3, 3], r: 8, fill: "surface/sunken" }); const sw = F("Theme wrap", { dir: "HORIZONTAL", pad: [12, 12, 12, 12] }); add(c, sw, { fill: "h" }); add(sw, s, { fill: "h" }); for (const t of ["Paper", "Pit wall", "System"]) { const b = F(`Theme · ${t}`, { dir: "HORIZONTAL", pad: [8, 0, 8, 0], r: 8, align: "CENTER", fill: t === "Paper" ? "surface/card" : undefined }); add(s, b, { fill: "h" }); add(b, await T(t, "UI/Button", t === "Paper" ? "text/primary" : "text/muted")); } continue; }
        else { const rr = F("Right", { dir: "HORIZONTAL", gap: 6, cross: "CENTER" }); add(r, rr); if (right) add(rr, await T(right, "Data/Value", "text/muted")); if (kind === "link") add(rr, icon("chevron", SVG.chev, "text/muted", 14)); }
        out[label] = r;
      }
      return { g, out };
    }
    await group("Appearance", [["Theme", null, "seg"]]);
    const fol = await group("Following", [["Favourite drivers", "NOR, LEC", "link"], ["Race analysed alerts", null, "switch"]]);
    const abt = await group("About the data", [["How it's measured", null, "link"], ["Data updated", "18 Nov 2026"], ["Races on device", "157 · 8.2 MB"]]);
    const leg = await group("Legal", [["Privacy policy", null, "link"], ["Open-source licences", null, "link"]]);
    add(leg.g, await T("RI360 is unofficial and is not associated with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1 and GRAND PRIX are trade marks of Formula One Licensing B.V.", "UI/Small", "text/muted"), { fill: "h" });
    const v = padRow("Version"); add(body, v, { fill: "h" }); add(v, await T("RI360 1.0 (1)", "UI/Small", "text/muted"));
    S.more = f; S.moreFav = fol.out["Favourite drivers"]; S.moreMethod = abt.out["How it's measured"];
  }
  // 15 Method
  {
    const { f, body } = await screen("15 Method", { title: "Method", back: "More", tab: "More" });
    await largeTitle(body, "Method", "How every number is made");
    for (const [n, t, d] of [["01", "Collect", "FastF1 for 2019–2023 and OpenF1 from 2024 pull every race's timing, tyre and weather feeds."], ["02", "Clean", "Duplicate laps dropped, stint ages rebuilt, every lap cross-checked against raw timing. Safety-car laps flagged."], ["03", "Model", "For each race, least squares separates driver pace, fuel burn, compound offset and tyre wear, scored on held-out laps."], ["04", "Ship", "A static data bundle ships inside the app, and new races arrive the morning after they run."]]) {
      const w = padRow(`Step ${n}`, 0, "HORIZONTAL", { pad: [0, 20, 12, 20] }); add(body, w, { fill: "h" });
      const c = card(t, { pad: [14, 14, 14, 14] }); add(w, c, { fill: "h" });
      add(c, await T(n, "Display/Driver code", "race-red/base")); add(c, await T(t, "UI/Nav title")); add(c, await T(d, "UI/Small", "text/muted"), { fill: "h" });
    }
    await secHead(body, "Limits");
    const p = padRow("Limits text"); add(body, p, { fill: "h" });
    add(p, await T("2021 has rounds 1–7 only. Wet races fit poorly because grip changes lap to lap, so their models are marked as low quality.", "UI/Small", "text/muted"), { fill: "h" });
    S.method = f;
  }
  // 02b Favourite drivers (pushed from More: onboarding reused with a back button)
  {
    const c = S.onboard.clone(); c.name = "02b Favourite drivers";
    const nav = inst(K.nav, { State: "Expanded" }); nav.name = "Nav bar"; nav.setProperties({ [K.navTitle]: "Favourites", [K.navBack]: "More", [K.navShowBack]: true, [K.navShowAction]: false });
    addFixed(c, nav, 0, 54);
    const body = c.findOne((n) => n.name === "Body"); if (body) body.y = 98;
    S.favs = c;
  }
}

// ---------------------------------------------------------------- layout + pit wall copies
function rowLayout(page, rows) {
  let y = 0;
  const ids = [];
  for (const [label, frames] of rows) {
    frames.forEach((f, i) => { page.appendChild(f); f.x = i * (W + 80); f.y = y + 70; ids.push(f.id); });
    y += H + 200;
  }
  return ids;
}
async function labels(page, rows) {
  let y = 0;
  for (const [label] of rows) { const t = await T(label, "Display/Large title"); page.appendChild(t); t.x = 0; t.y = y; y += H + 200; }
}
function retheme(frame) {
  if (PIT_MODE) { frame.setExplicitVariableModeForCollection(COLOR_COLL, PIT_MODE); return; }
  const fix = (paints) => paints.map((p) => { const id = p.boundVariables && p.boundVariables.color && p.boundVariables.color.id; const pv = id && PITVAR[id]; return pv ? figma.variables.setBoundVariableForPaint(p, "color", pv) : p; });
  for (const n of [frame, ...frame.findAll(() => true)]) {
    try { if ("fills" in n && Array.isArray(n.fills) && n.fills.length) n.fills = fix(n.fills); } catch (e) { /* mixed fills */ }
    try { if ("strokes" in n && n.strokes.length) n.strokes = fix(n.strokes); } catch (e) { /* ignore */ }
  }
}

// ---------------------------------------------------------------- prototype wiring
async function wire(page) {
  await react(S.splash, { type: "AFTER_TIMEOUT", timeout: 1.2 }, go(S.onboard, TR.fade));
  await react(S.onbContinue, click, go(S.home, TR.fade));
  await react(S.onbSkip, click, go(S.home, TR.fade));
  // tab bar: prototype links must stay on one page, so wire each instance on this page
  const dest = { Overview: S.home, Races: S.races, Lab: S.lab, Seasons: S.seasons, More: S.more };
  for (const bar of page.findAll((n) => n.type === "INSTANCE" && n.name === "Tab bar")) for (const [label, d] of Object.entries(dest)) { const item = bar.findOne((n) => n.name === `Tab/${label}`); if (item) await react(item, click, go(d, TR.tab)); }
  // overview
  for (const home of [S.home, S.offline, S.notifA, S.notifB]) {
    const hero = home.findOne((n) => n.name === "Latest race card"); if (hero) await react(hero, click, go(S.raceTrace, TR.shared));
    for (const c of home.findAll((n) => n.name.startsWith("Driver · "))) await react(c, click, go(S.raceTrace, TR.push));
    const m = home.findOne((n) => n.name === "Action · Method"); if (m) await react(m, click, go(S.method, TR.push));
    const e = home.findOne((n) => n.name === "Action · Edit"); if (e) await react(e, click, go(S.favs, TR.push));
  }
  await react(S.notifA, { type: "AFTER_TIMEOUT", timeout: 1.5 }, go(S.notifB, TR.spring));
  const bn = S.notifB.findOne((n) => n.name === "notification"); if (bn) await react(bn, click, go(S.raceTrace, TR.push));
  // races list
  for (const r of S.raceRows) await react(r, click, go(S.raceTrace, TR.push));
  // race tabs (segmented) and compare sheet
  const raceTabs = [[S.raceTrace, S.traceItems], [S.raceStrat, S.stratItems], [S.raceRes, S.resItems]];
  const targets = [S.raceTrace, S.raceStrat, S.raceRes];
  for (const [, items] of raceTabs) for (let i = 0; i < 3; i++) if (items[i]) await react(items[i], click, go(targets[i], TR.segment));
  await react(S.compareChip, click, go(S.compare, TR.sheet));
  await react(S.compareScrim, click, { type: "BACK" });
  if (S.compareClose) await react(S.compareClose, click, { type: "BACK" });
  const title = S.raceTrace.findOne((n) => n.name === "race-title"); if (title) await react(title, click, go(S.raceScrolled, TR.segment));
  const t2 = S.raceScrolled.findOne((n) => n.name === "race-title"); if (t2) await react(t2, click, go(S.raceTrace, TR.segment));
  // lab
  await react(S.labButtons["0S"], click, go(S.labB, TR.segment));
  await react(S.labBButtons["0M"], click, go(S.lab, TR.segment));
  await react(S.labBest, click, go(S.best, TR.sheet));
  await react(S.labBBest, click, go(S.best, TR.sheet));
  await react(S.bestScrim, click, { type: "BACK" });
  for (const b of S.bestClose) await react(b, click, { type: "BACK" });
  // more
  await react(S.moreFav, click, go(S.favs, TR.push));
  await react(S.moreMethod, click, go(S.method, TR.push));
  for (const b of S.favs.findAll((n) => n.name === "Continue button" || n.name === "Skip button")) await react(b, click, { type: "BACK" });

  page.flowStartingPoints = [
    { nodeId: S.splash.id, name: "1 · First launch" },
    { nodeId: S.home.id, name: "2 · Returning user" },
    { nodeId: S.notifA.id, name: "3 · Race notification" },
    { nodeId: S.lab.id, name: "4 · Strategy lab" },
  ];
}

// ---------------------------------------------------------------- run
async function main() {
  const pages = [await getPage("Foundations", 0), await getPage("Components", 1), await getPage("Screens + Prototype", 2)];
  await cleanup();
  await loadFonts();
  await tokens();
  await foundations(pages[0]);
  await components(pages[1]);
  await buildScreens(pages[2]);

  const pit = [S.home.clone(), S.raceTrace.clone(), S.lab.clone()];
  pit[0].name = "P03 Overview · Pit wall"; pit[1].name = "P07 Race · Pit wall"; pit[2].name = "P11 Strategy lab · Pit wall";
  const rows = [
    ["Launch", [S.splash, S.onboard]],
    ["Overview", [S.home, S.offline, S.notifA, S.notifB]],
    ["Races", [S.races, S.racesLoading, S.raceTrace, S.raceScrolled, S.compare, S.raceStrat, S.raceRes]],
    ["Strategy lab", [S.lab, S.labB, S.best]],
    ["Seasons + More", [S.seasons, S.more, S.method, S.favs]],
    ["Pit wall theme", pit],
  ];
  await figma.setCurrentPageAsync(pages[2]);
  await labels(pages[2], rows);
  rowLayout(pages[2], rows);
  // sheets stay in the frames off-screen; pit wall copies get the dark colours
  for (const p of pit) retheme(p);
  await wire(pages[2]);
  figma.viewport.scrollAndZoomIntoView([S.splash, S.home, S.raceTrace]);
  const msg = `RI360 built: ${rows.reduce((a, r) => a + r[1].length, 0)} screens, 4 flows.` + (LOG.length ? ` ${LOG.length} note(s): see the console.` : "");
  if (LOG.length) console.log("RI360 App Builder notes:\n" + LOG.join("\n"));
  figma.closePlugin(msg);
}
main().catch(async (e) => {
  console.error(e);
  const why = `RI360 builder stopped while building "${STAGE}": ${e && e.message ? e.message : e}`;
  // Put the error on the canvas too, so it can't be missed (copy it from here).
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    const t = figma.createText(); t.name = "Builder error"; t.fontSize = 28; t.characters = why + "\n\n" + (e && e.stack ? e.stack : "");
    t.fills = [{ type: "SOLID", color: { r: 0.84, g: 0.15, b: 0.12 } }]; t.x = 0; t.y = -400;
    figma.viewport.scrollAndZoomIntoView([t]);
  } catch (e2) { /* ignore */ }
  figma.closePlugin(why);
});
