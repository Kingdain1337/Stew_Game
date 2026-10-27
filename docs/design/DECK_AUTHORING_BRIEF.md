# Developer and AI deck-authoring handoff

Implementation baseline: [rules v5](STORIES_SERVINGS_V5.md) and the [implemented contract](IMPLEMENTED_DECK_CONTRACT.md). A deck must now work with all three portions, both independent story routes, temporary residue silence and objective-based level-2 upgrades. Test it as a foreign princess ingredient as well as a selected deck. The story system owns boss demands; deck mechanics must not silently override them.

Use this with the [design thesis](POINTS_ENGINE_THESIS.md), [deck contract proposal](DECK_ARCHITECTURE.md), and dated reference decks. The current [examples](DECK_EXAMPLES.md) are candidates, not certified good designs. This is project design guidance, not a claim that an authoring tool or runtime API already exists.

## Start with a bounded request

```text
Create a Forever Stew deck based on [theme].
Its central mechanic is [mechanic or design question].
The intended experience is [what the player should feel/learn].
Use the shared draft, pot, temperature, serving, encounter, and residue loop.
Residues and deck resources persist only within the run.
Target [audience/complexity], [run profile], and [solo/mixed pool].
Use [available host capabilities]; deck-owned mechanics code is allowed.
Aim for [content scope] and one new visible resource at most initially.
Provide mechanical and presentation specifications, scenarios, and evidence.
Mark every unimplemented capability and every untested claim explicitly.
```

For example: "Design a woodland pantry where decay becomes a resource for new growth. It should let a player decide when to give up current output for future recovery. Include an ordinary reliable build and a more ambitious sacrifice build. Work with the existing heat/serve controls and remain useful beside ordinary Sugar/Protein ingredients."

Do not begin by generating a long list of themed names. First explain the decisions that will make those cards different to play.

## Required design packet

### 1. Identity and the shared game

State the theme, intended experience, central verb, and one-sentence engine. Identify which familiar actions the player will use. Explain how another deck's player can understand the basic interface immediately.

List proposed new concepts and their necessity. A single new resource is an initial complexity budget, not an eternal engine limitation. If more are needed, explain the concrete decision that would disappear without them.

### 2. Decisions before cards

Provide at least three decision scenarios. For each, give current state, remaining deadline, available choices, the apparently attractive option, the actual tradeoff, and which change in state would reverse your recommendation.

Include immediate survival versus investment, a build commitment or pivot, and a residue keep/stack/replace choice. Do not invent a mandatory per-serving target if the run only checks its cumulative encounter target at the end.

### 3. Rules with complete semantics

For every mechanic, define:

- Trigger, phase, eligibility threshold, and exact condition.
- Input state, source, target selection, and stable tie-breaking.
- Formula, units, arithmetic placement, and rounding.
- Cost, whether it must be paid in full, and what happens if it cannot be paid.
- State lifetime and reset scope: serving, encounter, or run.
- Repetition limit, behavior at caps, and handling of several copies.
- Original versus derived event semantics and whether copies can trigger other effects.
- Interaction with source removal, depletion, customer modifiers, and residue.
- Player explanation and the events that communicate the effect.

Do not use words such as "sometimes," "amplifies," "preserves," "nearby," or "repeats" as a substitute for specifying the rule. If a number is provisional, give the value used in fixtures and mark it as a tuning parameter.

### 4. Content and build coverage

Create a compact roster with complete base stats, curves, properties, mechanics, eligibility, and residue references required by the active schema. Map scorers, enablers, converters, payoffs, stabilizers, and bridges where those roles exist.

Describe:

- A functional common build with alternative pieces for important roles.
- An unusually strong build and why it is not automatic.
- A fallback if the distinctive engine does not come together.
- One useful bridge to ordinary ingredients or another explicitly compatible deck.
- One expensive or harmful combination that the player can understand and avoid.

Explain how pool size and offer access affect whether the engine can appear in time. Do not assume that a rare-card combo is accessible merely because every ingredient exists in the files.

### 5. Demonstrate a second-order effect

Explain a state in which the mechanic changes the value of something indirectly: consumption makes a previously weak ingredient valuable; retention protects a future trigger; disabling one reaction improves the next; transforming a property opens a later route.

Show the entire causal chain and its cost. State which links use general rules and which are special cases. The reader should be able to transfer the reasoning to a different ingredient.

### 6. Presentation

Provide a short storyboard for the signature interaction: anticipation, source/target contact, state change, attributed payout, and residue intervention if any. Define how it compresses during repeated use, how a player inspects it, and what remains in reduced-motion mode.

List assets and deck-owned renderer behavior separately from simulation effects. Cosmetic randomness, bounce, and audio must not decide gameplay. A static fallback still communicates source, targets, cost, and score.

### 7. Verification and uncertainty

Supply exact miniature fixtures for a normal activation, ineligible state, insufficient cost, multiple copies, cap/reset behavior, and an intended cross-deck interaction. Include a longer trace where the engine succeeds and one where pursuing it fails.

Run only tools that exist. A proposed validator is not a passing validator. Report implemented checks, outputs, limitations, and open design questions. Separate ordinary simulation results from observed human enjoyment and comprehension.

For new code, include deterministic replays and malformed/looping-rule checks appropriate to the effect. For pure content tuning, use the relevant existing validation and scenario suite. Avoid adding tests that merely repeat a data literal without testing a behavior.

## Review rubric

Use evidence and a short written assessment rather than one total "fun score."

| Dimension | Evidence expected | Warning sign |
| --- | --- | --- |
| Identity | Different decisions and a recognizable performance | Renamed ingredients with the same dominant plan |
| Accessibility | Basic engine works with ordinary pieces | One exact rare ingredient enables all play |
| Agency | Several state-dependent choice reversals | Always choose the largest immediate number |
| Depth | Transferable second-order consequence | Only explicit named recipes |
| Timing | Setup, payoff, and failure horizon specified | Infinite scaling or investment that never pays before defeat |
| Residue | Changes later choices and has limits | Invisible percentages or automatic stacking |
| Coherence | Shared controls and meanings still apply | Separate mini-game hidden inside the deck |
| Spectacle | Causes, costs, and ownership remain legible | Unattributed effects or repeated unskippable waiting |
| Composability | Explicit bridges and hostile interaction tests | Assumption that schema validity implies balance |
| Honesty | Claims match actual evidence | Invented playtests, invented tool results, or claims of proven fun |

An agent may propose new deck-local logic; it should not silently expand the shared game contract or invent already-available APIs. If a new host capability is necessary, include a bounded implementation proposal and its tests as part of the design packet. Whether that code is implemented depends on the active task, not on a blanket prohibition of unusual mechanics.

The finished handoff should let another developer identify what to build, why each choice exists, how to check the arithmetic, how to present the result, and what human play still needs to establish.
