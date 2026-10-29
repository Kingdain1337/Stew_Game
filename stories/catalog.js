// Story pressure belongs to the journey, never to the vessel or selected decks.
const preference = (bonusType, penaltyType) => ({ kind: 'type', bonusType, bonus: 1.2, penaltyType, penalty: .8 });
function chapter(id, name, portrait, narrative, dialogue, bonusType, penaltyType, boss = null) {
  return { id, name, portrait, narrative, dialogue, modifier: preference(bonusType, penaltyType), boss, servings: 5,
    text: `${bonusType} ×1.20 · ${penaltyType} ×0.80` };
}
function story(id, name, description, arcs, chapters, ending, { arcEnds = [2, 5, 9], targets, signatureDeckId, recommendedDeckIds } = {}) {
  return { id, name, description, arcs, ending, signatureDeckId, recommendedDeckIds, chapters: chapters.map((entry, index) => ({ ...entry,
    arc: index <= arcEnds[0] ? 0 : index <= arcEnds[1] ? 1 : 2, chapter: index + 1,
    target: targets?.[index] ?? Math.round(400 * 1.28 ** index * (entry.boss ? 1.2 : 1)) })) };
}
export const STORIES = [
  story('royal', 'The Uninvited Cook', 'An anxious cook, a borrowed tavern kitchen, and a royal banquet whose guest can taste a lie.',
    ['Borrowed apron', 'Under the palace', 'An honest banquet'], [
    chapter('borrowed-kitchen', 'A Ladle at the Crooked Crown', 'cook',
      'The royal cook is hiding in a tavern with his apron folded under the table. Tomorrow he must feed an envoy who can tell when a meal is merely show. He has already written his resignation. You borrow the barkeep’s pot, promise supper to everyone in the room, and ask the cook to judge the first bowl. If you can make strangers put down their cards to eat, perhaps he will trust you with the palace kitchen.',
      [['The cook watches the pot.', 'The barkeep saves you a spoon.'], ['Dice stop rolling.', 'The cook leans forward.'], ['The tavern asks for another bowl.', 'A kitchen key lands beside your apron.']], 'Vegetable', 'Dairy'),
    chapter('service-door', 'The Staff Eat Last', 'feast',
      'The palace service door opens onto a line of scullions who have carried dinner upstairs without tasting a bite. One drops a tray because her hands are shaking. The cook offers you his key, but the staff will not surrender their pantry to another visitor with grand promises. Cook for them first. A meal shared on an upturned crate could become the first honest course of the banquet.',
      [['The scullions keep working.', 'One empty bowl waits.'], ['A tray is set down.', 'Someone pulls up a crate.'], ['The washing-up becomes a feast.', 'The pantry door opens.']], 'Grain', 'Fruit'),
    chapter('princess', 'The Picky Princess', 'princess',
      'Princess Mirabel follows the smell of supper into the servants’ corridor. She is tired of people guessing what she likes, then serving more than she can finish. She asks for small bowls and sends her page for one particular ingredient before each serving. Sometimes it comes from a pantry you never packed. Meet her on her own terms and she may become your most useful ally when the envoy arrives.',
      [['Mirabel measures the bowl with her spoon.', 'Her page names a request.'], ['The spoon returns for a second taste.', 'The page stops taking notes.'], ['Mirabel asks your name.', 'She sends her compliments downstairs.']], 'Fruit', 'Meat', { kind: 'princess', requiredSize: 'small', giftBonus: 1.35, meter: 'Approval' }),
    chapter('empty-cellar', 'The Cellar With No Labels', 'cook',
      'Mirabel gives you access to the old cellar. Every jar has lost its label, and the royal cook admits that he wrote the envoy’s menu before checking what was left. The cellar crew have been blamed for the missing supplies, though the shelves were never full. Feed them while they sort the jars. Their knowledge of what remains may save tomorrow’s banquet better than any recipe upstairs.',
      [['The crew hold their unlabeled jars.', 'The cook keeps his menu hidden.'], ['A jar is opened and passed around.', 'The cook crosses out one course.'], ['The shelves gain new names.', 'The crew write the new menu together.']], 'Fungus', 'Dairy'),
    chapter('brass-watch', 'Supper for the Brass Watch', 'feast',
      'The ovens go cold halfway through rehearsal. The brass watch guards a copper door below the kitchen, but its night shift has eaten nothing since dawn. Behind the door lives the creature who supplies the palace flame, and everyone has spoken about him as if he were a piece of equipment. Bring the guards supper. They will tell you why the furnaces stopped and let you through before the banquet loses its fire.',
      [['The watch bars the copper door.', 'The ovens cool.'], ['A guard takes off her helmet.', 'The lock turns once.'], ['The guards share the last spoonful.', 'The copper door opens.']], 'Meat', 'Fruit'),
    chapter('pilot-light', 'The Royal Pilot Light', 'dragon-v2',
      'Coppersmoke is a dragon, not a furnace. The palace sealed his flight vent to keep soot off the ceiling, and he has stopped feeding its ovens. The guards stand behind you with cold hands and worried faces. On bowls two and four he controls the flame himself; cook with the heat he gives you. A substantial meal and an open vent may give him a reason to stay.',
      [['Coppersmoke guards the vent.', 'The flame is his to choose.'], ['The dragon smells the steam.', 'The guards clear the chimney.'], ['Coppersmoke takes the bowl.', 'The ovens wake again.']], 'Mineral', 'Dairy', { kind: 'dragon', heatRounds: [1, 3], heatChoices: [50, 60, 105, 110], meter: 'Hunger satisfied' }),
    chapter('rehearsal', 'A Banquet for Empty Chairs', 'feast',
      'With the ovens lit, the staff rehearse the banquet using empty chairs and borrowed titles. A scullion plays the queen too convincingly; Mirabel plays a guest who says exactly what she thinks. You have clever ingredients and a pot full of history, but the courses must feel like one meal. Feed the pretend court. Let the people who will carry the real dishes tell you what works.',
      [['The chairs wait in rows.', 'A scullion straightens a paper crown.'], ['The pretend court forgets to pretend.', 'Mirabel pushes back her chair to help.'], ['The staff plan the final service.', 'Even the empty chairs feel welcome.']], 'Grain', 'Mineral'),
    chapter('veiled-gift', 'A Gift From the Marsh', 'witch',
      'A traveler in a veil delivers the envoy’s luggage herself. She sits with the kitchen staff instead of waiting for the royal table and asks for a bowl. As she eats, she notices the cook’s crossed-out menu and the names on the cellar jars. You do not yet know who she is. Feed her as you would anyone who came in hungry, and listen to what she remembers about the palace.',
      [['The traveler waits among the staff.', 'Her veil stays on.'], ['She recognizes a name on a jar.', 'She asks who taught you this.'], ['The traveler leaves her bowl behind.', 'She promises to return for supper.']], 'Fungus', 'Meat'),
    chapter('last-supper-before', 'The Night Before the Knives', 'cook',
      'The royal cook finally says it aloud: the traveler is the envoy, a witch who can taste a lie. The court expects a perfect performance and plans to call every course his own. He folds his old resignation into his pocket and asks if you can still help. You promise to cook the banquet together and tell the truth about every hand that made it. First, feed the kitchen that will stand beside you.',
      [['The cook stares at his old menu.', 'The staff wait for an answer.'], ['He hands the scullions clean aprons.', 'The dragon’s vent stays open.'], ['The kitchen eats together.', 'The cook unfolds his resignation.']], 'Vegetable', 'Fruit'),
    chapter('envoy', 'The Envoy Removes Her Veil', 'witch',
      'The traveler takes the place of honor and removes her veil. She can taste the hands, debts, and small kindnesses that went into a dish. Before each bowl she quiets one memory your pot has collected; you can see which residue sleeps. Can you still cook a good meal without leaning on every charm? Serve the court, then tell her who made it. The treaty depends on an honest table.',
      [['One memory falls quiet.', 'The envoy raises her spoon.'], ['The envoy notices the kitchen staff.', 'The court stops whispering.'], ['The envoy asks everyone to sit.', 'The treaty is signed over dessert.']], 'Fungus', 'Dairy', { kind: 'witch', muteCount: 1, meter: 'Suspicion dispelled' })
    ], 'The envoy signs the treaty at a flour-dusted table and asks the staff to join her. Mirabel takes a second small bowl. Down below, Coppersmoke eats beside his open vent. The cook tears up his resignation and writes your name beside his on tomorrow’s menu.',
    { signatureDeckId: 'culture', recommendedDeckIds: ['hearth', 'chorus'] }),
  story('road', 'The Long Way to Town', 'A lost traveler, a merchant caravan, and a pot whose supper keeps attracting larger company.',
    ['A place on the wagon', 'The company grows', 'A dragon at supper'], [
    chapter('forest-supper', 'Lost in the Pines', 'road-forest',
      'You lose the road to the next town as dusk settles over the pines. With no inn in sight, you gather mushrooms, roots and berries, light a small fire, and make supper in your old pot. The meal is simple, but its smell travels farther than the smoke. Before you finish eating, you hear a wagon approaching through the trees.',
      [['The forest is quiet.', 'Your pot starts to steam.'], ['The first bowl warms your hands.', 'Wheels sound beyond the pines.'], ['Someone follows the smell.', 'A lantern appears on the road.']], 'Fungus', 'Dairy'),
    chapter('merchant-wagon', 'A Seat on the Wagon', 'road-merchant',
      'The wagon belongs to Mera, a merchant bound for the same town. She knows the road and offers you a place beside the driver if you cook for her and the caravan. You make supper while she tells you which bends to avoid after dark. By the last bowl, the journey feels less lonely. Mera keeps a spot for your pot beside the wagon and calls you her friend.',
      [['Mera stops her wagon.', 'She watches the pot.'], ['The horses settle.', 'Mera shares the road ahead.'], ['A place is made for you.', 'The caravan rolls on together.']], 'Vegetable', 'Mineral'),
    chapter('bandit-supper', 'The Bandits Follow the Smell', 'road-bandits',
      'A band of road thieves steps from the trees while you cook at the next camp. Their leader eyes Mera’s wagon, then the pot. There are enough of them that one dish will not please everyone. Keep cooking, using at least three ingredient types across their supper, and meet the group’s score target. Fed and disarmed by surprise, they let you pass—and offer to escort the caravan if they can eat with you along the road.',
      [['The bandits block the track.', 'They count the bowls.'], ['Someone lowers a spear.', 'The leader asks for another taste.'], ['The road is yours again.', 'New escorts walk beside the wagon.']], 'Meat', 'Fruit', { kind: 'bandits', requiredTypes: 3, meter: 'Bandits fed' }),
    chapter('caravan-night', 'Supper Under Canvas', 'road-merchant',
      'The bandits keep their word. They scout ahead while Mera drives, and by nightfall everyone is tired enough to eat without arguing about who once robbed whom. You cook at a sheltered camp beside the road. The old pot feeds more people than it did yesterday, and the scent drifts beyond the firelight into the trees. Something large answers with a slow, heavy step.',
      [['The escorts make camp.', 'Mera sets out bowls.'], ['The company eats together.', 'A branch breaks beyond the fire.'], ['The last bowl is claimed.', 'The trees move in the dark.']], 'Grain', 'Dairy'),
    chapter('troll-supper', 'The Troll at the Fire', 'road-troll',
      'A blue forest troll towers over the wagons, drawn by the cooking. It is hungry enough to consider the horses—and perhaps the cooks—but it understands your offer of food. Its long arms reach past the campfire for the pot. Only large servings will satisfy it; a small bowl would be a tease. Feed it before its patience runs out. In the morning it follows the caravan at a distance, still watching for supper.',
      [['The troll looms over the wagon.', 'Large bowls only.'], ['It tastes the stew.', 'The horses stop pulling at their ropes.'], ['The troll steps back.', 'The caravan has another follower.']], 'Meat', 'Fruit', { kind: 'troll', requiredSize: 'large', meter: 'Troll hunger' }),
    chapter('growing-feast', 'The Largest Camp Yet', 'road-feast',
      'Mera has the wagon, the former bandits have the road, and the troll keeps pace outside the firelight. By the next clearing, other travelers have joined the company. You cook a meal big enough for all of them. Laughter and the smell of supper rise through the pines, and a vast shadow crosses the clearing. Whatever is flying overhead has noticed your pot.',
      [['The clearing fills with wagons.', 'The troll waits beyond the fire.'], ['Bowls pass down the line.', 'Wings pass over the trees.'], ['Everyone looks up.', 'The firelight catches copper scales.']], 'Vegetable', 'Mineral'),
    chapter('dragon-trial', 'The Dragon’s Trial', 'road-dragon',
      'A great copper dragon lands beside the feast. It has heard the company from above and followed the smell, but the old pot interests it most. The dragon sets a simple trial: serve it large bowls, match the heat it commands on bowls two and four, and satisfy its hunger. Fail, and it leaves the caravan to find its own meal. Succeed, and it promises to carry you the rest of the way to town on its back.',
      [['The dragon studies your pot.', 'Large bowls only.'], ['It commands the flame.', 'The dragon takes a second bowl.'], ['The trial is met.', 'The dragon lowers a wing for you.']], 'Meat', 'Dairy', { kind: 'dragon', requiredSize: 'large', heatRounds: [1, 3], heatChoices: [45, 60, 105, 115], meter: 'Dragon hunger' })
    ], 'The dragon keeps its word. Mera and the caravan wave from the forest road as you climb onto its back, your pot secured between its scales. By morning you reach the town you were trying to find. You arrived with more friends than you left with—and a story no one there will believe.',
    { arcEnds: [2, 4, 6], targets: [550, 900, 1500, 1300, 2200, 2100, 3500], signatureDeckId: 'hearth', recommendedDeckIds: ['culture', 'chorus'] })
];
// A chapter's setup is shown before cooking; its outcome is revealed only after success.
const CHAPTER_COPY = {
  'borrowed-kitchen': { resolution: 'The tavern grows quiet over the first bowls. The cook sets a kitchen key beside your apron: he wants you at the palace tomorrow.' },
  'service-door': { resolution: 'The scullions put down their trays and eat together. They open the pantry to you, and the cook asks them to help plan the banquet.' },
  princess: { resolution: 'Mirabel finishes her small bowl and asks your name. Her page brings word that the old cellar is yours to use.' },
  'empty-cellar': { resolution: 'The crew identify the jars and cross the impossible courses off the menu. What remains is enough for a meal they can stand behind.' },
  'brass-watch': { resolution: 'The guards share supper, then open the copper door. They tell you the palace flame belongs to a dragon whose flight vent was sealed.' },
  'pilot-light': { resolution: 'Coppersmoke eats, the guards open his vent, and he lights the ovens again. This time he can leave when he chooses.' },
  rehearsal: { resolution: 'The pretend court forgets to pretend. The staff choose the courses that belong together and carry that plan into the real banquet.' },
  'veiled-gift': { resolution: 'The traveler recognizes the names on the jars and thanks the staff who filled them. She leaves her empty bowl and promises to return.' },
  'last-supper-before': { resolution: 'The kitchen shares one last supper. The cook puts away his resignation and gives every helper a place in tomorrow’s service.' },
  envoy: { resolution: 'Even with a memory silenced, the meal holds. The envoy asks who made it; when you name every hand, she invites the staff to her table.' },
  'forest-supper': { pre: 'Dusk catches you in the pines, far from the road to the next town. You gather mushrooms, roots, and berries, light a small fire, and make supper in your old pot. The forest is quiet, and you have only what you carried and found.', resolution: 'Your supper sends a warm scent through the trees. A wagon lantern appears on the road, and its driver stops to ask what is cooking.' },
  'merchant-wagon': { pre: 'The wagon belongs to Mera, a merchant heading for the same town. She offers you a seat beside the driver if you cook for her caravan. The road is easier to follow with company; tonight you must show that your pot can feed it.', resolution: 'Mera makes room for your pot beside the wagon. By the last bowl you are trading stories, and she calls you her friend.' },
  'bandit-supper': { pre: 'A band of road thieves steps from the trees while you cook at camp. Their leader eyes Mera’s wagon, then your pot. There are enough of them that one dish will not please everyone. Feed them with at least three ingredient types before anyone reaches for a weapon.', resolution: 'The bandits lower their weapons. They let the caravan pass, then offer to escort it in exchange for a place at supper each night.' },
  'caravan-night': { pre: 'The former bandits scout ahead while Mera drives. At a sheltered camp, everyone waits for supper, still uncertain how to sit beside yesterday’s enemies. The old pot has more mouths to feed than it did yesterday.', resolution: 'The camp eats together. Far beyond the firelight, a branch cracks under a slow, heavy step.' },
  'troll-supper': { pre: 'A tall blue forest troll stands over the wagons. It is hungry enough to eye the horses, but it understands your offer of food. Its long arms reach past the fire for the pot. Only large servings will satisfy it; feed it before its patience runs out.', resolution: 'The troll leaves the horses alone. At dawn it follows the caravan at a distance, looking back whenever you uncover the pot.' },
  'growing-feast': { pre: 'Mera has the wagon, the former bandits have the road, and the troll keeps pace outside the firelight. Other travelers join you at the next clearing. Make a supper large enough for this unlikely company before the night grows cold.', resolution: 'Bowls pass down the line and laughter rises through the pines. A vast shadow crosses the clearing: something with wings has noticed the feast.' },
  'dragon-trial': { pre: 'A great copper dragon lands beside the feast. It followed the sound and smell, but your old pot interests it most. It demands large bowls and commands the heat on bowls two and four. Satisfy its hunger and it promises to carry you to town; fail and it will seek its own supper.', resolution: 'The dragon finishes its last bowl and lowers a wing. It will carry you to town as promised.' }
};
const LIVE_REACTIONS = {
  'borrowed-kitchen': ['The cook tastes another spoonful.', 'The tavern leans toward the pot.'],
  'service-door': ['The staff ask for seconds.', 'The trays can wait.'],
  princess: ['Mirabel studies the bowl.', 'Her page sets down the pen.'],
  'empty-cellar': ['The crew compare their jars.', 'The cook scratches a note.'],
  'brass-watch': ['The guards ask what went into it.', 'More bowls come out.'],
  'pilot-light': ['Coppersmoke studies the steam.', 'The guards wait beside the vent.'],
  rehearsal: ['The pretend court laughs.', 'Mirabel considers the courses.'],
  'veiled-gift': ['The traveler listens closely.', 'She finishes her bowl.'],
  'last-supper-before': ['The cook shares a bowl.', 'The staff gather close.'],
  envoy: ['The envoy considers her spoon.', 'The court waits for her answer.'],
  'forest-supper': ['The pot smells wonderful.', 'Far off, a wheel creaks.'],
  'merchant-wagon': ['Mera asks for seconds.', 'The caravan eats beside the wagon.'],
  'bandit-supper': ['The leader asks for another taste.', 'The weapons hang low.'],
  'caravan-night': ['Bowls pass around the fire.', 'The woods are quiet for now.'],
  'troll-supper': ['The troll asks for more.', 'The horses settle.'],
  'growing-feast': ['Laughter fills the clearing.', 'The night air carries the smell.'],
  'dragon-trial': ['The dragon calls for another bowl.', 'Its flame rises.']
};
for (const story of STORIES) for (const encounter of story.chapters) {
  const copy = CHAPTER_COPY[encounter.id];
  if (copy?.pre) encounter.narrative = copy.pre;
  encounter.resolution = copy?.resolution ?? '';
  if (LIVE_REACTIONS[encounter.id]) encounter.dialogue[2] = LIVE_REACTIONS[encounter.id];
}
export function getStory(state) { return STORIES.find((entry) => entry.id === (state.storyId ?? 'royal')); }
export function getEncounter(state) { return getStory(state).chapters[state.encounterIndex]; }
export function bossDemandText(encounter) {
  const boss = encounter.boss;
  if (!boss) return 'Preferences only. Any serving size and heat are allowed.';
  const rules = [];
  if (boss.requiredSize) rules.push(`Only ${boss.requiredSize} servings are accepted.`);
  if (boss.requiredTypes) rules.push(`Serve at least ${boss.requiredTypes} distinct ingredient types across this encounter. Current variety is shown during cooking.`);
  if (boss.kind === 'princess') rules.push('One random offer is replaced by a royal request each turn. Add it for ×1.35 bowl points; discarding it is allowed.');
  if (boss.kind === 'dragon') rules.push('The dragon locks the announced heat on bowls 2 and 4. Other bowls are yours to control.');
  if (boss.kind === 'witch') rules.push('One random installed residue loses its effect and objective progress for this bowl only. The curse is revealed before choosing.');
  return rules.join(' ');
}

export function audienceReaction(encounter, score, target) {
  const fraction = Math.max(0, Math.min(1, score / target));
  const level = fraction >= 1 ? 2 : fraction >= .45 ? 1 : 0;
  return { fraction, level, lines: encounter.dialogue[level], label: encounter.boss?.meter ?? 'Enjoyment',
    mood: ['Unconvinced', 'Warming to you', 'Won over'][level] };
}
