# RI360 phone app: brief for Figma's AI agent

Give this file to Figma's AI (Figma Make, or the AI agent inside a Figma Design file). Either attach the whole file and say *"Build the app described in this brief, in the order of the prompts in section 9"*, or paste the prompts in section 9 one at a time. AI agents do much better building in stages than in one giant request.

---

## 1. What the app is

**RI360** is an unofficial Formula 1 race-analytics app (the phone version of ri360.vercel.app). It analyses every lap since 2019: race traces, tyre strategies, results, season heat maps and a strategy lab that re-runs a race with a different pit plan.

- Platform: iPhone first, at **390 × 844** (iPhone 14/15/16). Android uses the same layout.
- Mood: an editorial racing magazine printed on warm paper. Calm, data-dense, confident. **Not** neon, glassy, gradient-heavy, or "gamer".
- Do **not** use F1 logos, team logos, driver photos or the official F1 fonts. The footer disclaimer is required (see More).

## 2. Colour (make these variables)

Two themes: **Paper** (light, default) and **Pit wall** (dark). Create one variable collection, "RI360 colour", with two modes. If the plan allows only one mode, make two collections instead.

| Token | Paper | Pit wall | Use |
|---|---|---|---|
| surface/page | #F7F3EA | #12100D | screen background |
| surface/card | #FFFDF8 | #1C1915 | cards, tab bar, sheets |
| surface/sunken | #EFE9DC | #0B0A08 | segmented control track, selected options |
| line/subtle | #E3DCCB | #2C2721 | hairlines, card borders |
| line/strong | #948A76 | #6B6253 | grabbers, switch off, hard-tyre outline |
| text/primary | #16130F | #F3EDE1 | main text |
| text/muted | #5B5446 | #A89F8E | secondary text |
| text/on-red | #FFFFFF | #12100D | text on red buttons |
| race-red/base | #D7261E | #FF5A4A | the one accent: primary buttons, active tab, links |
| race-red/tint | #F9DCD6 | #3A1814 | podium cells |
| petrol/base | #1F4E5F | #6FB2C6 | comparison driver line |
| petrol/tint | #D9E7EA | #16303A | points cells |
| podium/base | #C9A227 | #E2BD4A | wins, SC tag |
| tyre/soft | #D7261E | #FF5A4A | soft compound |
| tyre/medium | #C9A227 | #E2BD4A | medium |
| tyre/hard | #16130F | #F3EDE1 | hard (drawn as an outline) |
| tyre/inter | #2F8A4A | #4FB36A | intermediate, "faster" delta, switch on |
| tyre/wet | #2D6FB0 | #5B9BE0 | wet, WET tag |
| hero/surface | #16130F | #241F19 | dark hero card, splash |
| hero/text | #F3EDE1 | #F3EDE1 | text on hero |
| hero/accent | #FF7A6D | #FF7A6D | kicker on hero |
| hero/muted | #A89F8E | #A89F8E | labels on hero |

Spacing variables: 4, 8, 12, 16, 20, 24, 32, 48. Radius variables: sm 4, md 8, lg 14, hero 18, sheet 22, pill 999. Screen side padding is **20**.

## 3. Type (make these text styles)

Fonts (all free on Google Fonts): **Barlow Condensed** for display, **Space Grotesk** for UI, **JetBrains Mono** for numbers and codes.

| Style | Font | Size / line height | Notes |
|---|---|---|---|
| Display/Large title | Barlow Condensed ExtraBold | 40 / 38 | UPPERCASE |
| Display/Hero | Barlow Condensed ExtraBold | 34 / 31 | UPPERCASE |
| Display/Section | Barlow Condensed Bold | 22 / 22 | UPPERCASE |
| Display/Sheet title | Barlow Condensed Bold | 24 / 24 | UPPERCASE |
| Display/Big stat | Barlow Condensed ExtraBold | 44 / 44 | |
| Display/Driver code | Barlow Condensed ExtraBold | 28 / 28 | |
| Display/Round | Barlow Condensed Bold | 22 / 22 | |
| Display/Wordmark | Barlow Condensed ExtraBold | 64 / 64 | -1% tracking |
| UI/Nav title | Space Grotesk Bold | 16 / 20 | |
| UI/Row title | Space Grotesk Medium | 16 / 20 | |
| UI/Body | Space Grotesk Regular | 15 / 21 | |
| UI/Small | Space Grotesk Regular | 13 / 18 | |
| UI/Button | Space Grotesk Bold | 15 / 20 | |
| UI/Kicker | Space Grotesk Bold | 11 / 14 | UPPERCASE, 14% tracking |
| UI/Label | Space Grotesk Bold | 10 / 13 | UPPERCASE, 12% tracking |
| UI/Tab label | Space Grotesk Medium | 10.5 / 12 | |
| Data/Value | JetBrains Mono Medium | 14 / 19 | |
| Data/Big | JetBrains Mono Bold | 22 / 26 | |
| Data/Chip | JetBrains Mono Bold | 13 / 16 | |
| Data/Tag | JetBrains Mono Bold | 10 / 12 | 4% tracking |
| Data/Axis | JetBrains Mono Medium | 10 / 12 | |

