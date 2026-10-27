# Balance check: eight-encounter engines

Historical v4 evidence. The live build uses [v5 story/serving diagnostics](BALANCE_V5.md); the old targets, pot slots and policies below are not current.

Experimental pass, 27 October 2026, rules version 4. Scripted policies verify reachable runs and expose tuning risks; they do not establish human difficulty or enjoyment.

## Rules and pressure

See [the current mechanics](DECK_REBALANCE_V4.md) for the full specification. Iron holds 3 L and two residues; Royal holds 5 L and one. A 0.4 L serving fraction retains 86.7% / 92% ordinary presence. Volume falls with presence; below 0.15, remnants join shared Broth. Broth cannot fuel furnaces.

Eight five-serving encounters use base targets **420 / 950 / 1600 / 2200 / 2700 / 3000 / 3300 / 3800**. Royal opens at 273, then shares the remaining targets. Late targets climb more slowly because a capacity-limited engine eventually reaches a steady state.

The first eight-seed Iron pass used higher final targets of 3200 / 3700 / 4300. Culture won only 1/8 immediate runs and 0/8 engine-aware runs, while Hearth won 8/8 under both policies. This motivated easing the final three encounters, not declaring the weaker deck solved.

## Final-target diagnostic

Commands:

```text
node tools/balance-report.js 4
node tools/balance-report.js 4 1 royal
```

The same four seeds were used for each of six solo/pair deck profiles, each pot, and two rough policies: 96 runs in this final-target check. Immediate maximizes next-serving score. Engine-aware adds a simple value for stored resources and opening engine ingredients. Both evaluate legal heat/draft/replacement choices through authoritative preview. Residue policy stacks an existing upgrade if available, otherwise fills free slots with a themed residue first, and keeps full/maxed slots. It is not an intelligent build planner and does not optimize conductor replacements or multi-turn Culture cycles.

Complete-run wins out of four, **immediate / engine-aware**:

| Profile | Iron | Royal |
| --- | ---: | ---: |
| Culture | 0 / 1 | 3 / 3 |
| Hearth | 4 / 4 | 4 / 4 |
| Chorus | 4 / 4 | 4 / 4 |
| Culture + Chorus | 3 / 4 | 4 / 4 |
| Culture + Hearth | 1 / 3 | 2 / 4 |
| Hearth + Chorus | 3 / 2 | 4 / 4 |

All final-target diagnostic runs cleared encounter one. The engine-aware policy did not universally outperform immediate, so neither should be treated as expert play.

The mechanisms were exercised, not merely loaded: for example, Iron solo Hearth's engine-aware runs produced 38 Overflows and 23 Blazes; Royal solo Chorus's immediate runs produced 11 Harmonies and 123 Crescendos. Iron solo Culture's immediate runs made 30 capacity replacements across four runs, compared with 21 on Royal. Counts are totals, not rates, and affected by survival length. Royal Chorus almost never hit capacity in this sample.

## Automated acceptance

31 Node tests pass, including deterministic preview/replay, eight-encounter completion, both pot retention rates, free-slot/stack/explicit replacement, Char cap/Overflow/Blaze thresholds, full-bank Culture rewards, conductor ordering and reversal, nonrecursive copies, residue multipliers, event participants/parents, rollback, card copy, and image validity.

Seven local browser smoke pages pass: ordinary serving, broth conversion (turn 13 in the fixture), Royal opening target, stage-end inspection, artwork/tooltips/score UI, ordered reaction playback, and the new two-slot residue flow. The latter fills both slots and replaces the selected second residue while preserving the first. Headless tests block the external font hosts for reliable local loading; the reaction-playback fixture stubs Web Animation completion while testing event order and score increments.

## Known tuning risks and next evidence

- Culture is still appreciably harder on Iron in these bots. Its existing understandable grow/harvest identity was preserved; its residues are stronger. Observe deliberate Sugar Glaze cycles and whether the second residue slot compensates for the smaller pot before changing the engine again.
- Royal's retention and accumulated properties produce large late scores, particularly for Hearth/Chorus. One residue slot may not fully offset that advantage. These pots are now mechanically distinct, not proven equally strong.
- Crescendo is much easier to obtain than Harmony because default chemistry already places Browning before Extraction. Harmony is tested and occurs in simulations, but its frequency and reward need human evaluation.
- Early targets intentionally leave setup room. Several automated builds comfortably beat later targets; watch for repetitive victory laps during encounters six through eight.
- The sample is small, both policies are shortsighted, and fixed residue preferences bias the result. No human win-rate or fun claim follows from this table.

Next playtest: solo Hearth without waiting for Dumplings, solo Bellglass with a deliberately reversed conductor order, and Culture in both pots using Sugar Glaze. Record replacement decisions, engine uptime, per-encounter pressure, and whether the full story remains engaging. Keep numerical tuning provisional.
