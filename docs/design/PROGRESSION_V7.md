# Story, stars, and residue progression (rules v7)

Each chapter has a pre-brief (`narrative`) that states the situation and cooking stakes without narrating the result. A successful chapter reveals its authored `resolution` above the reward picker; the final resolution also appears above the story ending on the win screen. Losing does not show a success resolution.

## Stars

Each chapter retains its pass target. Two and three stars add score and mechanical requirements:

| Rating | Score | Mechanical requirement |
| --- | ---: | --- |
| ★ | `target` | All boss demands fulfilled |
| ★★ | `ceil(target + 10√target)` | At least one positive scoring pulse during the chapter |
| ★★★ | `ceil(target + 26√target)` | At least two distinct positive scoring pulse sources in the same bowl |

These are chapter ratings, not extra failure conditions. Square-root gaps make the absolute challenge grow with the story without making late chapters unreachable at a fixed 2–3× multiplier. The UI displays all three exact targets and the concurrent-source condition. The engine records the stars in the encounter result event.

## Residues

There are 32 residues, eight per deck. Twelve new common and four new uncommon residues give straightforward, modest score bonuses for types, temperatures, serving sizes, or all bowls. The previous, more conditional residues mostly occupy the rare and ultra-rare tiers. Rarity dictates maximum level: Common 10, Uncommon 8, Rare 5, Ultra-rare 3. The authored rare effects interpolate from their old level-one power to their old maximum power, so adding levels does not multiply their previous ceiling.

At each successful chapter, the game deterministically draws three distinct offers without replacement from eligible, uninstalled residues. Draw weights are Common 12, Uncommon 5, Rare 1.5, Ultra-rare 0.35. Only decks whose non-system ingredients contributed points are eligible. The chosen residue starts at level one; a full pot requires explicit replacement, and keeping the current pot remains available.

Objectives count only after installation. A counter upgrades immediately on reaching its target, carries surplus progress through multiple levels in one serving, and stops at the rarity cap. Size, heat, addition, and pre-serve resource objectives resolve before scoring, so a newly earned level can affect that bowl. Reaction and scored-type objectives resolve after the scoring events that establish them, with no retroactive points. Silenced residues neither apply nor progress for that bowl. Simple residue bonuses appear as their own point events in the ledger.
