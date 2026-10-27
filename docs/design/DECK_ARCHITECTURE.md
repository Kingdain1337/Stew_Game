# Deck autonomy inside one game

Architecture proposal, 26 October 2026. This revises the extension boundary in [the earlier technical design](../../TECHNICAL_DESIGN.md). The first experimental API is now implemented in `../../packages/game-core/`, `../../decks/`, and `../../apps/play-web/`; this document also describes future capabilities not yet built. The [thesis](POINTS_ENGINE_THESIS.md) supplies the design rationale, and playtests must determine whether these boundaries serve the experience.

## 1. What changes in the previous plan

Keep deterministic simulation, separation of rules from rendering, validated definitions, score explanations, replay fixtures, and a future Unity path.

Change the assumption that every new behavior must first become a reusable global modifier. A deck may own code for a specific mechanic even when no other deck needs that code. It must still obey the shared lifecycle and produce inspectable outcomes. The unit of authorship is a **deck package containing definitions, rule implementations, presentation, documentation, and evidence**.

The common modifier catalogue becomes a useful toolbox. It is no longer the entire design vocabulary. Generalize a mechanic when several real decks benefit from sharing it; do not require speculative reuse as the price of trying an idea.

This addresses two different requirements: decks can be mechanically distinctive, and players can transfer knowledge between them. Both require deliberate boundaries.

## 2. The shared game contract

| Area | Owned by the game | Owned by a deck |
| --- | --- | --- |
| Run | Encounter progression, victory/loss, difficulty profile, run reset | Intended pressure profile and tested matchups |
| Player actions | Offer selection, add/pass, committed heat, serve, residue choice | How those actions affect its ingredients and resources |
| Pot | Presence, ordinary serving/depletion, canonical ingredient identity and properties | Additional bounded state and typed requests to alter presence/retention |
| Scoring | Score units, arithmetic order, customer application, final total | Contributions, conversions, special reactions, and bounded copying |
| Timing | Phases, stable resolution order, command validation | Handlers in declared phases |
| Randomness | Seed handling and deterministic streams | Requests through an assigned stream when a rule needs randomness |
| Residue | Eligibility ledger, slot limit, choose/keep/replace, run-only lifetime | Effects, costs, explicit tiers, explanation, and visuals |
| Presentation | Controls, readability, causal ledger, speed/skip, accessibility | Ingredient assets, local layouts, motion, sound, effect choreography |
| Persistence | Saves, package/version lock, replay validity | Versioned state schema and migrations for its namespace |

These boundaries define the game identity. A deck cannot quietly replace the win condition, require a new scoring currency, or introduce an unrelated timed minigame. Such a proposal is a game-level design change. A deck can introduce a new resource, alter reaction behavior, transform ingredients, or create an unusual payoff while preserving the familiar actions and consequences.

A practical cohesion test: after playing one deck, can a player immediately identify the deadline, available action, cost, score, pot history, and cause of a reaction in the next deck? The new mechanic may need explanation; the entire game should not.

## 3. Package shape

Illustrative layout; build it incrementally when the first two decks need it:

```text
packages/
  game-core/               # lifecycle, accepted operations, state and score ledger
  deck-contract/           # types, schemas, compatibility rules
  presentation-host/      # event playback, visual anchors, shared controls
decks/
  culture-cellar/
    deck.json             # IDs, versions, exports, imports, compatibility
    content/              # ingredients, reactions, residue tiers, text keys
    rules/                # deck-specific pure rule implementations
    state.schema.json
    presentation/         # event mappings, renderer components, audio and motion
    assets/
    fixtures/             # exact states, commands, expected events and totals
    design.md             # identity, decisions, examples, costs, failure modes
    evidence/             # dated simulation and human-playtest findings
    migrations/
runs/
  research-profile.json   # chosen packages, pool weights, pot, encounters
```

The manifest declares package and rule versions, namespaced IDs, required host capabilities, imported/exported semantic contracts, owned state, presentation entry point, and fixture locations. A locked run records the exact active packages and their versions. Installing another deck must not change the offers in an existing run.

Keep authored data separate from code within the package. Designers and agents can tune values without touching rule implementations; a new mechanic can still have its own implementation when warranted. State and events remain serializable even when their producing rule is code.

## 4. Two ways to author behavior

**Definition composition:** an ingredient uses existing operations and modifiers. This remains appropriate for conventional multipliers, familiar conditions, temperature curves, and simple retention changes.

**Deck-owned implementation:** a new resource, conversion, trigger selection, or transformation is implemented inside that package. It declares the phases and operations it needs and includes its own explanation and tests. It need not be immediately promoted into a global catalogue.

Illustrative interface:

