# Forever Stew — playable deck experiments

Run `npm.cmd run dev`, then open `http://127.0.0.1:4173`. On macOS/Linux use `npm run dev`. Node 22+ is recommended; there are no third-party runtime dependencies. Opening `index.html` directly cannot load the JSON packages.

Choose one or two themed decks—Culture Cellar, Char Hearth, Bellglass Chorus—plus the common Pantry. Choose a story independently of the pot, then one of three seeded starting stocks. Both stories have **ten five-bowl chapters**, split into three arcs, with narrative introductions and boss finales.

Choose a small / standard / large bowl each serving: lower immediate points preserve ingredients; larger portions score more but deplete the pot faster. Capacity is the only ingredient limit. Below 0.15 presence, remnants join fixed-property, modest-scoring Broth. Iron holds **3 L and seven residues**; Royal holds **5 L and five**. Sixteen residues level automatically through visible secondary objectives. Ingredients, resources and progress persist **within the run only**.

The Uninvited Cook takes you from a borrowed tavern kitchen to a royal banquet. The Long Table follows a traveling kitchen through a hungry winter. Princess requests introduce off-deck ingredients; ogres demand large portions; dragons seize the heat; witches temporarily silence residues. Chapter portraits, score-responsive dialogue and visible demands explain who you are cooking for.

The sticky chemistry dock shows effective property totals and reactions. Detailed cards retain rarity outlines, colored keyword tooltips, exact heat cutoffs and illustrations. Ingredients bounce and shrink in the pot; reaction connectors and individual score bubbles follow authoritative events. The ledger remains below play. Close chapter/reward/result prompts to inspect, then reopen them from the banner.

## Implementation map

| Location | Responsibility |
| --- | --- |
| `packages/game-core/` | Seeded setup/draft, reducer, scoring, portions, boss legality, objective counters, preview and replay |
| `stories/catalog.js` | Story arcs, chapters, narrative, preferences, demands, dialogue and endings |
| `packages/deck-contract/helpers.js` | Read-only helpers, including silence-aware residue levels |
| `decks/*/deck.json` | Card/residue definitions, objectives and visual identity |
| `decks/*/rules.js` | Deck-owned operations, reaction order and multipliers |
| `decks/*/presentation.js` | Detailed card descriptions and event language |
| `apps/play-web/` | Controls, sticky chemistry, rendering, event playback and visual-only pot physics |
| `assets/` | Ingredient/pot/residue art and six story portraits |
| `tools/balance-report.js` | Bounded bot diagnostics, not player win-rate predictions |
| `tests/` | Deterministic rules tests and browser smoke fixtures |

The core never reads the DOM or calls `Math.random`. Preview uses the same reducer without changing the live state. Reproduce a run with `replayGame(catalog, {deckIds, potId, storyId, seed, commands})`. Accepted setup and gameplay commands are recorded in `commandLog`. Keep matching content and rules versions with a replay; v4 states are not migrated into rules v5. Local reviewed deck code is trusted, not sandboxed.

## Verify and tune

`npm.cmd test` checks rules, deck descriptions and asset references. With the dev server running, open the browser smoke pages under `/tests/`: serving, Royal/story independence, broth, stage inspection, responsive UI/tooltips, residues, reaction playback, and a complete 50-bowl journey. The main serving fixture is `browser-smoke.html`; the others are `browser-<name>-smoke.html`.

```text
node tools/balance-report.js 2 1 iron royal
node tools/balance-report.js 1 1 royal road
node tools/balance-report.js 1 1 iron royal culture
```

Arguments: seed count, target scale (or ten comma-separated targets), pot, story, optional theme profile such as `culture+chorus`. Searching all portions/replacements can take a few minutes across many seeds.

Current specifications: [stories and servings v5](docs/design/STORIES_SERVINGS_V5.md), [balance evidence and limitations](docs/design/BALANCE_V5.md), [implemented deck contract](docs/design/IMPLEMENTED_DECK_CONTRACT.md). Six new portraits were made with the built-in image generator; [filenames and exact prompts](assets/characters/README.md) are included.

Design context: [points-engine thesis](docs/design/POINTS_ENGINE_THESIS.md), [reference deck experiments](docs/design/DECK_EXAMPLES.md), [architecture proposal](docs/design/DECK_ARCHITECTURE.md), [research plan](docs/design/RESEARCH_PLAN.md), [developer/AI authoring brief](docs/design/DECK_AUTHORING_BRIEF.md). These are design hypotheses, not proof of player enjoyment. The original `game.js` and `data/` prototype remain as reference and are not loaded by the current page.
