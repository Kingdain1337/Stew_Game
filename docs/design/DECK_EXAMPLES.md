# Candidate decks and reference patterns

Current implementation note (27 October 2026): the numerical experiments below predate rules version 4. The playable game now has eight encounters, 3 L / two-slot and 5 L / one-slot pots, 0.4 L serving fractions, stronger reaction residues, Char Overflow/Blaze, and conductor-dependent Bellglass bonuses. Use [the current rebalance specification](DECK_REBALANCE_V4.md) and [implemented contract](IMPLEMENTED_DECK_CONTRACT.md) for executable rules; retain the earlier scenarios below as design history, not current card instructions.

Design experiments, 26 October 2026. These deliberately contrasting mechanics now have a playable first implementation in `decks/` and `packages/game-core/`; they are still unvalidated as examples of good decks. Their numerical fixtures specify the rules, while the current provisional Iron targets are 350/900/1200 (Royal opens at 280). The shared pot converts remnants below 0.15 presence into Broth.

Read the [thesis](POINTS_ENGINE_THESIS.md) first. Use the [authoring brief](DECK_AUTHORING_BRIEF.md) to turn a candidate into an implementation brief with complete ingredient stats and test data.

## The common game underneath the examples

All three use the same loop: choose one of three ingredients, add or pass, commit a temperature, resolve a serving, deplete the pot, and meet a customer target within a fixed number of servings. They share the pot, six existing reaction properties, score currency, residue system, and readable resolution sequence. None requires a separate board or timed minigame.

For mechanical fixtures: one 5 L pot, 1 L servings, ordinary presence retention 0.8, and presence expressed as a fraction of one added ingredient. A newly added ingredient has presence 1. A special component is operational only at presence at least 0.25 unless specified otherwise. The threshold is visible on its card. Ordinary base scoring can continue below that threshold until normal removal.

References to effective acid/sugar/protein mean `property amount * reactivity * remaining presence`, summed over the pot. These are existing concepts. Each deck introduces at most one new visible resource. Committed temperature changes occur once per serving; dragging the slider is a preview and cannot repeatedly trigger effects.

The cards below specify functions and roles. Base power, full temperature curves, rarity weights, and final ingredient lists must be supplied during the first implementation experiment. The resource rules, costs, and miniature fixtures are specified here so that the concept can be criticized before that work.

## 1. Culture Cellar: patience becomes stored power

**Experience:** "I kept this fragile culture alive until the serving where it mattered."

**Central decision:** spend a serving developing the culture, or heat the pot and cash it out. Weak immediate choices can create a large later contribution, but the encounter clock keeps that choice honest.

### Mechanical kernel

The deck owns a pot resource `culture`, initially 0, with a cap of 6. It persists across encounters within this run.

At `preServe`, after ingredient addition and the committed temperature change:

1. At 40–60°C inclusive, if at least one operational culture source and effective Sugar at least 1 are present, gain 1 culture. Several sources still produce only one gain; they provide redundancy, not additive triggers.
2. An operational Bubble Fig adds one extra culture to that gain, once per serving regardless of copies. Clamp to 6 and report any wasted gain. It cannot generate without the ordinary condition.
3. At 90°C or higher, if culture is positive and effective Acid is positive, consume all culture and create an original, echoable harvest pulse worth `30 * cultureSpent * min(effectiveAcid, 3)` score units.
4. Harvest happens at most once per serving. Heat outside those windows neither generates nor spends culture. A missing source prevents generation but does not erase previously stored culture or prevent harvest.

The pulse uses the acid participants as targets, splitting its score in proportion to their effective Acid. Normal target/customer modifiers apply once afterward. The 30-point coefficient is provisional. This burst is additional to ordinary ingredient scoring, not a multiplier on the whole pot.

### Ingredient roles

| Candidate | Function | Reason to take it / reason to hesitate |
| --- | --- | --- |
| Mother Culture | Common culture source; low direct output | Enables the plan, but needs Sugar and time |
| Wild Yeast | Alternative common source with a different temperature curve | Prevents a single mandatory-card bottleneck |
| Orchard Peel | Sugar 2, Acid 1 | Supports growth and harvest; connects to existing Browning/Extraction |
| Sour Plum | Acid 2, Sugar 1 | Earlier harvest support; less growth redundancy than a specialist |
| Candycap | Sugar 2, Aromatic 1 | Reliable growing input and Infusion bridge; does not provide Acid |
| Cool Cream | Fat 1; one oldest operational culture source uses retention 0.9 while at 40–60°C | Extends the engine, but may give less immediate output than a scorer |
| Ember Root | Immediate hot scorer | Helps survive the cash-out turn; weak during setup |
| Bubble Fig | Sugar 1; adds the extra culture gain described above | Raises the ceiling; the ordinary engine works without it |

