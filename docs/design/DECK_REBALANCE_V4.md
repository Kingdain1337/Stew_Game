# Playtest response: engines with room to mature

Rules version 4, 27 October 2026. Historical specification, superseded by [stories and servings v5](STORIES_SERVINGS_V5.md). Engine identities remain useful context, but the run length, portion rules, residue levels/slots and targets below are no longer current.

## Shared run

Eight encounters, five servings each: 40 drafting decisions and seven residue rewards. Ingredients, resources and residues carry between encounters, never between runs. Capacity is still the only ingredient limit.

Current base targets: 420 / 950 / 1600 / 2200 / 2700 / 3000 / 3300 / 3800. See [the balance check](BALANCE_CHECK.md) for diagnostic results and remaining asymmetries.

Iron holds 3 L and two residues. Royal holds 5 L and one residue. A bowl uses a 0.4 L serving fraction: ordinary presence retention is `1 - 0.4 / capacity`, or 86.7% / 92%. Occupied ingredient volume falls proportionally; a partially filled pot does not lose a literal 0.4 L of ingredients. Base score still divides by pot capacity. Iron concentrates early scoring and combines two upgrades; Royal sustains more ingredients and longer reaction chains, at lower early concentration. Its opening target is 35% lower. Broth conversion remains strictly below 0.15 presence.

## Char Hearth: bank, sustain, or cash out

A furnace burns the oldest eligible Protein at 90°C+, normally spending 0.20 presence for one Char. Sources and special ingredients require at least 0.25 presence. Maximum Char is six.

- Bank: with an operational furnace, Browning's point bonus is multiplied by `1 + 0.2 × Char`, reaching ×2.2. Normal Browning still requires Protein and Sugar at 70–110°C.
- Sustain: if already at six before the burn, the burn produces a 120-point Overflow instead of wasting the resource gain. Smoke Pear multiplies this by 1.5. Fuel is still consumed.
- Cash out: at 110°C+, after the burn, automatically spend a bank of at least three for a Blaze: 60 points per Char, or 80 with Ember Truffle. No furnace or Dumpling is needed to spend stored Char; an operational non-broth recipient is needed. The emptied bank no longer boosts Browning that turn.
- Auxiliary routes: Dumplings repeatedly score `25 × banked Char × presence`; Cinder Bean spends one Char at 40–60°C to retain 96% on the oldest other furnace and oldest other Protein, at most two distinct targets.

Decision fixture: with six Char, furnace, Protein and Sugar at 95°C, retaining the bank gives a ×2.2 Browning and Overflow each fueled turn. At 110°C, the same turn may Overflow then cash out, but loses the banked Browning boost and future Dumpling income. Choose the burst near a deadline or before losing the furnace; preserve the bank when fuel and time remain. At 105°C Infusion has already stopped, but Char is not cashed out. These are exact, visible thresholds rather than random procs.

## Bellglass: the order has consequences

Glass Noodle echoes 125% of the first positive echoable original pulse; Bell Herb echoes 75%. Only one source echoes per serving, with Noodle priority. Presence cost is 0.10. Echoes are derived and cannot trigger another echo.

Operational conductors prioritize common chemistry in ingredient age order, with instance ID as the deterministic tie-breaker. Inactive reactions are skipped. Silver Cream leads Infusion; Chime Fruit leads Preservation at 0–60°C, otherwise Browning; Crystal Citrus leads Extraction. Any unprioritized chemistry retains the ordinary Browning → Infusion → Extraction → Preservation order.

Common chemistry still scores before deck originals such as Harvest, Overflow and Blaze. Conductors do not move a deck pulse ahead of chemistry. Suppressing all positive chemistry can expose a deck original as the echo target; the preview shows the actual sequence.

- Harmony: if Infusion scored before Browning, the oldest operational Quiet Mushroom adds a derived copy of Browning at `100% × Mushroom presence`.
- Crescendo: if Browning scored before Extraction, the oldest operational Resonant Marrow adds a derived copy of Extraction at `100% × Marrow presence`.
- Both inspect actual positive original pulses, not merely active reaction labels. Reversing either pair disables its bonus. Each bonus records both prerequisite event IDs and all participants; neither can echo.

Decision fixture: Cream + Mushroom + Protein + Sugar at 80°C can lead Infusion and earn Harmony. An older Chime Fruit instead leads Browning: the Noodle now copies Browning, but Harmony is lost. Replacing that older conductor restores the sequence. Leading Extraction with Citrus may echo a large Extraction, but sacrifices Crescendo. Default Browning-before-Extraction remains a straightforward entry route; the more constrained Harmony provides another build direction. These choices still need human observation for readability and value.

## Residues

All have three tiers. The values below list tiers 1 / 2 / 3. Taking an installed residue stacks it; installing a different one uses a free slot or explicitly replaces the selected slot. At maximum tier, keep or choose another. No hidden replacement of the other Iron slot.

| Residue | Effect |
| --- | --- |
| Hearth Coating | Browning and Extraction bonus points ×1.5 / ×2 / ×2.5; only each reaction's normal requirements apply. |
| Cool Coating | Infusion and Preservation bonus points ×1.5 / ×2 / ×2.5; no additional temperature gate. |
| Seasoned Crock | Every harvest spending at least four Culture returns 1 / 2 / 3 Culture. Spending the returned small bank does not refill it again. |
| Sugar Glaze | Every valid growth gains 1 / 2 / 3 additional Culture; harvesting exactly six gains ×1.5 / ×2 / ×2.5 harvest points. |
| Banked Embers | Every furnace burn costs 0.15 / 0.10 / 0.05 presence; Overflow points ×1.75 / ×2.5 / ×3.25. |
| Coal Keeper | Each new encounter grants 2 / 4 / 6 Char, capped at six; a full-six Blaze gains ×1.5 / ×2 / ×2.5 points. |
| Tuned Rim | Every echo costs 0.08 / 0.05 / 0.02 presence, not just the first echo of an encounter. |
| Silver Note | When three distinct common reactions score positively in one serving, add 100 / 200 / 300 percentage points to the opener's echo. A tier-one Noodle copies 225%; a tier-three Noodle copies 425%. |

Amplifiers multiply the named reaction delta, not base score or the entire bowl. Later reactions can compound the boosted running score, and echoes copy the boosted original. This is intentional second-order interaction and a priority for balance monitoring.

## Reusable design lessons and next observations

A capped investment needs a useful steady-state outlet, not only a rare payoff card. A resource can support three distinct questions: hold it for recurring leverage, feed an overflow engine, or spend it against a deadline. The costs and lost future benefits must remain visible.

Order controls are meaningful only if changing order changes a reward or opportunity cost. Bellglass now supplies both an opener-sensitive echo and directional two-reaction recipes. Adding more conductors alone would not have solved the problem.

A longer run needs decisions and maintenance, not merely more rounds of the same score. Capacity replacement, fuel consumption, conductor age and seven residue choices are the intended sources of adaptation. Test whether players actually use them before adding more encounter count.

Next playtest: can a new Hearth player identify a non-Dumpling plan? Can a Bellglass player predict which recipe is disabled by a conductor? Does a full pot produce difficult replacements? Do residues change drafting and heat choices? Does the eighth encounter feel like an earned climax rather than a repetitive victory lap? Scripted scores can expose numerical failures, but cannot answer those questions.