Effects: **Elevation/Sheet** (shadow 0,-4, blur 24, black 18%) and **Elevation/Banner** (0,10, blur 30, black 25%).

## 4. Components (build these first, with auto layout)

1. **Status bar**: 390 × 54, "9:41" on the left, signal/wi-fi/battery on the right.
2. **Nav bar** (variants State = Expanded / Collapsed): 390 × 44. Left: red chevron and back label ("Races"). Centre: title, hidden when Expanded and shown when Collapsed, which also adds a bottom hairline. Right: a 36 × 36 outlined share button. Properties: Title (text), Back label (text), Show back (boolean), Show action (boolean).
3. **Tab bar** (variant Active = Overview / Races / Lab / Seasons / More): 390 × 88 on surface/card with a top hairline. Five icon + label tabs: house, flag, target, 2×2 grid, three dots. The active tab is race red, the others muted. Home indicator 134 × 5.
4. **Tyre badge** (Compound = S / M / H / I / W): a 20 × 20 ring with a 2px stroke in the tyre colour and the letter inside (Data/Tag).
5. **Chip** (State = Default / Selected × Dot = None / Focus / Compare): a pill with 9/12 padding. Default has a hairline and muted text. Selected is filled text/primary with page-coloured text and a ✓. The dot is red for Focus and petrol for Compare. Label is a text property.
6. **Switch** (On = True / False): 50 × 30. Green when on, line/strong when off, with a white 24px knob.
7. **Button** (Style = Primary / Ghost): 350 wide, radius 14. Primary is race red and 52 tall. Ghost is outlined and 44 tall. Label is a text property.
8. **Stat tile**: 140 wide card. Label (UI/Label, muted) over Value (Data/Big).
9. **Race row**: 390 wide with a bottom hairline. Round number (Display/Round, muted). Name (UI/Row title) over meta "São Paulo · Nov 8" plus optional tags: "SC 7" in yellow, "WET" in blue. Winner code in a dark pill, then a chevron.
10. **Segmented control** (Selected = 1 / 2 / 3): 350 × 36 sunken track with a white sliding indicator and three labels (Trace / Strategy / Results).

## 5. Screens (frames at 390 × 844)

Every screen: status bar on top (fixed). Content scrolls in a vertical auto-layout "Body" starting at y 98, or 54 when there's no nav bar. Tab bar fixed at the bottom on top-level screens. Large-title pattern: red kicker (UI/Kicker), then the big title (Display/Large title), then an optional lede (UI/Body, muted). Use **this exact real data**, never lorem ipsum.

**01 Splash**: whole frame hero/surface. Centred "RI360" wordmark with "360" in race red, a thin red racing-line squiggle under it, and "EVERY LAP SINCE 2019" (Data/Value, hero/muted).

**02 Onboarding · Pick drivers**: no nav bar. Kicker "Step 1 of 2 · Welcome", title "Pick your drivers", lede "We'll put them first on the overview and tell you when their race has been analysed." A wrapping grid of chips: NOR, VER, HAD, RUS, ANT, PIA, LAW, LEC, HAM, HUL, ALO, GAS, SAI, ALB, BEA, with **NOR and LEC selected**. A row "Notify me after each race" with the switch on. Small print "You can change this any time in More. RI360 never collects personal data." At the bottom, Primary "Continue" and Ghost "Skip".