The two branches are frequent small harvests and longer, protected accumulation. A fallback is ordinary Sugar/Acid reactions plus an early harvest; failing to find Bubble Fig should not invalidate the deck.

### The less obvious interaction

Cool Cream also supplies Fat. An Aromatic ingredient can make it valuable through Infusion while it extends the culture source's life. The player can maintain a modest ordinary scoring engine during setup instead of sacrificing all present output for the future. Conversely, replacing a seemingly weak Sugar contributor with a hot scorer can drop effective Sugar below 1 and stop growth.

### Residue candidate

**Seasoned Crock:** after a positive harvest, restore culture to 1 rather than 0, once per encounter. The restoration is not generation and does not trigger generation listeners. Higher tiers change the once-per-encounter retained amount to 2 and 3. It still requires the player to have culture before harvesting; an empty pot cannot print a free charge. Keep/replace decisions compare this flexibility with another engine's residue.

### Mechanical fixtures

- `culture=2`, a valid source, Sugar=1, 50°C, no Fig: culture becomes 3; no harvest pulse.
- `culture=3`, Acid=2, 95°C: harvest contributes 180 before target/customer modifiers, and culture becomes 0.
- Same harvest with unused tier-1 residue: the pulse remains 180 and culture ends at 1. A second harvest in that encounter gets no restoration.
- `culture=6`, valid warm setup: gain is capped; this is a reason to harvest rather than wait forever.
- No source, `culture=3`, Acid=2, 95°C: the same 180 harvest is still valid. The accumulated resource belongs to the pot, not a deleted source instance.

### Visual identity and failure tests

Use swelling bubbles, visible stored pips, and a clear rupture that sends points along paths from Acid participants to the total. The residue's restored bubble appears after the burst, making its contribution distinct.

Reject or redesign the candidate if holding culture to the cap always wins, if cold setup cannot survive early targets, if players cannot predict when harvest occurs, or if Cool Cream becomes a mandatory survival tax. Test against a final-serving emergency, a shorter encounter, and missing Acid offers.

## 2. Char Hearth: spend the present pot to feed a different engine

**Experience:** "The ingredient I used up became the reason this build survived."

**Central decision:** consume productive presence to build Char, keep the original ingredients intact, or spend Char on retention. Heat switches between these uses within the existing controls.

### Mechanical kernel

The deck owns `char`, initially 0, capped at 6, retained between encounters in this run.

At `preServe`:

1. At 90°C or higher, with an operational furnace source and Char below cap, select the oldest pot ingredient with a Protein property and presence at least 0.25. Stable instance ID breaks ties.
2. Consume 0.20 of its presence, then gain one Char. This occurs once per serving, irrespective of furnace copies. If no target is legal or the full cost cannot be paid, neither occurs. At the cap there is no consumption.
3. At 40–60°C, with Char at least 1, the oldest operational Cinder Bean automatically spends one Char if another ingredient has presence from 0.25 up to but excluding 1. Choose the oldest such ingredient, excluding that source Bean. For this serving the target uses retention 0.95 instead of the ordinary 0.8. At most one spend occurs regardless of Bean copies. With no legal target, Char remains unspent.
4. After the hot conversion or cool spending, an operational Ash Dumpling produces one additional contribution of `20 * char * its remaining presence`. With multiple Dumplings, only the oldest operational one pays out. Target/customer modifiers apply normally. This happens at any temperature.
5. Any multiple retention requests combine through the host's shared retention rule: take the highest requested fraction, not their product.

Consumption, resource gain, cool spending, bonus scoring, and depletion are separate explained events. None can recursively cause another furnace activation during the same serving.

### Ingredient roles

