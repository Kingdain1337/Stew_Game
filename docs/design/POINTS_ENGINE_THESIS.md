# Forever Stew: why building a points engine should be enjoyable

Current implementation note (27 October 2026): the numerical experiments below predate rules version 4. The playable game now has eight encounters, 3 L / two-slot and 5 L / one-slot pots, 0.4 L serving fractions, stronger reaction residues, Char Overflow/Blaze, and conductor-dependent Bellglass bonuses. Use [the current rebalance specification](DECK_REBALANCE_V4.md) and [implemented contract](IMPLEMENTED_DECK_CONTRACT.md) for executable rules; retain the earlier scenarios below as design history, not current card instructions.

Working design thesis, 26 October 2026. This is a theory to test, not a claim that the prototype is already fun or a finished academic thesis. Proposed rules and numerical examples are explicitly experimental. The companion [research plan](RESEARCH_PLAN.md) describes the evidence needed to revise or support it.

The prototype audit later in this document describes the original `game.js` comparison state, not the current deck-based runtime. The current runtime uses pot capacity as its only active-ingredient limit; there are no separate ingredient places.

## 1. The two products

We are making a game and a transferable body of design knowledge. The game must make it satisfying to discover ingredients, form a plan, assemble an engine under pressure, watch it work, and reconsider that plan as the run changes. The knowledge must let another developer and an AI agent design a new themed deck and explain why its decisions should be interesting, what could go wrong, and how to test it.

The central claim of this thesis is:

> A satisfying points engine lets players acquire useful knowledge, make consequential commitments with that knowledge, and recognize their own decisions in a surprising but understandable payoff.

Large scores are one possible expression of that payoff. They do not, by themselves, establish discovery, agency, strategy, or replayability. A deck that only increases numbers may still be pleasant, but it does not satisfy the whole design goal.

Confirmed progression boundary: **residues persist between encounters within the same run and reset when the run ends**. There is no inherited residue power between runs. A future collection or discovery journal is a separate possibility, not part of the residue system.

Terminology for this proposal:

- **Deck:** an authored family of ingredients, mechanics, presentation, and examples. This is the user's themed content unit; it does not necessarily imply a draw/discard pile.
- **Build:** the particular engine a player assembles from available ingredients and residues.
- **Archetype:** a recognizable plan, such as delayed fermentation or repeated reaction scoring. One deck should support more than one plan.
- **Run pool:** the content eligible to appear during one run. Installed decks are not automatically all included.
- **Pot:** the common play space and the record of decisions made within a run.

Whether a later version uses a literal collectible draw pile remains an acquisition-design choice. The current prototype drafts one of three fresh offers and accumulates ingredients in the pot.

## 2. Evidence and its limits

There is no established universal equation for fun. This document combines published findings, developer accounts, inspection of our own rules, and explicitly labeled design hypotheses.