**03 Overview** (tab Overview): kicker "8 seasons · 172,337 laps", title "Overview".
- A dark **hero card** (hero/surface, radius 18): kicker "Latest · Round 20 · Analysed" in hero/accent. "São Paulo Grand Prix" (Display/Hero, layer name `race-title`). Facts "Winner: NOR · from P3" and "Rain: 36% of laps". A "Winning strategy" label with tyre badges I S S I and a thin stint bar. A red round arrow button in the top-right.
- **Your drivers** (action "Edit"): two cards side by side. NOR card: number "4" in a dark square, "NOR" (Driver code), "McLaren", "P1 · São Paulo", "3 wins in 2026" in red. LEC card: "16", "Ferrari", "P8 · São Paulo", "1 win in 2026".
- **By the numbers**: a horizontal scroller of stat tiles: Laps analysed 172,337 · Grands Prix 157 · Pit stops 5,558 · Laps under SC/VSC 731 · Models fitted 151 · Timing match 100%.
- **What the laps say** (action "Method"): four insight cards, each with a label, big red stat, headline and footnote:
  - Pit lane · 32 circuits: **28.9s**. "Imola charges 29s a stop. Monaco barely 19." Footnote: "Median green-flag pit loss by circuit, dry races only."
  - Tyres · 289 stint fits: **1.2×**. "A soft costs 1.2× more per lap of age than a hard." Footnote: "0.056s vs 0.045s per lap, after fuel and driver pace."
  - 2026 season: **9/20**. "wins for Kimi Antonelli, the season's pace benchmark." Footnote: "He led 451 laps. Next best: 0.38% slower in clean air."
  - Data quality: **14.0%**. "of the exported lap table was the same lap twice." Footnote: "27,986 duplicates dropped; 94,490 laps cross-checked."

**04 Overview · Offline + refresh**: same as 03, plus a pull-to-refresh spinner at the top and a red-tinted banner with a wi-fi-off icon: "You're offline. Showing data saved on 8 Nov."

**16a / 16b Notification**: same as 03, plus an iOS-style notification banner (card, radius 18, Elevation/Banner). App icon, "RI360 · São Paulo GP analysed", "Norris won from P3 on inters-slicks-inters. See the race trace →", "now". In 16a the banner sits above the screen at y -140. In 16b it's at y 58.

**05 Races** (tab Races): kicker "Race archive", title "Races". Year chips 2019–2026 with 2026 selected. A search field "Search circuits, winners…". A list of race rows for 2026, newest first (round · name · city · date · winner · tags):
  - 20 São Paulo · São Paulo · Nov 8 · NOR · WET
  - 19 Mexico City · Mexico City · Nov 1 · VER · SC 10
  - 18 United States · Austin · Oct 25 · ANT · SC 4
  - 17 Singapore · Singapore · Oct 11 · VER · SC 4
  - 16 Bahrain · Kuala Lumpur · Oct 4 · VER · SC 16
  - 15 Azerbaijan · Baku · Sep 26 · RUS · SC 8
  - 14 Spanish · Madrid · Sep 13 · ANT · SC 2
  - 13 Italian · Monza · Sep 6 · ANT · SC 6

**06 Races · Loading**: same layout with skeleton rows (grey rounded bars) instead of data.

**07 Race · Trace** (back "Races", share action, tab Races): kicker "Round 20 · Interlagos · 8 Nov 2026", title "São Paulo Grand Prix" (layer `race-title`), lede "Norris won from P3 on an inter-slick-slick-inter strategy, with Verstappen up 11 places." A 2-column facts grid: Laps 71 · Winner NOR · McLaren · Fastest lap ANT 1:12.689 · Pit loss 33.9s · Rain 36% of laps · Neutralised None. Segmented control on **Trace**. Then a line chart "gap, seconds" with a NOR line (red) and a VER line (petrol) over laps 0–71, dipping to about -130s around lap 20 and rising to about +60s by lap 60. Below it, chips "NOR" (Focus), "VER" (Compare) and "Compare drivers". Caption: "Lines rise when a driver gains time on a steady reference pace. Both pitted for slicks on laps 16–17 as the track dried, then back to inters for the final rain."

**07b Race · Scrolled**: same as 07, scrolled up about 120px, with the Nav bar in the **Collapsed** state showing the title "São Paulo GP".

**08 Race · Strategy**: segmented control on **Strategy**. One row per driver: grid position, code, then a stint bar coloured by compound. NOR: I16 S33 S13 I9. VER: I17 S28 S17 I9. HAD: I16 S34 S12 I9. RUS: I16 S45 I10. ANT: I17 S36 S9 I9. PIA: I16 S35 S11 I9. LAW: I16 S32 S13 I10. LEC: I16 S45 I10. A legend of the compounds underneath.

**09 Race · Results**: segmented control on **Results**. Rows: position, code pill, name, "team · from P{grid}", and the median clean-air lap.
- 1 NOR Lando Norris, McLaren, from P3, 1:14.958
- 2 VER Max Verstappen, Red Bull Racing, from P13, 1:15.161
- 3 HAD Isack Hadjar, Red Bull Racing, from P4, 1:15.418
- 4 RUS George Russell, Mercedes, from P5, 1:15.084
- 5 ANT Kimi Antonelli, Mercedes, from P1, 1:14.832