| Candidate | Function | Reason to take it / reason to hesitate |
| --- | --- | --- |
| Smokeleaf | Common furnace source, Aromatic 1 | Opens conversion; can consume an ingredient you wanted to retain |
| Soot Pepper | Alternative furnace source | Another route into the engine; copies do not multiply activations |
| Marrow Scrap | Protein 1, modest direct output | Can become useful fuel and a Browning participant |
| Old Bean | Protein 1, Sugar 1 | Flexible fuel and bridge; sacrificing it can break a reaction |
| Ash Dumpling | Char payoff | Converts accumulated resource into score; needs prior investment |
| Cinder Bean | Cool Char-spending retention rule above | Saves an important piece, but spends future Dumpling output |
| Ember Truffle | Hot immediate scorer | Makes a weak setup less dangerous; does not solve fuel supply |
| Smoke Pear | Sugar 1, Aromatic 1 | Supports ordinary reactions when fuel is unavailable |

The ordinary plan generates Char from expendable Protein and uses a Dumpling. The alternative spends some of that resource to prolong a different reaction engine. Neither requires every ingredient in this candidate set.

### The less obvious interaction

An old low-scoring Protein ingredient is a shield for a younger, high-scoring one because fuel targeting follows age. Retaining the old ingredient can preserve both the fuel supply and the valuable ingredient behind it. However, retaining it can also keep the wrong ingredient first in the cool-retention order. This ordering must be shown, not discovered through unexplained losses.

### Residue candidate

**Banked Embers:** the first furnace conversion of each encounter consumes 0.10, 0.05, or 0.00 presence at tiers 1–3, while still granting exactly one Char. The target must still meet the normal 0.25 eligibility threshold; no target means no conversion, even when the cost is zero. Later conversions use the normal 0.20 cost. Tier 3 is deliberately strong and needs a separate test; the per-encounter use limit remains binding.

### Mechanical fixtures

- Char=1, operational source, oldest Protein at 0.8, 95°C, Dumpling at 1: fuel becomes 0.6, Char becomes 2, Dumpling bonus is 40. Normal fuel depletion then leaves 0.48.
- Char=6 in the same hot state: there is no burn; the Dumpling bonus is 120. Fuel has ordinary depletion only.
- Char=2, 50°C, Cinder Bean operational, eligible oldest target at 0.6, Dumpling at 1: spend to Char=1; bonus is 20; the retained target ends at 0.57.
- No eligible fuel: no resource gain. No automatic substitution of an arbitrary non-Protein ingredient.

### Visual identity and failure tests

Show a visible piece shrinking, an ember moving from it to the Char meter, then embers feeding the Dumpling. Cooling sends a visibly spent ember toward the protected ingredient. Never celebrate the output without showing the sacrificed presence.

Reject or redesign if fuel never becomes scarce, if the optimal play is always hot, if targeting feels arbitrary, or if the cold conversion is never preferable to keeping Char. Test short and long horizons, high-value oldest fuel, and interaction with generic retention.

## 3. Bellglass Chorus: make a good reaction happen again

**Experience:** "That small reaction became the opening note of a much larger performance."

**Central decision:** improve a reaction's output, keep the copying ingredient alive, or manipulate which reaction is copied. More simultaneous reactions are not automatically better for this engine.

### Mechanical kernel

This deck has no accumulating resource. Its cost is the remaining presence of its echo source.

1. After original reaction contributions have been resolved but before customer modifiers, collect original pulses explicitly marked `echoable` by the shared pulse contract.
2. Order them by the host's published stable resolution order. Choose the first pulse with positive incremental score. Only one pulse is selected per serving.
3. Choose an operational echo source: Glass Noodle has priority over Bell Herb, then oldest instance within a kind. The source must have at least 0.25 presence and be able to pay 0.10 presence.
4. Consume 0.10 source presence and emit an echo of 50% of the original incremental score for a Glass Noodle, or 25% for Bell Herb. Preserve the original participant allocation for customer modifiers. Copies of either source do not add further echoes.
5. The echo is a derived score contribution with `echoable=false`. It cannot generate resources, repeat costs, invoke reaction-resolution handlers, or trigger another echo. It does not repeat ingredient base score.

This requires a shared representation of an original reaction's incremental score. Multiplicative rules must expose their actual delta at the documented point in the score calculation. Do not approximate an echo by multiplying the final whole-pot score.

### Ingredient roles

