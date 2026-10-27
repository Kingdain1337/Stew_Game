# Stories, servings and residue objectives — rules v5

Implemented 27 October 2026. This supersedes v4's eight-encounter route, pot-specific target, fixed bowl size and repeat-pick residue upgrades. The engine identities and event-driven presentation remain. Tuning is provisional; see [balance evidence](BALANCE_V5.md).

## Player loop

Choose one or two themed decks plus Pantry, a story, a pot and a seed. Story and pot are independent. A new pot is empty. Choose one of three distinct seeded stocks, read chapter one, then begin cooking. Each chapter has five bowls; each story has ten chapters split into arcs of 3 / 3 / 4. Arc finales are bosses. Nine chapter rewards offer new residues or a keep/continue action. Ingredients, stock/broth, deck resources, installed residues and objective progress carry between chapters, not between runs.

The chapter introduction can be closed for inspection and reopened from the banner. During cooking, Read chapter revisits the narrative. End-of-chapter prompts retain the inspect/reopen flow, so the last bowl's score ledger is accessible before choosing a reward. No save/resume or cross-run progression is added.

## Stocks, broth and portions

Six starting stocks offer two faint properties each and Power 6. A choice adds 0.6 L at full presence. Stocks are system ingredients, never normal offers or furnace fuel. They otherwise decay like ingredients. Below 0.15 presence their surviving volume joins the shared broth.

Broth supplies fixed 0.25 Sugar, Acid, Aromatic, Protein and Mineral while present; no Fat. Its base Power is 18 at 0.6 L or more, scaling proportionally below that. Base points still divide by pot capacity. Properties do not increase when more remnants join. Broth volume is also depleted by serving.

| Bowl | Serving fraction | Bowl score | Iron retained | Royal retained |
| --- | ---: | ---: | ---: | ---: |
| Small | 0.2 L | ×0.65 | 93.33% | 96% |
| Standard | 0.4 L | ×1 | 86.67% | 92% |
| Large | 0.7 L | ×1.5 | 76.67% | 86% |

Ordinary retained presence/volume is `1 - servingFraction / potCapacity`. These litre values specify a fraction of capacity, not a literal volume removed from a partly filled pot. An Iron pot containing 1 L loses about 0.067 / 0.133 / 0.233 L before extra costs/conversion. The same fraction acts on broth volume.

Retention abilities are stated at standard size: a 96% keeper keeps 98% / 96% / 93% with small / standard / large. Extraction's extra acid depletion also scales with portion. Explicit furnace and echo presence costs do **not** shrink with portion: a small bowl saves ordinary serving loss, not the fixed cost of triggering an ability.

Portion multipliers apply to every scored contribution after reaction resolution and customer preference, including deck pulses. They do not change reaction eligibility or raw copy amounts. Tasting Spoon improves small portions; Grand Table improves large portions if three non-system ingredient types are present. A fulfilled princess request multiplies the whole bowl by 1.35. The preview, ledger and individual animated increments use these same factors.

Small bowls preserve future property strength and fill the pot faster as new drafts arrive; large bowls make immediate progress and free more room. After securing a chapter target, remaining bowls can bank resources and progress objectives. The UI now explicitly points out this opportunity. Surplus chapter score does not pay the next chapter's target.

## Stories and bosses

All authored text, chapter preferences, portraits, dialogue, boss parameters and endings live in [stories/catalog.js](../../stories/catalog.js), not in the pots or decks.

| Story | Arc one finale | Arc two finale | Final encounter |
| --- | --- | --- | --- |
| The Uninvited Cook | Picky Princess | Royal Pilot Light dragon | Witch envoy |
| The Long Table | Grum's large-bowl toll | Aunt Thistle's curse | Storm dragon |

Normal encounters have only +20% / −20% ingredient-type preferences. Bosses keep preferences and add visible demands:

- Princess: small bowls only. One randomly chosen offer slot becomes a seeded ingredient from outside the selected themed pool. Add that exact offer this bowl for ×1.35 points; merely retaining an earlier requested ingredient does not qualify. Its owning deck's mechanics work even when that deck was not selected.
- Ogre: large bowls only; illegal sizes are disabled and rejected by the reducer.
- Dragon: before bowls two and four, announce and lock a seeded temperature. Other bowls allow normal control. The final road dragon also requires large bowls. Invalid heat cannot be committed through the API.
- Witch: before each bowl, visibly silence one random installed residue. Its rule effects and objective progress are inactive for that bowl. It is not deleted or downgraded; the next bowl's curse is prepared separately. Chapter-start resource grants occur before the first bowl's curse.