The MDA framework distinguishes implemented rules, the behavior those rules generate during play, and the experience of the player. For us, this means specifying an intended experience such as anticipation or discovery before choosing a mechanic. It is a useful design lens, not experimental proof that a proposed recipe will work. [Hunicke, LeBlanc, and Zubek, MDA](https://www.cs.northwestern.edu/~hunicke/MDA.pdf)

Ryan, Rigby, and Przybylski report associations between perceived competence/autonomy and enjoyment in their game studies. Our interpretation is to test whether players feel they understand their successes and can choose meaningful approaches; the paper does not establish that any particular combo system causes those feelings. [The Motivational Pull of Video Games](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)

Anthony Giovannetti's Slay the Spire presentation combines iterative balance work, player feedback, and metrics, and explicitly cautions against treating data as a conclusion. This supports our method: simulations can expose structural failures, while observed human play determines whether decisions are interesting and readable. [GDC presentation](https://media.gdcvault.com/gdc2019/presentations/Giovannetti_Anthony_SlayTheSpire.pdf)

LocalThunk describes Balatro's achievements, unlocks, and challenges partly as encouragement to explore beyond familiar strategies. Our inference is that progression should direct curiosity and create fresh decisions; it need not be an endlessly increasing power bonus. [Solitaire](https://localthunk.com/blog/solitaire)

Feedback also deserves testing. The developer demonstration Juice It or Lose It shows techniques for making interactions more expressive. A separate empirical study by Hicks and colleagues reports improved visual appeal from embellishment, with other experience effects depending on context. Neither source establishes that more motion always produces better play. [Jonasson and Purho's talk](https://www.youtube.com/watch?v=Fy0aCDmgnxg), [Juicy Game Design, published abstract](https://doi.org/10.1145/3311350.3347171)

Everything below is our synthesis unless a source is attached. Commercial references are precedents, not controlled experiments or a license to copy their content.

## 3. The experience loop

The useful recurring sequence is:

**Notice a possibility → predict a consequence → commit something scarce → see the mechanism resolve → revise the mental model → attempt a more ambitious combination.**

There are several timescales:

| Timescale | Player question | What should answer it |
| --- | --- | --- |
| Ingredient | What does this do, and why might I want it? | A readable rule, a visual identity, and a useful baseline role |
| Serving | What should I add, withhold, consume, or heat now? | A consequential choice and a visible causal resolution |
| Encounter | Can I afford setup before the deadline? | Target pressure, remaining servings, and credible recovery options |
| Run | What engine am I becoming, and when should I change direction? | Draft opportunities, changing encounters, and limited residues |
| Repeated runs | What will I understand or attempt differently? | Different opportunities and growing player knowledge |

An early serving can teach a direct pairing. A middle encounter can reward an unexpected conversion. A late encounter can test whether the player can cash out the engine without destroying it too early. Constant maximum spectacle leaves little room for anticipation or contrast.

## 4. Discovery must be usable

Discovery has at least four levels:

1. **Recognition:** learning an ingredient's direct effect.
2. **Combination:** learning that two effects reinforce each other.
3. **Reinterpretation:** discovering that something previously viewed as a cost, weak ingredient, or irrelevant property becomes valuable in another context.
4. **Transfer:** using that understanding in a new build without following the original recipe.

The third and fourth levels are the main target for depth. A named combo that activates only when three specific cards appear teaches a recipe. A general rule that makes consumption create a resource teaches a relationship that may apply to many ingredients.

For example, if a culture gains value while cool and releases it when heated, a weak cooling ingredient can buy time, preserve a starter, and improve a later burst. Its value changes through other rules. This is a second-order effect. Merely giving every cool ingredient +20% remains a useful direct synergy, but does not create the same change in planning.

Obvious combinations are still valuable. They teach the vocabulary that makes less obvious combinations discoverable. Common pieces should demonstrate the basic mechanism; unusual pieces can change the way that mechanism is used.

Do not hide operational rules to manufacture mystery. Tell players trigger conditions, costs, targets, persistence, and limits. Leave combinations and strategic consequences for them to discover. Previews can show immediate consequences without prescribing the best long-term move. Test different preview detail levels instead of assuming that either perfect disclosure or obscurity is universally preferable.

## 5. A choice needs a competing use of something

The simplest test of a meaningful choice is: **in which plausible states would a knowledgeable player choose each option?**

If one option wins in every relevant state and does not require a different commitment, the choice is usually busywork. Not every card must be equally good, and some straightforward choices help pacing, but repeated automatic choices undermine the engine-building promise.

Useful competing resources already suggested by Forever Stew include:

- The one ingredient selected from an offer: immediate output versus an enabler.
- Remaining servings before an encounter deadline: score now versus setup.
- Ingredient presence: spend it for a burst versus retain future output.
- A committed temperature: one family benefits while another waits or loses value.
- Limited residue slots: reinforce the existing build versus make room for another plan.
- Access to future ingredients: specialize now versus keep options open.

A rough decision model is:

`value(action, state) = immediate contribution + expected future opportunities - immediate and future costs`, subject to surviving the encounter.

This is an analysis aid, not a literal utility formula for every player. Uncertainty, taste, discovery, and confidence change how people value actions.

A toy example illustrates the horizon. A burst plan contributes 80, 20, 20 over three remaining servings; an investment contributes 30, 90, 90. The investment totals 210 instead of 120. But if this is the encounter's final serving and the remaining requirement is 60, the burst wins and the investment loses before its future can matter. The preference changes because of the deadline, not an arbitrary immunity.

Scarcity should target the actual decision. Do not add fuel, hand limits, stirring energy, ingredient slots, and broth displacement simultaneously just to make the game seem deeper. First test one credible cost. The current draft choice already has opportunity cost; adding an ingredient versus discarding it is the more weakly supported decision.

## 6. Synergy, scaling, and the run that comes together

At a fixed state and horizon, one diagnostic for an interaction is:

`interaction(A,B | state) = outcome(A+B) - outcome(A) - outcome(B) + outcome(neither)`.

The comparison requires the same seed, available resources, action budget, and horizon. It measures an interaction in that setup, not how enjoyable the cards are. Pairwise comparisons also miss combinations that depend on a third ingredient, a changed temperature, or access to later offers.

Good synergy changes preferences. A low-power enabler should sometimes be better than a scorer; a retention effect should sometimes be better than an immediate multiplier; an engine piece should sometimes be premature. A useful deck needs **decision reversals**, not just large combined totals.

Several kinds of engine can support this:

| Mechanism | What the player learns | Characteristic risk |
| --- | --- | --- |
| Complementary properties | Complete a missing requirement | Overinvesting in a bottleneck already satisfied |
| Accumulation and release | Delay payoff until it matters | Failing before the investment pays |
| Consumption and recycling | Turn a loss into another input | Exhausting the engine's future supply |
| Repeated scoring | Improve the value of a good event | Depending on a fragile or expensive trigger |
| Transformation | Change what an ingredient can participate in | Losing its earlier role or timing window |
| Retention and depletion | Make a useful component last | Giving up present power or retaining the wrong component |

The memorable run has a visible change in capability: a former cost becomes useful, a missing link closes a loop, or a one-time burst becomes a sustainable pattern. The player should be able to describe the change in a sentence.

Provide a functional common version of the engine and multiple ways to fill its essential roles. Rare pieces can make it extraordinary. Requiring one exact rare card just to make the theme operate turns many runs into waiting for permission to play.

Discovery still needs uncertainty. Guaranteeing every desired component makes every run the same; an undirected pool of hundreds of ingredients makes intentions unreliable. Pool composition, substitutable role coverage, and limited access tools are balance parameters. A proposed starting configuration is a neutral pantry plus one primary deck; mixed runs can add one compatible secondary deck. Test the mixture before expanding it.

The six broad roles of a deck are immediate scorer, producer/enabler, converter, payoff, stabilizer, and bridge. They are design labels, not a required new UI taxonomy. One ingredient can fill several roles. Avoid forcing a fixed quota when it does not serve the mechanism.

## 7. Residue is the run's memory

Residue should alter subsequent decisions enough for the player to notice what the pot has become. Tiny percentages may support fine tuning, but by themselves they provide little evidence for the desired feeling of history.

Proposed first experiment:

- Keep the present three-encounter run for fast iteration.
- Use one neutral 5 L pot and **one residue slot**, independent of capacity, so the first and second rewards create a real keep/replace/stack decision before the final encounter.
- Permit the player to choose which residue to replace. Retain the current residue if none of the offers fits.
- Offer residues from ingredients that actually contributed during the encounter, tracked in a history ledger; do not require the source to remain in the pot at the end. This keeps sacrifice builds eligible.
- Define contribution eligibility per mechanic: scored, supplied a used reaction property, or executed an effective rule at positive presence. Merely adding a card and never using it is not sufficient.
- Give each residue an explicit bounded tier table. An illustrative pattern is tiers 1–3, with diminishing additional benefit; exact values belong to each deck's test data.
- End-of-run residue is a history display, not a reward needed to continue a finished run. Test longer runs and more slots after the three-encounter experiment works.

Candidates for qualitative residue include preserving one culture charge after a harvest, making the first fuel consumption cheaper, or reducing the first echo's cost. These are hypotheses with defined limits, not promises of balance.

There are two distinct tradeoffs to test. Before a deadline, investing in an ingredient may improve eligibility for a later residue while reducing current output. Between encounters, a residue may strengthen the current plan or help pivot toward the next known pressure. Show the next encounter's relevant rules before the residue decision.

When a run ends, pot contents, deck resources, and residues reset. The persistent progression is the player's understanding; recording discoveries is optional future product work.

## 8. Spectacle must show cause and ownership

The desired ingredients bouncing and numbers flying are part of the experience. They should show *which ingredient did what to which other ingredient*.

A useful resolution has four beats: anticipation, contact, transformation, payout. A starter swells, sends a visible culture bubble toward acid-bearing ingredients, a heat change bursts the stored bubbles, and attributed points travel into the serving total. The residue then glows briefly if it changed that result. The specific visual language belongs to the deck; the causal sequence belongs to the game.

Three information levels can coexist:

- The main performance emphasizes the important sources, costs, and payoff.
- Hover or inspection identifies participants, limits, and intermediate values.
- An expandable ledger gives exact arithmetic and event order.

Visual grouping can compress repeated events without losing totals or parent-child relationships. A queue of twenty tiny bonuses need not take twenty times as long as one. Provide speed controls, skip, reduced motion, and readable non-color cues. Skipping presentation must produce the identical game state.

Purely decorative bouncing must not decide hits, scores, targets, or RNG draws. If position is ever a real mechanic, model discrete positions and collisions in the deterministic simulation and explain that additional player responsibility. Do not accidentally make a cosmetic particle effect a rule.

Our hypothesis is that **attributed spectacle** improves understanding and the feeling of authorship more than equally elaborate but unattributed effects. The research plan compares them. More effects can also obscure the chain or make repeated play slow; this remains a design tradeoff.

## 9. What the current prototype does and does not establish

Inspection and diagnostic execution on 26 October 2026 found:

| Evidence in this repository | Design implication |
| --- | --- |
| 12 ingredients, four property reactions, temperature curves, three encounters | Enough material for a focused experiment; more content is not the first need |
| At 80°C in a 5 L pot against the first customer, Beef scores 44.2667 alone and Onion 31.6; together they score 94.8333 | An existing interaction adds 18.9667 beyond their separate totals; complementary choices already have a foundation |
| In 1,500 checked fixed-temperature additions, none reduced immediate score | The score function strongly rewards addition; this test excludes state-changing Thermal Shock and is not proof of all-run dominance |
| Ingredient volume is used in display, with no addition-capacity check; changing Beef's volume to 100 L did not change the checked score | The documented displacement tradeoff is absent; choose whether to implement a real volume rule or remove the misleading decision cue |
| Preservation is another score multiplier | Its name does not currently express a preservation playstyle |
| Extraction has acid depletion and Ice Salt has a one-time global shock flag | There are beginnings of temporal costs, but relatively few distinct engine behaviors |
| Three rewards, minimum five residue slots, reset on restart | Run-only persistence exists, but replacement pressure cannot occur in a normal current run; the final residue has no subsequent encounter |
| Residue replacement deletes the oldest mark automatically | The proposed curation choice is missing |
| Residue eligibility uses ingredients still present at the end | Consumed contributors can lose eligibility, opposing sacrifice-build identity |
| Rendering shows formulas and totals but no causal ingredient-to-ingredient animation sequence | Arithmetic visibility exists; the intended spectacle and attribution are untested |

Source locations: [runtime](../../game.js), [ingredients](../../data/ingredients.js), [reactions](../../data/reactions.js), [encounters](../../data/encounters.js). The diagnostic used the actual scoring/start functions in Node with a stub DOM; the addition check covered five pot compositions, 25 temperatures, and all 12 added ingredients at presence 1 with no residues. It did not run a browser, simulate human decisions, or establish balance.

The original design document already asks whether catalysts compete with raw power, temperature creates tradeoffs, and players understand their score. Those remain good research questions. The existing technical document's statement that the prototype "proves the loop" should mean only that it implements the sequence, not that the experience has been validated.

## 10. When a deck is ready to become a reference example

An authored deck is a candidate until it has evidence. A reference example should include:

1. Its intended experience and one-sentence mechanical identity.
2. A functional ordinary build, an exceptional build, and a credible fallback.
3. At least two states that reverse an important choice.
4. A direct interaction and a transferable second-order interaction.
5. A finite growth/cost model, including awkward combinations with other decks.
6. An explanation of how residue changes subsequent choices.
7. A recognizable visual sequence with causal attribution and a fast equivalent.
8. Reproducible fixtures, failed examples, observed playtest findings, and unresolved problems.

The [candidate decks](DECK_EXAMPLES.md) demonstrate the specification format. They are not a portfolio of proven good decks. Their purpose is to create testable contrasts and expose missing engine capabilities.

An AI author should learn from successful and unsuccessful examples, including why a card was removed or a loop was weakened. A library containing only attractive pitches will teach it to generate attractive pitches. A library of tested decisions, counterexamples, and revisions can support useful design reasoning.

The [authoring brief](DECK_AUTHORING_BRIEF.md) turns these expectations into a handoff. The [deck architecture](DECK_ARCHITECTURE.md) gives decks room to implement them. Neither removes the need to watch people play.