| Candidate | Function | Reason to take it / reason to hesitate |
| --- | --- | --- |
| Glass Noodle | Main echo source, Sugar 1 | Strong repetition, but consumes its own lifetime |
| Bell Herb | Common weaker echo source, Aromatic 1 | Functional access without the main source |
| Chime Fruit | Sugar 1, Aromatic 1 | Connects Browning and Infusion, potentially changing which pulse is first |
| Silver Cream | Fat 2 | Gives an alternative reaction plan |
| Resonant Marrow | Protein 2 | Reliable Browning input; may cause a weak early pulse to take the echo |
| Quiet Mushroom | Aromatic 2, no Protein | Can support an Infusion plan without adding Browning requirements |
| Clear Gel | At 40–60°C, the oldest echo source requests retention 0.9 | Extends repeated output, but may lower the best reaction temperature |
| Crystal Citrus | Acid 2 | Opens Extraction or a Culture Cellar bridge |

An ordinary reaction remains useful without an echo source. The two plans are to repeat a strong immediate reaction or preserve the source across multiple encounters. A mixed Culture/Chorus run can echo a harvest only because harvest explicitly participates in the common pulse contract.

### The less obvious interaction

A low-value first reaction can take the only echo from a larger later reaction. Cooling below Browning's temperature window may improve the result if it leaves a stronger Infusion as the first eligible pulse. A simplified fixture: original pulses of 20 then 100 produce a 10-point Glass Noodle echo; suppressing the 20-point pulse leaves 100 plus a 50-point echo. Totals change from 130 to 150, before any other changed temperature effects. In a full test those other effects must also be counted.

### Residue candidate

**Tuned Rim:** the first echo in each encounter pays 0.05 rather than 0.10 presence at tier 1; tier 2 applies to the first two echoes and tier 3 to the first three. The 0.25 operational threshold still applies. Costs never become negative and unused discounts do not carry to another encounter.

### Mechanical fixtures

- One original pulse contributes 80 before customer modifiers. Glass Noodle at 1 produces a separate 40-point echo, ends at 0.9 before ordinary depletion, then 0.72 afterward.
- Two Glass Noodles still produce only one echo; the selected source pays the cost.
- An echo of 40 does not itself generate a 20-point echo. An original Culture harvest of 180 can produce 90 once, without spending or restoring Culture again.
- With a customer multiplier of 0.8 applied uniformly to the relevant targets, the 80 original plus 40 echo becomes 96. Do not apply the customer penalty twice to the echo.

### Visual identity and failure tests

Use rings that retrace the original participants and a second, distinct set of attributed score labels. The source visibly loses a little presence. All echoes share the game's derived-event symbol; the deck supplies its own glass sounds and animation style.

Reject or redesign if echo is an automatic best addition to every build, if pulse order is too hard to anticipate, if long chains create unbounded resolution, or if players believe the effect also duplicates base scores and resources. Its cost, ordinary output, and availability need testing alongside the multiplier.

## Cross-deck compatibility is a design task

These pairings should work through public meanings, not secret checks for another deck's card IDs:

| Pair | Intended interaction | Required hostile test |
| --- | --- | --- |
| Culture + Chorus | Harvest is an original echoable pulse | Echo grants no second Culture generation, debit, or residue refund |
| Hearth + Culture | Retention can prolong a starter; shared Protein may become fuel | Furnace targeting may destroy a useful culture component; show the cost before commit |
| Hearth + Chorus | Retention can prolong the echo source | Cost reductions and retention never restore more than the remaining ingredient presence |

No pair is automatically balanced because it is compatible. Run each solo and each pair against the same declared pressure scenarios, then test the three-way mixture if that composition is intended for release. Wider mix support is a product decision, not an assumption of the package format.

## Commercial reference patterns: what we can responsibly borrow

Balatro combines a stable scoring activity with modifiers and tools that enable different builds. Its official description emphasizes poker hands, Jokers, other modifying cards, and score targets. Our design inference is to keep a familiar player action while allowing modifiers to change what makes an action valuable. This is a pattern-level reference, not a claim that any specific Joker combination has been tested here. [Official game description](https://store.steampowered.com/app/2379780/Balatro/)

Slay the Spire's official description presents changing card opportunities, risky or safe paths, and relic interactions. Our inference is that build quality must be judged against current and future pressure, rather than a permanent card ranking. Its developer's balance talk reinforces testing useful niches while avoiding overly warping content. [Official game description](https://store.steampowered.com/app/646570/Slay_the_Spire/), [developer presentation](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf)

To develop a stronger reference library, record actual played runs with version, seed where available, key decisions, rejected alternatives, costs, and outcomes. Do not present inferred commercial lessons or these unplayed candidates as empirical proof. A future reference entry should contain both the attractive build and the states in which pursuing it was wrong.
