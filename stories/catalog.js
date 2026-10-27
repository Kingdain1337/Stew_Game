// Story pressure belongs to the journey, never to the vessel or selected decks.
const preference = (bonusType, penaltyType) => ({ kind: 'type', bonusType, bonus: 1.2, penaltyType, penalty: .8 });
function chapter(id, name, portrait, narrative, dialogue, bonusType, penaltyType, boss = null) {
  return { id, name, portrait, narrative, dialogue, modifier: preference(bonusType, penaltyType), boss, servings: 5,
    text: `${bonusType} ×1.20 · ${penaltyType} ×0.80` };
}
function story(id, name, description, arcs, chapters, ending) {
  return { id, name, description, arcs, ending, chapters: chapters.map((entry, index) => ({ ...entry,
    arc: index < 3 ? 0 : index < 6 ? 1 : 2, chapter: index + 1,
    target: Math.round(400 * 1.28 ** index * (entry.boss ? 1.2 : 1)) })) };
}
export const STORIES = [
  story('royal', 'The Uninvited Cook', 'A borrowed tavern kitchen. An impossible royal banquet. A diplomatic secret simmering under the lid.',
    ['A foot in the kitchen', 'The palace runs on fire', 'The guest behind the veil'], [
    chapter('borrowed-kitchen', 'A Ladle at the Crooked Crown', 'cook',
      'The royal cook is hiding in a tavern, rehearsing his resignation into a mug. The palace is full of picky eaters, and a mysterious envoy arrives in three days. You offer to help. He laughs—until you borrow the barkeep’s kitchen and promise supper for the whole room.',
      ['“Five bowls. Impress this room and I will lend you my kitchen key.”', '“That smell has stopped the dice game.”', '“You are coming to the palace. Please say you own an apron.”'], 'Vegetable', 'Dairy'),
    chapter('service-door', 'The Staff Eat Last', 'feast',
      'The palace service door opens onto a queue of exhausted scullions. They have polished twelve courses without tasting one. Before they trust a stranger with their pantry, you must cook something worth sitting down for.',
      ['“The lords can wait. Is that for us?”', 'The washing-up slows. People fetch chairs.', '“If anyone asks, you have worked here for years.”'], 'Grain', 'Fruit'),
    chapter('princess', 'The Picky Princess', 'princess',
      'Princess Mirabel has heard that the servants are eating better than she is. She arrives with a tiny spoon and a spectacular list of opinions. Every bowl must be small. Before each serving her page slips one requested ingredient into your choices—often from a pantry you did not pack.',
      ['“Small portions. I refuse to be overwhelmed.”', '“That was almost precisely what I meant.”', '“You may tell the envoy I discovered you.”'], 'Fruit', 'Meat', { kind: 'princess', requiredSize: 'small', giftBonus: 1.35, meter: 'Approval' }),
    chapter('empty-cellar', 'The Cellar With No Labels', 'cook',
      'Mirabel grants access to the old cellars. The labels have peeled off every jar, and the cook confesses the menu was written before anyone checked the stores. Feed the cellar crew while they find enough provisions for the envoy.',
      ['“The good news is that none of these jars are ticking.”', '“They have started singing down there.”', '“A pantry is a promise again. Thank you.”'], 'Fungus', 'Dairy'),
    chapter('brass-watch', 'Supper for the Brass Watch', 'feast',
      'The furnace guards have not left their posts in two days. Beneath the kitchens, something large is refusing to keep the ovens lit. A good meal might persuade the watch to let you through the copper door.',
      ['“No one goes below. Not without feeding the night shift.”', '“All right. We can explain the door.”', '“He is not a furnace. He is the furnace’s landlord.”'], 'Meat', 'Fruit'),
    chapter('pilot-light', 'The Royal Pilot Light', 'dragon',
      'Under the palace lives Coppersmoke, a dragon offended that every menu calls him “heating.” He takes control of the flame on bowls two and four. The announced temperature is locked for that bowl; prove that a cook can listen as well as command.',
      ['“You season by numbers. Let us see you season by instinct.”', '“Hm. You noticed the cooler flame.”', '“Tell them the furnace would like a place card.”'], 'Mineral', 'Dairy', { kind: 'dragon', heatRounds: [1, 3], heatChoices: [50, 60, 105, 110], meter: 'Ego softened' }),
    chapter('rehearsal', 'A Banquet for Empty Chairs', 'feast',
      'The staff rehearse the banquet with empty chairs and stolen titles. A scullion plays the queen much too convincingly. This is your last chance to turn a collection of clever tricks into a meal that belongs together.',
      ['“Her Imaginary Majesty requests another rehearsal.”', 'The pretend courtiers forget to pretend.', '“If the real guests complain, we will swap them for these chairs.”'], 'Grain', 'Mineral'),
    chapter('veiled-gift', 'A Gift From the Marsh', 'witch',
      'A veiled woman delivers the envoy’s luggage herself. She tastes the air, not the stew, and asks what remains of a meal when the ingredients are gone. For now she is only a hungry traveler; there are no demands beyond her preferences.',
      ['“An old pot keeps its own stories, does it not?”', '“I can taste the people who taught you.”', '“Keep cooking. We will meet at the table.”'], 'Fungus', 'Meat'),
    chapter('last-supper-before', 'The Night Before the Knives', 'cook',
      'The royal cook admits that the envoy is a witch who can taste a lie. The court wants an impressive performance; the staff want an honest supper. You promise both, then feed the kitchen before the doors open.',
      ['“What if she asks who really cooked it?”', '“You are right. We will tell her.”', '“Whatever happens in there, this was our banquet.”'], 'Vegetable', 'Fruit'),
    chapter('envoy', 'The Envoy Removes Her Veil', 'witch',
      'The traveler takes the place of honor. To test whether your cooking is more than borrowed magic, she silences one random installed residue before every bowl. Its effect and objective sleep for that serving, then return. Adapt to the curse you can see; the court’s future is in your ladle.',
      ['“One memory quieted. Show me the cook beneath it.”', '“Not merely a collection of charms, then.”', '“An honest table. I will sign the treaty.”'], 'Fungus', 'Dairy', { kind: 'witch', muteCount: 1, meter: 'Suspicion dispelled' })
    ], 'The treaty is signed on a flour-dusted table. Mirabel asks for a second small bowl. Coppersmoke gets his place card. The royal cook tears up his resignation—and writes your name beside his on tomorrow’s menu.'),
  story('road', 'The Long Table', 'Carry a traveling kitchen through a hungry winter. Feed a bridge keeper, outcook a curse, and invite a dragon to dinner.',
    ['The road asks a toll', 'What the forest remembers', 'A seat for the storm'], [
    chapter('departure', 'Breakfast Before the Snow', 'feast',
      'Your traveling kitchen reaches a village on the morning its last supply caravan leaves. Nobody can pay, but everyone can bring a bowl. Feed the square and they will show you the winter road.',
      ['“There is room for one more bowl, surely?”', 'The queue becomes a conversation.', '“Take the bridge road. And take our thanks.”'], 'Grain', 'Dairy'),
    chapter('broken-wheel', 'The Wheel That Would Not Turn', 'cook',
      'A broken axle blocks the mountain track. The carters will lift it together after something hot. Their cook has three matches left and an admirable refusal to panic.',
      ['“We can fix anything after lunch.”', '“One more push, after this spoonful.”', 'The wheel turns. So does your luck.'], 'Vegetable', 'Fruit'),
    chapter('bridge-ogre', 'Grum’s Very Large Toll', 'ogre',
      'Grum the bridge keeper has stopped collecting coins: they taste dreadful. He demands large servings only. A small or standard bowl cannot be submitted. Fill his appetite before the caravan gives up and turns back.',
      ['“SMALL BOWL IS JUST A SPOON WITH AMBITIONS.”', '“GRUM CAN ALMOST HEAR HIS OWN THOUGHTS AGAIN.”', '“TOLL PAID. GRUM KEEP THE RECIPE?”'], 'Meat', 'Fruit', { kind: 'ogre', requiredSize: 'large', meter: 'Hunger satisfied' }),
    chapter('lanterns', 'The Lantern Market', 'feast',
      'Beyond the bridge, traders have strung lanterns through the bare trees. They barter stories for supper and warn you that the forest dislikes travelers who forget their debts.',
      ['“A bowl for a story? We have some excellent ones.”', 'Lanterns swing as the tables fill.', '“Follow the blue lights, but do not promise them anything.”'], 'Fruit', 'Mineral'),
    chapter('borrowed-spoons', 'The House of Borrowed Spoons', 'cook',
      'An abandoned coaching inn contains a thousand spoons and no knives. The stranded guests confess that each utensil was borrowed from the same woman. Feed them while they practice apologizing.',
      ['“We did mean to return them.”', '“Perhaps we should bring her supper as well.”', 'The spoons are polished. The apology is ready.'], 'Dairy', 'Meat'),
    chapter('spoon-witch', 'Aunt Thistle Collects', 'witch',
      'Aunt Thistle arrives to reclaim her spoons—and your pot’s memories as interest. Before each serving she temporarily silences one random residue. You can see which charm is asleep. Win her over and she will forgive the whole village.',
      ['“Let us see what you cook without that little shortcut.”', '“An apology with actual seasoning. Unusual.”', '“Keep one spoon. Return the rest.”'], 'Fungus', 'Mineral', { kind: 'witch', muteCount: 1, meter: 'Grudge dissolved' }),
    chapter('snowline', 'At the Edge of the White', 'feast',
      'The snow closes behind the caravan. Grum follows carrying the broken wagon, and Thistle sends a lantern that refuses to go out. Feed the travelers before the last climb.',
      ['“We are still all here. Count the bowls.”', 'Fingers uncurl around warm crockery.', '“Together, then. Up the mountain.”'], 'Meat', 'Dairy'),
    chapter('silent-bells', 'The Monastery of Silent Bells', 'feast',
      'The summit monks have wrapped their bells in blankets to avoid waking the storm-dragon. They offer shelter, flour, and an extremely quiet audience for dinner.',
      ['A monk points at a bowl, then very firmly at a pillow.', 'The room applauds in whispers.', '“Perhaps the dragon is hungry too,” someone whispers.'], 'Grain', 'Fruit'),
    chapter('one-more-chair', 'Build One More Chair', 'ogre',
      'You decide to invite the storm to supper. Grum builds a chair from three wagons while the travelers lay a table on the ridge. Tonight he is helping, not collecting a toll: ordinary preferences, any serving size.',
      ['“GRUM THINK CHAIR NEED MORE CHAIR.”', '“SAVE A BIG BOWL FOR OUR NEW FRIEND.”', 'The table is ready. The mountain opens an eye.'], 'Mineral', 'Dairy'),
    chapter('storm-seat', 'A Seat for Coppersmoke', 'dragon',
      'The dragon has spent a century mistaking loneliness for hunger. He accepts only large servings and seizes the flame on bowls two and four. The locked temperatures are announced before you choose. Feed the storm until it remembers how to be a guest.',
      ['“A whole caravan, and you brought me a chair?”', '“I had forgotten what it was to wait for supper.”', '“Stay. At least until the snow melts.”'], 'Meat', 'Fruit', { kind: 'dragon', requiredSize: 'large', heatRounds: [1, 3], heatChoices: [45, 60, 105, 115], meter: 'Storm calmed' })
    ], 'The road opens beneath a warm wind. The dragon keeps the chair. Grum keeps the recipe. Aunt Thistle gets every spoon back except one. Wherever your kitchen stops next, there will be room for one more bowl.')
];