```ts
interface DeckRules {
  id: DeckId;
  stateSchemaVersion: number;
  capabilities: CapabilityDeclaration[];
  handlers: RuleHandler[];
}

interface RuleHandler {
  id: RuleId;
  phase: RulePhase;
  reads: StatePath[];
  writes: OperationKind[];
  evaluate(context: Readonly<RuleContext>): RuleIntent[];
}

interface RuleContext {
  snapshot: Readonly<GameSnapshot>;
  localState: Readonly<JsonValue>;
  cause: RuleEvent;
  random: AssignedRandomStream;
}

interface RuleIntent {
  kind: OperationKind;
  sourceId: EntityId;
  targetIds: EntityId[];
  causeIds: EventId[];
  payload: JsonValue;
  explanationKey: string;
}
```

The host owns operations such as consuming presence, changing a declared resource, contributing score, requesting retention, and emitting a typed reaction pulse. The deck can compute original formulas and sequences that use those operations. Supporting a truly new kind of state change requires extending the host operation contract; many new card effects should not.

The host validates and applies intentions. It rejects negative costs, undeclared state writes, illegal targets, and operations in the wrong phase. A deck cannot directly overwrite the entire score or mutate another package's private counters. Generic access to a declared shared property is allowed; undocumented access to another deck's implementation is not.

Pure functions and TypeScript types are development constraints, not a security sandbox. Initially these are reviewed, bundled first-party/developer-authored modules. Runtime loading of arbitrary third-party scripts is outside this proposal. If later required, actual isolation and resource enforcement must be designed separately.

## 5. One committed action, one deterministic resolution

The earlier prototype responds to slider input immediately. The proposed model distinguishes editable preparation from committed play:

1. **Prepare:** preview an offer and temperature. Preview runs from a cloned state and cloned RNG; it does not spend resources or advance authoritative RNG.
2. **Commit:** validate the selected offer/add-or-pass and final temperature together. Apply the accepted addition, then one temperature-change event from the previous committed temperature.
3. **Pre-serve:** resolve declared costs, conversions, and resource changes.
4. **Original reactions:** resolve ordinary property reactions and eligible original deck pulses.
5. **Derived reactions:** resolve explicitly allowed copies/echoes from original results.
6. **Score:** assemble base and bonus contributions, apply declared modifiers and customer effects exactly once, and finalize the serving total.
7. **Deplete:** apply costs scheduled for this phase, then ordinary serving removal with validated retention adjustments.
8. **Encounter/reward:** evaluate the deadline and target, update contribution eligibility, and offer the shared residue interaction when appropriate.

An accepted serving resolves atomically to a new state plus an ordered event ledger. Rendering plays that ledger afterward. Pausing, skipping, or changing animation speed cannot change the result. Invalid commands and failed rule evaluation leave the authoritative state unchanged.

Order is public. Use phase/subphase, documented priority, package ID, rule ID, and stable entity ID as tie-breakers. Filesystem iteration and registration order cannot determine results. Each handler sees the snapshot after earlier accepted operations in the declared order. Where effects are intended to act simultaneously, the host takes a named snapshot and resolves their requests with a documented conflict rule.

Examples of common conflict semantics:

- Two retention requests take the maximum requested retention fraction, subject to the legal range; they do not multiply into accidental preservation.
- A consumptive action pays its complete cost before its reward; two consumers cannot both spend the same presence from a stale snapshot.
- Echoes read a finalized original pulse and create a new score contribution, not another invocation of the original rule's costs and resource changes.
- Removing a source does not erase already accepted events. Later effects that need a live source re-check eligibility.

Specify numeric representation and rounding in the rules version before establishing parity fixtures. For the web experiment, use deterministic operations with a documented rounding policy; do not claim cross-language bitwise parity from ordinary floating-point code alone. A later portable numeric contract may use fixed-point values or explicitly rounded decimal operations where needed.

## 6. Interaction contracts, not forced code reuse

Namespacing should prevent collisions without preventing composition. Cross-deck interaction uses shared semantic meanings such as Protein, presence consumption, retention requests, and original reaction pulses.

An illustrative pulse contains:

```ts
interface ReactionPulse {
  eventId: EventId;
  parentEventIds: EventId[];
  sourceId: EntityId;
  participantIds: EntityId[];
  contributionDeltas: ScoreDelta[]; // incremental values before customer effects
  origin: 'original' | 'derived';
  echoable: boolean;
  ruleVersion: string;
}
```

Contribution deltas preserve allocation to targets, units, and the point in the arithmetic pipeline. For a multiplicative reaction, the delta is the difference before/after that reaction in the shared ordered calculation. Later multipliers are separate events. An echo copies the declared delta; it cannot claim a counterfactual contribution or accidentally copy the already-finalized whole serving.

Culture can emit a harvest pulse and Chorus can echo it without either importing the other's code. The harvested resource is spent once. If a new mechanic needs a different meaning, define a versioned contract and a fixture for the boundary rather than reusing a vaguely similar event name.

