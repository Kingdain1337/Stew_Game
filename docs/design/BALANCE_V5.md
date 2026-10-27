# Balance diagnostics — stories and servings v5

27 October 2026. This is a small deterministic diagnostic, **not a measured player win rate or a claim of finished balance**. It supersedes the v4 balance numbers for the current build.

## Method

`tools/balance-report.js` compares two bounded, one-bowl policies using authoritative preview. Both search legal offers, replacements, temperatures and portion sizes, honor boss restrictions, pick the first seeded stock, install themed residues before Pantry when slots are free, and keep full slots. They do not choose intelligently among objectives or plan multi-bowl conductor/Culture sequences.

Immediate maximizes current points. Engine-aware caps the value of immediate points at the chapter's remaining target, then adds heuristic value for remaining ingredient power and resource changes. This represents the real rule that surplus points cannot pay the next chapter's target. It is not an optimal solver.

An initial curve of `400 × 1.34^index` with a 20% boss premium yielded no complete wins in the initial Iron/royal sample (24 runs) or Royal/road sample (12 runs). The shipped curve keeps geometric growth but uses 1.28: **400 / 512 / 786 / 839 / 1074 / 1649 / 1759 / 2252 / 2882 / 4427**. Pot choice does not alter targets.

## Shipped-curve sample

```text
node tools/balance-report.js 2 1 iron royal
node tools/balance-report.js 1 1 royal road
```

Six deck profiles × two policies: 24 Iron/royal runs and 12 Royal/road runs. Iron uses seeds 1–2; Royal uses seed 1. Same seeds within each configuration. Wins shown as **immediate / engine-aware**:

| Selected theme(s) | Iron, royal story (out of 2) | Royal, road story (out of 1) |
| --- | ---: | ---: |
| Culture | 0 / 2 | 0 / 1 |
| Hearth | 2 / 2 | 1 / 1 |
| Chorus | 0 / 2 | 0 / 1 |
| Culture + Chorus | 0 / 1 | 0 / 1 |
| Culture + Hearth | 0 / 2 | 0 / 1 |
| Hearth + Chorus | 0 / 2 | 0 / 1 |

The Royal/road Culture immediate run used 50 large bowls and reached the final encounter, scoring 2415 against 4427. The engine-aware run used **30 small / 1 standard / 19 large**, made 23 capacity replacements, completed five residue objectives and won with 6578 in the final encounter. Its opening chapter scored 452 rather than 794: lower immediate points supported a stronger final pot. Hearth also remains strong under the immediate policy, so this is not evidence of equal deck difficulty.

Iron/royal engine-aware profiles used 68–76 small bowls across their two seeds, versus the immediate policy's ten mandatory princess small bowls. Capacity became an active decision: preserving policies made 38–52 replacements per two runs, compared with 0–4 for points-only policies. This is useful evidence that pot volume and portions interact, but may also indicate excessive replacement friction.

## What this does and does not establish

- All six profiles have a legal complete run in the final sample. Both shipped stories and pots appear in the sample, but every story/pot/seed combination has **not** been exhaustively tested.
- Objective upgrades, Char Overflow/Blaze and directional Chorus copies occur in ordinary simulated runs. Dedicated deterministic fixtures test Culture cycles and mechanics the greedy policies neglect.
- Standard bowls are uncommon in these bots. Human testing and potentially better multi-step policies are needed before deciding whether standard is a meaningful middle choice.
- Many early targets are generous. That supports setup, but human sessions must determine whether ten five-bowl chapters feel rewarding or padded.
- The large difference between policies is a design hypothesis worth testing, not causal isolation: they differ in draft, heat, replacement and resource choices as well as portions.
- Witch selection is visible and reproducible; fairness and late-game swinginess are unmeasured.

The browser journey fixture separately plays a natural 50-bowl victory with Culture, Royal pot, road story and seed 1, checking UI/core agreement through ogre, witch and dragon demands. Unit fixtures cover illegal actions and exact numeric effects. Neither replaces playtesting.

Next: test both pots on both stories with human players; record chosen sizes, voluntary replacements, turns after target completion, objective completion, and what players expected each reaction to do. Only then tune the portion curve and target curve further.