export function getStory(state) { return STORIES.find((entry) => entry.id === (state.storyId ?? 'royal')); }
export function getEncounter(state) { return getStory(state).chapters[state.encounterIndex]; }
export function bossDemandText(encounter) {
  const boss = encounter.boss;
  if (!boss) return 'Preferences only. Any serving size and heat are allowed.';
  const rules = [];
  if (boss.requiredSize) rules.push(`Only ${boss.requiredSize} servings are accepted.`);
  if (boss.kind === 'princess') rules.push('One random offer is replaced by a royal request each turn. Add it for ×1.35 bowl points; discarding it is allowed.');
  if (boss.kind === 'dragon') rules.push('The dragon locks the announced heat on bowls 2 and 4. Other bowls are yours to control.');
  if (boss.kind === 'witch') rules.push('One random installed residue loses its effect and objective progress for this bowl only. The curse is revealed before choosing.');
  return rules.join(' ');
}

export function audienceReaction(encounter, score, target) {
  const fraction = Math.max(0, Math.min(1, score / target));
  const level = fraction >= 1 ? 2 : fraction >= .45 ? 1 : 0;
  return { fraction, level, line: encounter.dialogue[level], label: encounter.boss?.meter ?? 'Enjoyment',
    mood: ['Unconvinced', 'Warming to you', 'Won over'][level] };
}