Bridge ingredients make these interfaces visible to players. They should be useful pieces in their own right, not merely obscure technical adapters. Shared properties remain the first bridge vocabulary; avoid adding many new elemental families before demonstrating a need.

Compatibility has three meanings that must be checked separately:

- **Technical:** state operations and capabilities can coexist.
- **Mechanical:** the combination terminates, preserves accounting, and has defined timing.
- **Experiential:** players can understand it and it does not collapse every build into the same dominant strategy.

A schema can help with the first. Tests help with the second. Human play is needed for the third.

## 7. Bounded growth and rule safety

Strong combinations are desirable; endless execution and invisible arithmetic are not. Each trigger declares its reset scope, legal source event kinds, cost, and repetition limit. A resource declares its owner, range, lifetime, and behavior at its cap.

Use an acyclic event-causality ledger: every emitted event points only to prior causes. This does **not** prove that the rule-trigger graph terminates; an infinite chain can still create endlessly new events. Termination needs explicit costs, per-serving/encounter counts, bounded resources, and validated copy semantics. Run a finite resolution budget as a diagnostic guard too.

Exceeding that guard fails the serving transaction with a trace for developers. Do not silently truncate a combo and pretend the resulting lower score is correct. Player-visible mechanics should have explainable bounds; the emergency execution budget is not a hidden balance rule.

Minimum invariants include finite score values, no negative presence, valid participant references, resource conservation where a rule claims conservation, no duplicate cost payment, stable replay output, and reset of all run-scoped data on a new run. Test interactions between cost reductions and zero-cost triggers explicitly.

## 8. Deck-owned performance, shared readability

A deck can ship its own ingredient renderer, motion choreography, textures, particles, sound palette, and optional resource display. The presentation host supplies stable anchors for ingredient instances, score contributions, residue slots, and resource meters.

The renderer consumes committed events containing source, target, causal parents, contribution delta, and explanation key. It may group and animate them, but may not invent score outcomes or feed animation callbacks into simulation. Cosmetic randomness uses a separate stream that cannot alter the game stream.

Shared presentation requirements:

- A known visual distinction between base output, original reaction, derived reaction, cost, and residue intervention.
- A consistent path from ingredient contribution to serving total to encounter total.
- One accessible way to inspect a cause and its exact arithmetic.
- Local animations fit within the host's playback, skip, reduced-motion, and sound settings.
- Missing assets or a failed custom renderer fall back to readable generic events; simulation remains valid.
- Amounts shown in grouped floating labels sum to the attributed contribution, with explicit display rounding.

Choreography is expressive code when useful, not necessarily an enormous declarative animation language. Preserve the event semantics and fallback. Test replay playback at normal, fast, skipped, and reduced-motion settings against the same final state.

## 9. State, residues, and saves

The host owns pot contents and installed residue references. Each deck owns a namespaced serializable state subtree. Every field declares one lifetime: serving, encounter, or run. All run state resets on victory, defeat, or a new storyline; a saved unfinished run can resume the same state.

Residue effects remain part of the source deck package even if the source ingredient has left the pot. The contribution ledger determines reward eligibility independently of current contents. Reward choices can keep, stack to an explicit tier limit, or replace a player-chosen slot.

Save/replay identity includes seed, host rules version, numeric policy, ordered package versions, package content/code hashes, run-pool configuration, and committed commands. Cosmetic asset versions can be separate if they cannot change outcomes. A package update requires a supported migration or a pinned old runtime; do not silently re-run an old save against changed rules.

## 10. The Unity consequence

JSON definitions remain portable. Deck-specific TypeScript implementations do not automatically become Unity code.

When Unity becomes active, choose explicitly between porting the used deck rules into C# with shared fixtures, or investing in a restricted cross-runtime rule representation for the behavior actually required. Begin with the simpler route justified by the validated deck set. The portable contract is state, commands, operations, events, numeric policy, and fixtures—not the assertion that all future rules fit JSON.

Shared score/event fixtures must include deck-specific behavior, costs, cross-deck interactions, and persistence. Rendering can differ between web and Unity while preserving the causal information and controls.

## 11. Implementation sequence

The first useful vertical slice is an instrumented shared loop plus one distinctive deck, visible causal resolution, and one meaningful residue decision. Keep the engine surface narrow enough to change after playtests.

Only then implement a contrasting second deck. If both fit without rewriting the shared game, the boundary has some evidence. If a second deck forces changes, examine whether the kernel was over-specialized or the deck is proposing a different game. Preserve a short decision record.

Build the general Content Studio after at least two mechanisms have demonstrated their real authoring needs. Initial tooling can be validated files, a scenario runner, and a compact inspector. The intended end product remains a developer/AI-friendly authoring system, but its abstractions should follow demonstrated design needs.
