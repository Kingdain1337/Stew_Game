# Forever Stew: Base Game and Content Studio Technical Design

> Design revision, 26 October 2026: the immediate priority is validating the game logic and experience. Read the [points-engine thesis](docs/design/POINTS_ENGINE_THESIS.md), [candidate decks](docs/design/DECK_EXAMPLES.md), [deck architecture proposal](docs/design/DECK_ARCHITECTURE.md), and [research/delivery plan](docs/design/RESEARCH_PLAN.md) alongside this document. A first playable JavaScript implementation now exists in `packages/game-core/`, `decks/`, and `apps/play-web/`. The larger studio, Unity path, and research outcomes below remain proposals. Residues persist only between encounters within the same run and reset when that run ends.

## Decision summary

Build Forever Stew as a **deterministic, headless rules engine** plus separate **deck packages** containing definitions, optional deck-owned rules, presentation, and tests. The web game, a non-technical Content Studio, automated balance tools, and a future Unity client use the same published state and rules contracts. Code-owned deck rules require a deliberate Unity port or a later shared rule representation; JSON alone does not make them portable.

The current browser prototype implements the loop; it has not established its fun, depth, or balance. First test a distinctive deck, meaningful run residue choices, and causal visual feedback in a small playable experiment. Migrate its definitions from JavaScript globals into validated JSON as that experiment needs a stable contract. TypeScript is the practical implementation language for the web phase, but schemas, operation semantics, and deterministic test fixtures—not TypeScript internals—are the long-term contract for Unity.

The design separates three kinds of extension:

| Kind | Meaning | Added by content author? |
| --- | --- | --- |
| Content | Ingredient, encounter, pot, chef, reaction definition, text, art reference, balance value | Yes, in Content Studio |
| Deck behavior | A distinctive rule implemented inside a deck using shared state operations and timing | By a developer/agent during deck implementation; its parameters can then be exposed to the Studio |
| Shared capability | A new operation, timing rule, score meaning, or player action outside the host contract | Engineering change with shared compatibility and design review |

Conventional cards can use existing modifiers. Distinctive mechanics may use reviewed package-owned code without proving cross-deck reuse. Both routes must produce deterministic state changes and explainable events. See the deck proposal for the full package and presentation contracts.

## Goals and guardrails

The base needs to provide:

- One inspectable source of truth for all tuneable values and game content.
- A stable toolbox of modifier types plus a documented deck-owned rules interface.
- A complete explanation for every score: values, modifiers, timing, source, and formula.
- Seeded deterministic games: the same data version, commands, and seed always produce the same result.
- Form/card/graph authoring for content and tuning, with code available for new deck mechanics and presentation.
- Automated validation before data can be played, proposed, or released.
- Simulation tools that identify invalid, impossible, dominant, or unreadable content.
- A clean route to Unity without relying on a browser-specific data model.

The base should not yet include a live AI service, account power progression, multiplayer, runtime loading of arbitrary third-party scripts, or production backend infrastructure. Residue is run progression only. The “AI-friendly” requirement is met by repository-local design knowledge, tested examples, contracts, authoring briefs, validation commands, and fixtures that an external development agent can use.

## System shape

This diagram shows the baseline data/tooling flow. The revised [deck architecture](docs/design/DECK_ARCHITECTURE.md) additionally injects validated deck rules into the simulation and deck presentation into the visual host.

```text
                     canonical JSON + schemas
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
          Content Studio                    CLI / agent tools
          author · preview                  validate · simulate
                 │                             │
                 └──────────────┬──────────────┘
                                │ Content package
                                ▼
     ┌────────────────────────────────────────────────────────┐
     │                     Headless game core                  │
     │ state reducer · modifier evaluator · scoring · RNG · log│
     └───────────────┬───────────────────────────┬────────────┘
                     │                           │
              Web game shell                Unity adapter later
              renders core output           reads same package
```