Boss randomness is prepared before input, never rerolled by changing selection or previewing. Both stories use targets `round(400 × 1.28^chapterIndex × bossFactor)`, where bosses use 1.2 and normal chapters 1. Targets: **400 / 512 / 786 / 839 / 1074 / 1649 / 1759 / 2252 / 2882 / 4427**. They are identical for both pots.

Six generated character/situation portraits appear in chapter cards and Feast progress. Dialogue and meter language change at 0%, 45% and 100% of the target; bosses use approval, appetite, ego or suspicion as appropriate. Portraits are static; frame color and text change as score bubbles arrive. [Asset prompts and filenames](../../assets/characters/README.md) are recorded separately.

## Residues and secondary goals

Iron: **3 L, seven slots**. Royal: **5 L, five slots**. There are **16 residues**, four per deck. Definitions, precise conditions, level values and objective text are in each deck's `deck.json`.

- Pantry: Hearth Coating, Cool Coating, Tasting Spoon, Grand Table — reaction multipliers and portion specializations.
- Culture: Seasoned Crock, Sugar Glaze, Living Lid, Last Drop — refunds, growth, banked-Culture Preservation and high-acid harvest payoffs.
- Hearth: Banked Embers, Coal Keeper, Red Glaze, Ash Memory — cheaper fuel, chapter-start Char, hot Browning and Blaze recycling.
- Chorus: Tuned Rim, Silver Note, Counterpoint, Encore — cheaper echoes, three-reaction amplification, stronger directional copies and a copy of the last common reaction.

All begin at level 1 with zero objective progress. Their published secondary goal automatically upgrades them to level 2 **after scoring**; the new effect starts next bowl. Only actions after installation count. Installed residues are excluded from reward choices. A full pot requires an explicit replacement selection, resetting that new residue's progress; Keep pot is always available. Rewards are earned from decks whose non-system ingredients contributed in the chapter, including princess guests.

Objectives count actual resolved events: positive Browning/Infusion, small bowls, multi-reaction large bowls, Culture growth/full harvests/high-acid harvests, furnace burns/full Blazes/spent Char, source echoes, three-chemistry bowls and directional copies. Silenced residues neither advance nor apply effects. Replacing an objective definition requires changing its catalog version; old command logs must retain matching content.

## Runtime boundaries

`createGame` now starts in `stock`. Commands are `chooseStock`, `startChapter`, `serve` (including `servingSize`) and `chooseResidue`. Phases are `stock → chapter → serving → reward → chapter`, ending in `won` or `lost`. Replay options include `storyId` plus pot, decks, seed and accepted commands. Rules version is 5; old v4 states are rejected, not migrated.

`activeDeckIds` includes selected decks, owners of live ingredients/residues and decks with banked resources. This lets an off-deck gift remain a real ingredient with working mechanics, without adding its cards to the ordinary draft pool. The host still owns turn structure, legality, scoring, boss scheduling and progression. Deck rules remain pure, attributed operation producers.

The shared objective metric registry is in `packages/game-core/residue-objectives.js`. Manifests choose a validated metric, integer target and description. Adding a completely new metric currently requires a host-registry change and a test; arbitrary executable objectives are not supported. Upgrades emit `residueProgress` / `residueLeveled`. New setup and portion events are deterministic.

The chemistry dock is sticky, high on the page, and fixed-height with internal scrolling. Its six effective-property totals and four common reactions do not move down as pot/residue lists grow. Reaction inspection reflects the current pot at selected heat; the full action preview includes the proposed draft and pre-serve costs. Score analysis remains below play. Stocks and new residues use explicit `imageId` aliases for existing art; missing filename guesses are not required.

## Acceptance and remaining design questions

Unit tests cover stock gating, all portions and both capacities, broth power, retention, story structure, foreign mechanics, boss legality, seeded preview/replay, silence and every objective family. Browser tests cover setup, preview, portraits/art loading, mobile tooltips/layout, stage inspection, an automatic objective upgrade, reaction order and a natural 50-bowl road-story victory including all three bosses.

Automated policies now show that preserving an engine can beat maximizing every bowl. This does not validate human enjoyment. Next playtests should focus on whether small/standard/large are understandable, whether standard has a useful niche, whether seven objectives are readable, whether witches feel fair, and whether the final arc is tense without making earlier chapters feel like chores.
