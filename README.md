# Forever Stew — playable deck experiments

Run `npm.cmd run dev`, then open `http://127.0.0.1:4173`. On macOS/Linux use `npm run dev`. Node 22+ is recommended; there are no third-party runtime dependencies. Opening `index.html` directly cannot load the JSON packages.

Choose one themed deck—Culture Cellar, Char Hearth, or Bellglass Chorus—plus the common Pantry. Each story highlights one story deck and two recommended alternatives. Choose a story independently of the pot, then one of three seeded starting stocks. The royal story has ten five-bowl chapters; the caravan story has seven. Both have three arcs and boss finales.

Choose a small / standard / large bowl each serving: lower immediate points preserve ingredients; larger portions score more but deplete the pot faster. Capacity is the only ingredient limit. Below 0.15 presence, remnants join fixed-property, modest-scoring Broth. Iron holds **3 L and seven residues**; Royal holds **5 L and five**. Thirty-two residues span four rarities, level immediately through visible secondary objectives, and appear as three seeded reward choices. Ingredients, resources and progress persist **within the run only**.

The Uninvited Cook takes you from a borrowed tavern kitchen to a royal banquet. The Long Way to Town begins with a foraged forest supper, gains a merchant friend and bandit escorts, then attracts a hungry troll and a dragon. The bandits demand ingredient variety, the troll requires large bowls, and the dragon tests your heat and appetite. The royal princess and witch keep their own demands. Chapter portraits, floating speech bubbles and visible demands show who you are cooking for.

Each chapter introduces the situation before cooking and reveals its resolution only on success. One star passes; higher score and reaction-engine goals earn two or three stars. The chemistry panel sits above the draft and pot. Concise cards put full ability rules in tooltips alongside colored keywords, rarity outlines and illustrations. Ingredients bounce and shrink in the pot; reaction connectors and individual score bubbles follow authoritative events. The complete serving ledger sits below the draft, showing every effect, per-ingredient point gain and multiplier in resolution order. Close chapter/reward/result prompts to inspect, then reopen them from the banner.

## Implementation map

| Location | Responsibility |
| --- | --- |
| `packages/game-core/` | Seeded setup/draft, reducer, scoring, portions, boss legality, objective counters, preview and replay |
| `stories/catalog.js` | Story arcs, chapters, narrative, preferences, demands, dialogue and endings |
| `packages/deck-contract/helpers.js` | Read-only helpers, including silence-aware residue levels |
| `decks/*/deck.json` | Card/residue definitions, objectives and visual identity |
| `decks/*/rules.js` | Deck-owned operations, reaction order and multipliers |
| `decks/*/presentation.js` | Detailed card descriptions and event language |
| `apps/play-web/` | Controls, chemistry, rendering, event playback and visual-only pot physics |
| `assets/` | Ingredient/pot/residue art and story portraits |
| `tools/balance-report.js` | Bounded bot diagnostics, not player win-rate predictions |
| `tests/` | Deterministic rules tests and browser smoke fixtures |

The core never reads the DOM or calls `Math.random`. Preview uses the same reducer without changing the live state. Reproduce a run with `replayGame(catalog, {deckIds, potId, storyId, seed, commands})`. Accepted setup and gameplay commands are recorded in `commandLog`. Keep matching content and rules versions with a replay; older states are not migrated into rules v7. Local reviewed deck code is trusted, not sandboxed. The core still supports two themed decks for diagnostic cross-deck tests, but the playable setup offers one.

## Verify and tune

`npm.cmd test` checks rules, deck descriptions and asset references. With the dev server running, open the browser smoke pages under `/tests/`: serving, Royal/story independence, broth, stage inspection, responsive UI/tooltips, residues, reaction playback, and a complete 35-bowl caravan journey. The main serving fixture is `browser-smoke.html`; the others are `browser-<name>-smoke.html`.

```text
node tools/balance-report.js 2 1 iron royal
node tools/balance-report.js 1 1 royal road
node tools/balance-report.js 1 1 iron royal culture
```

Arguments: seed count, target scale (or one comma-separated target per story chapter), pot, story, optional theme profile such as `culture`. Searching all portions/replacements can take a few minutes across many seeds.

Current specifications: [stars and residue progression v7](docs/design/PROGRESSION_V7.md), [caravan story and tone](docs/design/STORY_WRITING_V6.md), [caravan balance diagnostics](docs/design/BALANCE_CARAVAN_V6.md), [stories and servings v5 history](docs/design/STORIES_SERVINGS_V5.md), [implemented deck contract](docs/design/IMPLEMENTED_DECK_CONTRACT.md). [Portrait filenames and prompts](assets/characters/README.md) are recorded separately.

Design context: [points-engine thesis](docs/design/POINTS_ENGINE_THESIS.md), [reference deck experiments](docs/design/DECK_EXAMPLES.md), [architecture proposal](docs/design/DECK_ARCHITECTURE.md), [research plan](docs/design/RESEARCH_PLAN.md), [developer/AI authoring brief](docs/design/DECK_AUTHORING_BRIEF.md). These are design hypotheses, not proof of player enjoyment. The original `game.js` and `data/` prototype remain as reference and are not loaded by the current page.
