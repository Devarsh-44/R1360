# RI360 App Builder (Figma plugin)

A one-click Figma plugin that builds the whole RI360 phone app design, including the clickable prototype. It turns the [app blueprint](../ri360-app-blueprint.html) into real, editable Figma layers.

## What it builds

| Page | Contents |
|---|---|
| **Foundations** | Colour swatches (Paper and Pit wall), all 21 text styles, motion tokens |
| **Components** | Status bar, Nav bar (Expanded / Collapsed), Tab bar (5 variants), Tyre badge (S M H I W), Chip (state × dot), Switch, Button, Stat tile, Race row, Segmented control. Chip, Switch and Segmented control are interactive components. |
| **Screens + Prototype** | 23 frames at 390 × 844, in 6 labelled rows, with every transition wired |

Plus variables (`RI360 colour`, `RI360 size`) and effect styles (`Elevation/Sheet`, `Elevation/Banner`). Every colour, gap, padding and corner radius is bound to a variable.

### Screens

| Row | Frames |
|---|---|
| Launch | 01 Splash · 02 Onboarding |
| Overview | 03 Overview · 04 Offline + refresh · 16a/16b Race notification |
| Races | 05 Races · 06 Loading · 07 Race Trace · 07b Scrolled (collapsed nav) · 10 Compare sheet · 08 Strategy · 09 Results |
| Strategy lab | 11 Your plan · 11b Soft first stint · 12 Best plans sheet |
| Seasons + More | 13 Seasons · 14 More · 15 Method · 02b Favourite drivers |
| Pit wall theme | Overview, Race, Lab in the dark theme |

### Transitions it wires

| Interaction | Setting |
|---|---|
| Splash → Onboarding | After delay 1.2s · Dissolve 400ms |
| Onboarding → Overview | Tap · Dissolve 400ms |
| Tab bar | Tap · Dissolve 160ms, ease out |
| Race row, driver card, Method, Favourites | Tap · Push from right 360ms, bezier (.32, .72, 0, 1) |
| Latest-race card → Race | Tap · Smart animate 360ms (the title morphs: both layers are named `race-title`) |
| Back buttons | Tap · Back (the push in reverse) |
| Race tabs Trace / Strategy / Results | Tap · Smart animate 240ms, bezier (.2, 0, 0, 1): the indicator slides |
| Race title tap ↔ 07b | Smart animate 240ms: the nav bar collapses (stands in for scrolling, which Figma can't trigger) |
| Compare / Best plans → sheet | Tap · Smart animate 440ms: the sheet rises from below the screen and the scrim fades in |
| Scrim or sheet button | Tap · Back: the sheet drops away |
| Lab: tap **Soft** in stint 1 | Smart animate 240ms to 11b: the stint colour, time and delta animate. Tap **Medium** to go back. |
| Notification flow | After delay 1.5s · Smart animate with a spring (mass 1, stiffness 300, damping 20): the banner drops in. Tap it → Race. |
| Chips, switches, segmented control | Interactive components, Smart animate 240ms |

Four flows are set: **1 · First launch**, **2 · Returning user**, **3 · Race notification**, **4 · Strategy lab**.

## Run it (5 minutes)

You need the **Figma desktop app** (development plugins don't run in the browser).

1. Install the fonts Figma will use, if they aren't already on your computer: [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed), [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono). Figma usually has them built in. If one is missing, the plugin falls back to Inter and says so.
2. Open the empty file **RI360 App** (it's in your drafts), or any new design file.
3. Menu → **Plugins → Development → Import plugin from manifest…** and choose `docs/app-design/figma-plugin/manifest.json` from this repo.
4. Menu → **Plugins → Development → RI360 App Builder**. It takes about 20–60 seconds. A message at the bottom says "RI360 built: 23 screens, 4 flows" when it's done.
5. Go to the **Screens + Prototype** page, choose flow **1 · First launch** in the right panel, and press **Present** (▶). Open the same file in the Figma mobile app to try it on your phone.

Running it again clears its three pages, its variables and its styles, and rebuilds them, so don't hand-edit those pages until you're happy with the generated version.

## Good to know

- **Starter plan limits.** A Starter file has at most 3 pages, and a variable collection has a single mode. The plugin uses exactly 3 pages. Pit wall becomes a second colour collection (`RI360 colour · Pit wall`), and the three Pit wall frames are re-bound to it. On a Professional plan it creates one collection with two modes instead, and the Pit wall frames simply switch mode.
- **Notes.** If something can't be set (a missing font, or an interaction Figma refuses), the plugin keeps going and lists it in the developer console: **Plugins → Development → Show/Hide console**.
- **Tested how.** The script was dry-run against a strict mock of the Figma Plugin API (layout-sizing rules, component properties, fonts, prototype targets), but not inside Figma itself. If the run stops with an error, copy the message from the console and paste it to Claude.
- **What Figma can't do** (and how the file handles it): line-drawing animation, number count-ups and scroll-triggered effects. The collapsed nav is shown as its own state (07b). The other two are written up in the blueprint's motion table for developers.
