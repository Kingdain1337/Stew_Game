# From design thesis to evidence

Current implementation note (27 October 2026): the numerical experiments below predate rules version 4. The playable game now has eight encounters, 3 L / two-slot and 5 L / one-slot pots, 0.4 L serving fractions, stronger reaction residues, Char Overflow/Blaze, and conductor-dependent Bellglass bonuses. Use [the current rebalance specification](DECK_REBALANCE_V4.md) and [implemented contract](IMPLEMENTED_DECK_CONTRACT.md) for executable rules; retain the earlier scenarios below as design history, not current card instructions.

Research and delivery plan, 26 October 2026. A first playable implementation, deterministic tests, and bot diagnostics now exist; human observation and hypothesis testing below remain to be done. The purpose is to improve the game and produce a reference library another developer and AI can use. A working simulator is useful evidence about rules; it does not establish that a game is enjoyable.

Current implementation update: occupied ingredient volume is listed card volume × remaining presence, so serving frees space. Below 0.15 presence after serving, remnants enter shared Broth, which adds 0.25 to five properties (not Fat). Capacity is the sole ingredient limit, with no separate ingredient places. The Stage 0 note below records an earlier design question and should not be read as the current runtime rule. See [balance evidence](BALANCE_CHECK.md) for the fresh scripted check; human-choice evidence is still needed.

Pre-capacity-only diagnostic (8 seeded runs per profile and policy at 300/510/780 targets): the rough bots cleared encounter one in every run. Complete-run wins ranged from 2/8 for Culture with an immediate-gain policy to 8/8 for Hearth with an engine-aware policy; paired decks were 5–6/8. These results are a historical baseline, not current balance evidence. After removing ingredient places, the old targets became too easy. The subsequent Broth/volume and target pass is recorded in [balance evidence](BALANCE_CHECK.md). The first human sessions should specifically test whether the opening teaches a plan, whether Culture setup is legible, and whether Hearth's retention route is disproportionately strong.

## Questions in priority order

| Hypothesis | Test | Evidence against it |
| --- | --- | --- |
| Changing the pot or deadline changes sensible draft choices | Present the same offers in several states, ask for a choice and reason, then compare outcomes | The same high-power card dominates nearly every state |
| A distinctive mechanic creates discovery beyond memorized pairs | Teach a simple interaction, then present an unseen transfer situation | Players can repeat a recipe but cannot infer a new use |
| Burst versus retention creates meaningful temporal decisions | Compare short/long horizons and different remaining targets | The same timing wins across states, or setup never survives |
| Residue gives the run a recognizable identity | Ask players what changed after the reward and record subsequent decisions | They cannot identify its effect, or it never changes a choice |
| Attributed spectacle makes the engine easier and more satisfying to follow | Compare causal feedback with a readable baseline and equally energetic unattributed effects | More spectacle raises confusion or waiting without improving reported experience |
| Shared deck boundaries preserve one game's identity | Move players from one deck to another, then allow a mixed run | They must relearn the common controls, timing, or score meanings |
| The thesis improves authorship | Give a new developer/AI a held-out theme, then evaluate its deck using the same tests | Output is a reskin, requires hidden host changes, or has no plausible decision reversals |

These are falsifiable working hypotheses, not universal laws. A rejected hypothesis is useful design knowledge and belongs in the example library.

## Stage 0: establish the experiment

Keep the existing prototype as a named comparison state before changing rules. Record its files or commit under the implementation task, together with known behavior and the current design documents. Syntax validity and historical fidelity do not make accidental behaviors desirable; mark intentional changes separately from regressions.

Confirm the research profile in a small versioned file when implementation starts:

- One neutral 5 L pot, three encounters, five servings each to begin with.
- One primary candidate deck plus a compact ordinary pantry.
- One residue slot for the first replacement-pressure experiment.
- Residue and deck resource persistence only within a run.
- One committed temperature change per serving; slider previews have no side effects.
- Visible current deadline and next encounter's relevant pressure before choosing residue.