Footnote: "Right column: median clean-air lap."

**10 Race · Compare sheet**: screen 07 dimmed by a 40% black scrim, with a bottom sheet (surface/card, top radius 22, Elevation/Sheet, grabber). Title "Compare drivers", subtitle "Pick two. Red is the focus driver, petrol the comparison." A wrapping grid of chips "P1 NOR" … "P8 LEC", with NOR selected (Focus dot) and VER selected (Compare dot). Primary button "Show NOR vs VER".

**11 Strategy lab** (tab Lab): kicker "Strategy lab", title "Re-run the race", lede "Plan the stints yourself. The fitted pace model predicts every lap."
- Two selector cards: Race "2026 Austin" and Driver "ANT · P1", each with a down chevron.
- Section "Your plan" (action "Best plans").
- Stint 1 card: stepper "− 24 laps +" and three compound buttons Soft / Medium / Hard (each a tyre badge plus a name). **Medium is selected** (sunken fill and dark outline).
- Stint 2 card: 32 laps, **Hard** selected.
- A stint bar for M24 + H32, and the note "Pit loss 21.8s · 56 laps · stint lengths always add up to the race distance."
- Fixed above the tab bar: a dark result bar (text/primary, radius 14) reading "Predicted race time **1:34:03.1**" with a grey delta pill "±0.0s".

**11b Strategy lab · Soft first stint**: identical, except stint 1 is **Soft** (the bar turns red), the time reads **1:34:00.4** and the delta pill is green: **−2.7s**. Keep the layer names identical to 11 so Smart Animate works.

**12 Strategy lab · Best plans sheet**: 11 dimmed by a scrim, with a sheet "Fastest plans", subtitle "Exhaustive search with the race's own model, two-compound rule applied." Two cards, each with a stint bar and a Ghost "Use this plan" button:
- Best one-stop: 1:33:58.9 · −4.2s, plan "Soft 29 → Hard 27"
- Best two-stop: 1:34:05.0 · +1.9s, plan "Soft 19 → Hard 18 → Hard 19"

**13 Seasons** (tab Seasons): kicker "2026 · 20 rounds", title "Seasons". Year chips. A segmented control "Colour by: Finishing position / Clean-air pace".
- A heat map: driver codes down the left, rounds 1–20 across the top, and a small cell per result with its position number ("-" = did not finish):
  - ANT: 2,1,1,1,1,1,16,3,15,1,3,2,1,1,5,2,3,1,3,5
  - VER: 6,16,8,5,3,-,4,2,20,3,2,-,3,2,2,1,1,3,1,2
  - RUS: 1,2,4,4,19,12,2,1,2,-,7,3,2,5,1,20,9,8,6,4
  - NOR: 5,-,5,2,18,19,3,7,4,7,1,1,4,3,18,9,4,5,5,1
  - LEC: 3,4,3,8,4,17,15,8,1,2,4,5,22,4,4,4,2,2,4,8
  - PIA: -,-,2,3,11,4,5,4,11,5,20,6,5,8,13,6,5,7,13,6
- Cell colours: win = podium yellow, podium = race-red tint, points = petrol tint, otherwise blank.
- A legend underneath, then "Most wins": 1 ANT Mercedes 9 wins · 16 podiums, 2 VER Red Bull 3 · 12, 3 RUS Mercedes 3 · 8, 4 NOR McLaren 3 · 6.

**14 More** (tab More): title "More". Grouped inset cards:
- **Appearance**: a 3-way control "Paper / Pit wall / System".
- **Following**: "Favourite drivers: NOR, LEC ›" and "Race analysed alerts" with the switch on.
- **About the data**: "How it's measured ›", "Data updated: 18 Nov 2026", "Races on device: 157 · 8.2 MB".
- **Legal**: "Privacy policy ›" and "Open-source licences ›".
- Then the disclaimer "RI360 is unofficial and is not associated with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1 and GRAND PRIX are trade marks of Formula One Licensing B.V." and "RI360 1.0 (1)".

**15 Method** (back "More"): kicker "Method", title "How every number is made". Four numbered steps (big red 01–04):
- **01 Collect**: "FastF1 for 2019–2023 and OpenF1 from 2024 pull every race's timing, tyre and weather feeds."
- **02 Clean**: "Duplicate laps dropped, stint ages rebuilt, every lap cross-checked against raw timing. Safety-car laps flagged."
- **03 Model**: "For each race, least squares separates driver pace, fuel burn, compound offset and tyre wear, scored on held-out laps."
- **04 Ship**: "A static data bundle ships inside the app, and new races arrive the morning after they run."