The game core never reads the DOM, stores UI text, calls `Math.random`, or imports content files directly. It receives a loaded `ContentPackage`, a `GameState`, and a command, then produces a new `GameState` plus events. UI is a consumer of those events; it does not calculate scores itself.

## Repository layout

The following is the original data/tooling layout. The [deck package layout](docs/design/DECK_ARCHITECTURE.md#3-package-shape) extends it with package-owned rules, presentation, state schemas, fixtures, and evidence. Do not build every listed application before validating the first playable deck.

```text
apps/
  play-web/                 # playable web shell; rendering and input only
  content-studio/           # non-technical authoring interface
packages/
  game-core/                # pure TypeScript rules engine
  content-contract/         # TypeScript types, JSON Schema, migrations
  content-tools/            # validator, simulator, fixture runner, exporters
content/
  core-v1/
    manifest.json
    settings.json
    properties.json
    modifier-types.json
    pots.json
    ingredients.json
    reactions.json
    encounters.json
    chefs.json
    localization/en.json
    tests/
      golden-runs.json
      balance-profiles.json
docs/
  content-authoring.md
  modifier-catalog.md
  balance-policy.md
  agent-content-workflow.md
```

`content/core-v1` is a portable content package. A future Unity build copies a selected, validated package into `StreamingAssets` (or Addressables later) and parses exactly the same JSON. The web and Unity user interfaces can diverge without creating separate balance data.

## Stable game-core contract

### Inputs and outputs

The command sketch below is the original baseline. The revised deck proposal separates editable preparation from an atomic committed serving, so intermediate slider gestures do not execute rules. Implement that distinction when defining the concrete command schema.

```ts
type GameCommand =
  | { type: 'startStoryline'; storylineId: Id; potId: Id; seed: number }
  | { type: 'selectOffer'; offerId: Id }
  | { type: 'addSelectedIngredient' }
  | { type: 'discardSelectedIngredient' }
  | { type: 'setTemperature'; temperature: number }
  | { type: 'serve' }
  | { type: 'chooseResidue'; residueSourceIngredientId: Id }
  | { type: 'continueEncounter' };

interface StepResult {
  state: GameState;
  events: GameEvent[];          // UI/audio/analytics-friendly event log
  explanation?: ScoreExplanation;
  errors: RuleError[];          // invalid command; state is unchanged
}

function step(
  content: ContentPackage,
  state: GameState,
  command: GameCommand,
): StepResult;
```

`GameState` contains only runtime state: seed/RNG state, active storyline and encounter, round, selected offer, ingredients and remaining presence, temperature, score, installed residues, and completed-event flags. Definitions such as the base power of Beef are always looked up from `ContentPackage`; they are not copied into saved state.

`GameEvent` is append-only and has an ID, timestamp-free sequence number, phase, source IDs, and payload. Important initial events include `offersGenerated`, `ingredientSelected`, `ingredientAdded`, `temperatureChanged`, `modifierApplied`, `reactionActivated`, `thermalThresholdCrossed`, `served`, `scoreCalculated`, `encounterWon`, and `residueChosen`.

This event ledger makes replays, score explanations, telemetry, regression fixtures, and Unity parity testing possible.

### Fixed calculation phases

The baseline phases below are refined by the deck proposal's original/derived reaction distinction and committed-input semantics. The implementation must publish one versioned phase/order contract, not keep two competing schedules.

The engine exposes phases rather than letting content choose arbitrary execution order:

1. `offerGeneration`
2. `ingredientAdded`
3. `temperatureChanged`
4. `preServe`
5. `reactionResolution`
6. `ingredientScoring`
7. `servingScoring`
8. `postServeDepletion`
9. `encounterResolution`
10. `rewardResolution`

Every modifier type declares its allowed phase(s). Within a phase, modifiers are ordered by `priority`, then a stable `sourceId`. The order is included in `ScoreExplanation`. This solves the future question “does the customer penalty apply before or after my residue?” once, visibly and deterministically.

### Randomness

Use a named deterministic PRNG implementation in `game-core` (for example `mulberry32` with a documented seed conversion). Offer generation consumes random values only through a `RandomSource` passed through the reducer. Each event records the draws it used.

No core code, simulation, or client may use platform randomness. A seed can therefore reproduce an exact content playtest on web and Unity.

## Content package contract

### Package manifest

```json
{
  "schemaVersion": 1,
  "packageId": "core-v1",
  "version": "0.1.0",
  "engineCompatibility": ">=1.0.0 <2.0.0",
  "displayName": "Forever Stew Core V1",
  "defaultLocale": "en",
  "requiredModifierTypes": ["score.typeMultiplier", "reaction.propertyMultiplier"],
  "files": { "ingredients": "ingredients.json", "reactions": "reactions.json" }
}
```

Every content object has a permanent machine ID, a human name key, a schema version, optional tags, and source metadata. IDs never derive from the display name and are never re-used. Rename and rebalance are safe; save files and test fixtures still resolve the same content.

### Ingredient definition

```json
{
  "id": "ingredient.moon-onion",
  "nameKey": "ingredient.moon-onion.name",
  "rarity": "common",
  "types": ["vegetable"],
  "volumeLitres": 0.4,
  "basePower": 120,
  "reactivity": 1.0,
  "properties": { "sugar": 1, "aromatic": 2 },
  "temperatureCurve": [[0, 0.5], [40, 1.0], [70, 1.3], [100, 1.35], [120, 0.85]],
  "effects": [],
  "residue": {
    "nameKey": "residue.onion-perfume.name",
    "modifiers": [{
      "type": "reaction.strengthMultiplier",
      "reactionId": "reaction.infusion",
      "valuePerStack": 0.01
    }]
  }
}
```

Text is in localization files; gameplay data contains only stable IDs and values. Images, sound, and UI presentation references live in an optional asset manifest and are never required for simulation.

### Properties, types, and reactions

`properties.json` contains the canonical V1 vocabulary (`protein`, `fat`, `sugar`, `acid`, `aromatic`, `mineral`) and their validation/display metadata. `types` are independent content tags (`meat`, `vegetable`, `mineral`, etc.). A content author may add an ingredient using an existing property/type. Adding a new property family is an explicit content-contract change because it becomes selectable in the studio and needs a UI explanation.

A conventional reaction is declarative: requirements, temperature window, property participation selector, and one or more registered modifiers. A distinctive deck reaction may instead use a package-owned rule implementation, provided it respects the shared operations, lifecycle, explanations, and reaction-pulse contract.

```json
{
  "id": "reaction.browning",
  "requirements": [{ "property": "protein" }, { "property": "sugar" }],
  "strength": { "formula": "minimumEffectiveProperty" },
  "temperatureWindow": { "min": 70, "max": 110 },
  "modifiers": [{
    "type": "score.reactionParticipantMultiplier",
    "participantsWithProperty": ["protein", "sugar"],
    "perStrength": 0.25
  }]
}
```

The list of `strength.formula` values is also an engine registry. V1 begins with `minimumEffectiveProperty`; a later formula is an intentional engineering extension, not a string expression written into content.

## Modifier architecture

### Why modifier types are the extension boundary

Ingredients, reactions, encounters, chefs, pots, and residues can use the same modifier model for familiar behaviors. A shared modifier catalogue makes conventional Studio forms consistent. Deck-owned implementations are an additional extension path; they return validated host operations and explanations rather than directly mutating arbitrary game state. Reusing code is optional where it does not simplify an actual deck.

Each modifier instance supplies values and selectors; the engine owns its meaning:

```ts
interface ModifierInstance {
  type: ModifierTypeId;
  id?: Id;
  phase?: RulePhase;
  priority?: number;
  condition?: Condition;
  selector?: TargetSelector;
  params: Record<string, JsonValue>;
  source: ModifierSource;
}
```

The `ModifierTypeRegistry` is code-owned and versioned. Every entry provides:

- JSON schema for its `params` and editor form metadata.
- Allowed owner(s): ingredient effect, residue, reaction, encounter, pot, chef.
- Allowed phases and target fields.
- Pure `apply(context, params)` implementation.
- Plain-language explanation template.
- Simulation metadata, including whether it affects score, offer odds, depletion, or legality.

### Initial catalogue

The base needs a deliberately small catalogue. Content can combine these modifiers freely.

| Modifier type | Used for | Typical params |
| --- | --- | --- |
| `score.typeMultiplier` | Customer rewards/penalties by ingredient type | type, multiplier |
| `score.propertyMultiplier` | Score ingredients that carry a property | property, multiplier |
| `score.temperatureBandMultiplier` | Hot/cold conditional score | min/max, multiplier |
| `score.reactionParticipantMultiplier` | Browning/Infusion contribution | reactionId, properties, perStrength |
| `reaction.strengthMultiplier` | Residues and catalysts | reactionId/selector, multiplier |
| `reaction.retrigger` | Thermal Shock-style burst | reaction selector, strength multiplier |
| `depletion.ingredientMultiplier` | Faster/slower consumption by selector | selector, multiplier |
| `depletion.allIngredientMultiplier` | Global post-serve cost | multiplier |
| `temperature.thresholdTrigger` | One-shot cross-temperature effects | threshold, direction, once |
| `offer.weightMultiplier` | Chef and encounter offer bias | selector, multiplier |
| `offer.rerollAllowance` | Limited reroll rule | count, condition |
| `rule.servingSize` | Encounter/pot variations | litres |
| `rule.residueSlotCount` | Pot capacity/reward constraints | count formula/version |

Do not accept arbitrary executable expressions in content JSON. A new behavior can be a reviewed deck-owned rule with explicit phases, state, costs, limits, and fixtures. It does not have to become a reusable global modifier. Promote shared behavior into the catalogue when actual decks benefit; reserve host changes for genuinely new shared capabilities. The [deck architecture proposal](docs/design/DECK_ARCHITECTURE.md) defines this distinction.

### Conditions and selectors

Conditions and selectors are restricted JSON ASTs, not code strings.

```json
{
  "all": [
    { "field": "ingredient.types", "operator": "contains", "value": "mineral" },
    { "field": "pot.temperature", "operator": "gte", "value": 50 }
  ]
}
```

V1 operators: `equals`, `contains`, `gte`, `lte`, `between`, `hasProperty`, `reactionActive`, `oncePerEncounter`. The Studio renders these as sentence builders and validates legal fields by modifier type.

## Content Studio: non-technical authoring interface

Content Studio is a local web application over the content package. It is not part of the player-facing game and does not need accounts or cloud collaboration in this phase.

### Author workflows

1. **Browse and inspect.** Cards for every ingredient, reaction, encounter, pot, modifier, and residue show both player wording and exact mechanical values.
2. **Create or edit.** A guided form exposes only valid fields. Selecting “add score modifier” opens the modifier catalogue and generates the correct fields, defaults, units, and help text.
3. **See relationships.** “Used by” links and a reaction graph show which ingredients satisfy each property/reaction and which encounters or residues affect them.
4. **Preview.** A sandbox starts from a chosen seed, pot, encounter, draft script, and temperature plan. It renders the same `ScoreExplanation` as the game.
5. **Validate and simulate.** A draft change is not marked playable until validation succeeds. The Studio surfaces errors in the relevant editor field and balance warnings in plain language.
6. **Save as a change set.** Changes serialize to JSON, include content version notes, and can be reverted through normal source control. There is no opaque editor database.

### Studio screens

| Screen | Primary purpose |
| --- | --- |
| Content library | Filterable cards, search, tags, usage counts, errors |
| Ingredient editor | Base stats, curves, properties, effects, residue, live score preview |
| Reaction builder | Requirements, temperature window, modifier rows, participants graph |
| Encounter builder | Target, servings, modifier rows, estimated win-rate band |
| Modifier catalogue | Read-only documentation plus valid owner/parameter rules |
| Playtest lab | Seeded manual play, command timeline, per-event explanation |
| Balance lab | Batch simulations, target distribution, draft-choice and temperature metrics |
| Validation report | Errors/warnings by object and generated agent-readable report |

The editor never asks an author to type a modifier type, ID, condition AST, property ID, or numerical unit freehand when a controlled input is possible. An “advanced JSON” panel is optional and runs validation before applying edits.

## Validation and balance testing

Validation has three gates. Schema-valid data is necessary but not enough to be playable.

### 1. Static contract validation (blocking)

- JSON parses and meets the package schema version.
- IDs are unique and all references resolve.
- Required localization keys exist.
- Temperature curves are ordered, within global bounds, and have at least two points.
- Volumes, powers, reactivity, multipliers, slot counts, servings, and targets are within configured bounds.
- Modifier parameters, owners, phases, selectors, and condition fields are legal for their registered type.
- Reactions have valid requirements and can be satisfied by at least one ingredient combination in the package.
- No encounter requires an unavailable content capability.

### 2. Design lint (warning by default; configurable to blocking)

- Ingredient has no immediate scoring, reaction, unique-effect, or residue role.
- Property/type/reaction/residue is defined but unused.
- Reaction can be activated by only one content object or by nearly all objects.
- Temperature curve has a universally dominant temperature against its intended pool.
- A residue can never be chosen in a valid encounter.
- A modifier has no visible explanation template.
- The package contains no scorer, enabler, or engine candidate for a represented family.

### 3. Deterministic automated playtests

The simulator accepts a package version, scenario, policy, and seed list. It produces machine-readable JSON and an HTML report.

Initial policies are deliberately simple and transparent:

- `basePowerGreedy`: choose the highest immediate power.
- `reactionGreedy`: choose highest projected next-serving score.
- `lookaheadOneServe`: evaluates add/discard and all legal temperature values for the next serve.
- `randomLegal`: establishes a low-skill baseline.
- `scripted`: exact fixtures written by a designer.

Initial metrics:

- Win rate and score distribution per encounter/pot/policy.
- Fraction of offers where an enabler beats a higher raw-base-power choice.
- Chosen temperature distribution and temperature dominance.
- Base vs temperature vs reaction vs residue vs encounter contribution.
- Reaction activation rate and strength distribution.
- Ingredient pick, play, discard, and residue-choice rate.
- Negative/dead content and dominant content flags.
- Score explanation complexity: number of applied modifiers and max explanation rows per serving.

Balance thresholds live in `balance-policy.json`, not in code. For example, a tutorial encounter may require `randomLegal` win rate of at least 25%, `lookaheadOneServe` at least 70%, and no single ingredient pick rate above 60% across a declared seed set. These are design hypotheses, not universal truths; the team tunes them alongside the content.

### Golden tests and parity tests

`golden-runs.json` stores a package version, seed, initial state, commands, expected event summary, per-serving totals, and final state hash. It protects rules from accidental changes.

When Unity begins, the same fixtures are run through the C# core adapter. Every matching fixture must yield the same events, totals, and state hash. A content migration is accepted only if static validation and golden tests pass in both runtimes.

## Development-agent workflow

No AI is embedded in the game. A development agent operates through the repository and must follow the same content workflow as a human author.

`docs/agent-content-workflow.md` should instruct an agent to:

1. Read `docs/content-authoring.md`, `docs/modifier-catalog.md`, the JSON schemas, current content summaries, and current validation report.
2. Translate a natural-language request into a bounded design packet, identifying existing modifiers, any required deck-owned implementation, and any proposed host capability. Do not claim nonexistent APIs or tools are available.
3. For content tuning, edit content JSON/localization. For an authorized deck implementation, package-owned rules and presentation are in scope. A shared host change must be identified explicitly as part of the implementation proposal.
4. Once implemented, run `content validate`, targeted sandbox/golden tests, and the declared balance profile. These commands do not exist in the current prototype; never report them as passing before implementation.
5. Return a concise content-change report: changed objects, expected gameplay role, validator result, simulation changes, and any warnings needing human judgement.

The tool `content context` produces a compact, current agent bundle: schema version, available modifier types and parameter documentation, properties/types, ID index, balance policy, current content counts, and latest test report. This reduces the chance that an agent works from stale hand-written documentation.

Natural-language requests should become bounded briefs, for example:

> Add an uncommon cold-build enabler that creates a meaningful choice against high base power, works with existing V1 modifiers, is available in the Castle pool, and does not lower the Duchess encounter’s lookahead win rate below 65%.

That content-tuning brief scopes a data change. A request for a new themed mechanic uses the fuller [deck-authoring brief](docs/design/DECK_AUTHORING_BRIEF.md), including consequential choices, second-order interactions, presentation, and evidence. Simulation can establish compliance with mechanical tests, not prove enjoyment.

## Migration from the current prototype

This is the technical migration sequence once the relevant behavior is selected. The [research plan](docs/design/RESEARCH_PLAN.md) governs the immediate work: characterize existing behavior, make intentional design changes explicit, and test a playable deck before committing to a general authoring platform. Fixtures should distinguish preserved rules from intentionally revised rules.

1. Freeze the current V1 values as `content/core-v1` JSON, preserving stable IDs.
2. Extract scoring, reactions, depletion, offer generation, temperature, residues, and encounter resolution from `game.js` into `packages/game-core` pure functions.
3. Write characterization fixtures from checked prototype scenarios before refactoring them. The new core must match results where rules are unchanged; these fixtures do not establish design quality.
4. Replace the HTML’s direct data globals with a content loader and render only `StepResult` / `ScoreExplanation` output.
5. Add targeted validation/simulation against the same core as needed to test the first and second deck experiments.
6. After the contrasting decks establish real authoring needs, build the Content Studio against their schemas, exposed rule parameters, and core preview service.

Do not create the Studio first. It needs the canonical schemas, modifier catalogue, and core explanations in order to be genuinely non-technical rather than a JSON editor with a friendly coat of paint.

## Delivery sequence

These remain useful engineering deliverables, but are no longer the immediate product priority order. Begin with the playable design experiment described in the research plan, implementing only the parts of A–C needed for it. Demonstrate two contrasting decks before committing to the general Studio in D.

| Milestone | Deliverable | Definition of done |
| --- | --- | --- |
| A. Contract foundation | JSON package, schemas, loader, ID rules, migration of existing V1 data | Web build plays solely from validated JSON |
| B. Headless base | Core state reducer, phases, modifier registry, score explanation, seeded RNG | Golden fixtures run without a browser |
| C. Test harness | Validator, lint, scripted runs, initial simulator/report | Invalid content cannot be played; baseline balance report exists |
| D. Content Studio | Library, ingredient/reaction/encounter/modifier editors, sandbox preview | A non-technical author can create a valid ingredient and play it without JSON editing |
| E. Balance Lab + agent contract | Batch simulation UI, policy thresholds, generated context bundle, authoring docs | An agent can make a bounded content change and produce validation evidence |
| F. Unity bridge | C# content loader/core port, shared parity fixtures | Web and Unity give identical results for golden runs |

## Ownership and change policy

| Area | Owner | Change rule |
| --- | --- | --- |
| JSON content, values, text, asset references | Designer/content author/agent | Studio + validation + simulation |
| Deck-owned mechanics and presentation | Developer/agent implementing a deck | Shared contract, causal explanations, deck fixtures, intended mixture tests, and observed playtests |
| Balance thresholds and test scenarios | Designer with engineering support | Versioned policy change + report |
| Modifier catalogue and phase semantics | Engineering, with design request | New registry entry, schema/UI metadata, explanations, unit/golden tests |
| Data schema and migration code | Engineering | Versioned migration; content package declares compatibility |
| Web and Unity presentation | Client engineering/art | Cannot alter core calculation |

This boundary makes content iteration fast while retaining a base game that does not change accidentally every time a new ingredient is authored.