Keep volume out of new decision claims until its rule is decided. The initial mechanic experiment may retain the existing dissolved-presence model and omit volume from decision-facing cards. Test capacity/displacement separately if it is intended to be a core source of scarcity. Do not quietly add it while comparing two decks.

Deliverable: a small scenario set, explicit invariants, and a list of intentional differences from the original prototype. Avoid migrating an untested design into a large platform first.

## Stage 1: one complete playable experiment

Start with Culture Cellar because it directly tests delayed payoff, temperature commitment, retention, ordinary reaction bridges, and residue memory. Implement only what it needs:

1. Seeded offers and a command/event record sufficient to reproduce a serving.
2. The common scoring/depletion loop with honest previews and contribution attribution.
3. A compact set of ordinary ingredients plus the culture mechanism.
4. One useful residue choice after encounter one and a keep/stack/replace choice after encounter two.
5. A visible source-to-target harvest with attributed numbers, plus speed/skip and a readable ledger.

Include deliberately constructed scenarios where a small early harvest is right, where waiting is right, and where the culture plan should be abandoned. Complete a normal three-encounter run and an unsuccessful run.

Exit condition: the whole intended experience can be played, instrumented, and explained. This stage is not complete if only the formula works in a test runner or only an animation demo exists.

## Stage 2: check understanding and interest with people

Begin with roughly 6–8 exploratory participants across familiarity levels. This is a practical formative sample, not a statistically powered validation study. Record who already understands engine games. Conduct additional sessions when the same uncertainty remains; do not treat the first group's preferences as universal.

Suggested session:

1. Teach the shared controls and basic scoring with a short neutral scenario.
2. Let the participant make several choices without coaching. At selected pauses, ask what they expect and why.
3. Play a short seeded run. Avoid continuous think-aloud during every animation, since it can change pacing and attention.
4. Replay a different, matched scenario requiring the same relationship in a new situation. This tests transfer rather than memory of the exact offers.
5. Ask which decision felt consequential, which event surprised them, and whether they would voluntarily try another build. Ask them to explain one success and one failure.

Use predefined observation notes and retain contradictory evidence. Distinguish "I understood," "I enjoyed," "I felt clever," "I felt overwhelmed," and "I wanted another run." They are different outcomes.

Provisional formative exit gate: most participants can explain a demonstrated interaction, identify their residue's consequence, and describe a plausible alternative to an important choice without being told the answer. Any frequent misunderstanding about costs, copied scores, or timing sends the design back to revision. Numerical percentages from this small group should be reported as counts with context, not claims about all players.

## Stage 3: use simulation to challenge the design

Add scenario and policy runners as needed to answer specific questions. Policies should include random legal actions, immediate-score greed, and a short-horizon planner that includes later depletion and deadlines. A one-serving optimizer is useful but structurally favors immediate payoff; it cannot fairly evaluate investment by itself.

Use matched seeds and record exactly what each policy is allowed to know. Compare strategies within each deck, pot, encounter, and difficulty profile. Replay failures and surprising successes. A bot that cannot discover a mechanic does not prove that the mechanic is weak.

Record:

- Offers, available actions, chosen action, committed temperature, and the state at the choice.
- Original and derived reaction events, costs, resource changes, contribution targets, and residue interventions.
- Score trajectory, final margin, and remaining presence.
- When the basic engine first worked; define this separately for each mechanic. For Culture it might mean a positive harvest after player-controlled generation, not merely owning a source.
- Alternative actions in sampled states, including their short- and longer-horizon outcomes.
- Residue eligibility, offered options, tier/replace/keep decision, and downstream use.

Useful diagnostics include context-dependent choice reversals, time-to-function, failed setups, recoverable pivots, temperature usage, ingredient access, and run outcomes. Report distributions and worst-case traces, not just average score.

Pick rates require an offer denominator. A rare ingredient cannot be interpreted by its raw number of picks. Winning-run correlations are confounded by player skill, early strength, and encounter access. Removing a component in a controlled fixture or replaying an alternative action gives stronger local evidence, but those results still depend on the scenario and horizon.