Then "Limits": "2021 has rounds 1–7 only. Wet races fit poorly because grip changes lap to lap, so their models are marked as low quality."

**02b Favourite drivers**: screen 02 reused with a nav bar (back "More", title "Favourite drivers"), and without the Continue/Skip buttons.

**Pit wall copies**: duplicate 03, 07 and 11 and switch them to the **Pit wall** mode.

## 6. Layout on the canvas

Put one row per section with a big label above each row, 80px between frames and 200px between rows:

1. Launch: 01, 02
2. Overview: 03, 04, 16a, 16b
3. Races: 05, 06, 07, 07b, 10, 08, 09
4. Strategy lab: 11, 11b, 12
5. Seasons + More: 13, 14, 15, 02b
6. Pit wall theme: the three dark copies

## 7. Prototype (wire every one of these)

Easing values: "iOS" = cubic-bezier(0.32, 0.72, 0, 1); "standard" = cubic-bezier(0.2, 0, 0, 1).

| From | Trigger | To | Animation |
|---|---|---|---|
| 01 Splash | After delay 1.2s | 02 | Dissolve 400ms, ease out |
| 02 Continue / Skip | Tap | 03 | Dissolve 400ms |
| Any tab bar tab | Tap | that tab's screen (03, 05, 11, 13, 14) | Dissolve 160ms, ease out |
| 03 hero card | Tap | 07 | Smart animate 360ms, iOS (the `race-title` layer morphs) |
| 05 any race row | Tap | 07 | Push from right 360ms, iOS |
| 03 NOR driver card | Tap | 07 | Push from right 360ms |
| Any Back button | Tap | Back | (reverses the push) |
| 07 ↔ 08 ↔ 09 segment items | Tap | the matching screen | Smart animate 240ms, standard (the indicator slides) |
| 07 race title | Tap | 07b, and back again | Smart animate 240ms (stands in for scrolling) |
| 07 "Compare drivers" | Tap | 10 | Smart animate 440ms, iOS (the sheet rises from y 864) |
| 10 scrim or sheet button | Tap | Back | |
| 11 Soft (stint 1) | Tap | 11b | Smart animate 240ms, standard |
| 11b Medium (stint 1) | Tap | 11 | Smart animate 240ms |
| 11 / 11b "Best plans" | Tap | 12 | Smart animate 440ms, iOS |
| 12 scrim or "Use this plan" | Tap | Back | |
| 03 "Method" / 14 "How it's measured" | Tap | 15 | Push 360ms |
| 14 "Favourite drivers" | Tap | 02b | Push 360ms |
| 16a | After delay 1.5s | 16b | Smart animate, spring (mass 1, stiffness 300, damping 20) |
| 16b banner | Tap | 07 | Push 360ms |
| Chip, Switch, Segmented control | Tap | other variant | Interactive component, Smart animate 240ms |

Make the tab bar and status bar **fixed** (they don't scroll). Make the Body scroll vertically. Make the year chips and stat tiles scroll horizontally.

Flows (starting points): **1 · First launch** (01), **2 · Returning user** (03), **3 · Race notification** (16a), **4 · Strategy lab** (11).

## 8. Quality bar

- Everything uses auto layout, variables and text styles. Nothing hard-coded.
- Touch targets are at least 44 × 44. Body text is at least 13px. Contrast is AA in both themes.
- Only one red accent per area. Never use red for a whole screen background.
- Numbers always use JetBrains Mono. Titles always use Barlow Condensed uppercase.
- Layer names are meaningful (`race-title`, `pred-time`, `delta`, `sheet`, `scrim`), because Smart Animate pairs layers by name.

## 9. Prompts to paste one at a time

1. "Read the attached RI360 brief. Create the colour variables (Paper and Pit wall), spacing and radius variables, the 21 text styles and 2 effect styles from sections 2–3. Make a Foundations page that shows them."
2. "Using those tokens, build the 10 components in section 4 on a Components page, with variants and properties exactly as described. Use auto layout everywhere."
3. "Build screens 01, 02, 03, 04, 16a and 16b from section 5, using only those components and tokens and the exact text given."
4. "Build screens 05, 06, 07, 07b, 08, 09 and 10 from section 5."
5. "Build screens 11, 11b, 12, 13, 14, 15 and 02b, then the three Pit wall copies. Arrange everything as in section 6."
6. "Wire the prototype exactly as in section 7, including fixed layers, scrolling and the four flows."
7. "Check everything against section 8 and fix anything that doesn't meet it."