Do not optimize for equal win rates across all policies, equal pick rates for every ingredient, or maximum total score. Straightforward and difficult strategies can coexist. The relevant failure is a strategy that crowds out the choices the deck was designed to create.

## Stage 4: distinguish mechanics from performance

Once the mechanism is intelligible, compare:

| Condition | Rules | Feedback |
| --- | --- | --- |
| Readable baseline | Identical | Clear state changes and contribution labels, restrained motion |
| Attributed performance | Identical | Ingredient connections, costs, pulse/echo sequence, source-linked numbers |
| Unattributed performance | Identical | Similar motion/sound intensity without equally clear causal grouping |

Counterbalance presentation order and use comparable scenarios. Keep score values, choices, readable text, and approximate playback duration matched so that the comparison is not simply "unfinished versus polished" or "slow versus fast." Ask about enjoyment and confidence separately, and check explanation accuracy afterward. Also test fast and reduced-motion playback.

An exploratory result can justify another iteration, not a broad causal claim. If a formal thesis is pursued, predefine outcomes, recruit an appropriately powered sample, document consent and data handling, and distinguish exploratory findings from confirmatory tests. No such participant study has been conducted for this project yet.

## Stage 5: prove deck autonomy with a contrast

Implement Char Hearth or Bellglass Chorus next. Favor Hearth if the uncertainty is temporal cost and changing ingredient value; favor Chorus if the uncertainty is score attribution, copying, and causal performance.

Reuse the shared game contract, but permit deck-owned code. Record every host change the second deck requires and why. If most changes are deck-local, the architecture is supporting authorship. If every card requires a new global engine feature, the extension boundary is still too narrow.

Test each deck alone, then the intended pair. Validate legal operations, termination, costs, ordering, save/replay, and score conservation where applicable. Observe whether knowledge transfers between decks. Do not advertise arbitrary mix-and-match compatibility from testing only one pair.

## Stage 6: build the developer and AI reference library

Promote a deck from candidate to reference only with a dated evidence record. Each reference contains its brief, complete rules, fixtures, successful ordinary and exceptional runs, failures, rejected designs, and playtest observations. Keep the earlier versions so an author can see what changed and why.

Use a held-out generation brief, for example: "Create a woodland deck about decay feeding new growth, using the common actions and one local resource. It must support a normal build, a risky conversion build, and a fallback."

Give the author the thesis, shared contract, and at least two tested references. Evaluate the resulting design without quietly supplying additional rules during review. Check that it states consequential choices, defines costs and timing, produces runnable traces, respects the same controls, and explains its visual causality. Record human corrections and unsupported claims.

If the thesis is intended to improve AI design quality, compare against an authoring attempt given only the theme and API under similar time/tool constraints. Multiple themes and independent evaluations are needed before making claims about general effectiveness. One attractive generated deck is a demonstration, not validation of the authoring method.

## Delivery order and stopping conditions

| Deliverable | Why now | Advance when |
| --- | --- | --- |
| Thesis and explicit prototype diagnosis | Gives implementation a design question | Claims, assumptions, and evidence are separated |
| One playable mechanic with residue and spectacle | Tests the full experience | Players can make and explain meaningful choices |
| Targeted simulation and revised balance | Challenges apparent depth and reliability | Dominant defaults and inaccessible plans are understood |
| Second deck and one mixed configuration | Tests architectural flexibility and game identity | Shared rules still feel familiar and interactions are defined |
| Tested example library and authoring trial | Tests transfer to another developer/AI | A new theme works with documented, manageable corrections |
| Wider content tools and Unity work | Scales demonstrated needs | The actual rule and presentation contracts have evidence |

Do not call the research complete because the code is well organized, or call a deck bad because an arbitrary threshold failed once. Each experiment ends in one of three concrete outcomes: preserve the rule with evidence, revise it with a stated reason, or remove it and retain the lesson.
