# Story portrait assets

Created with the built-in image-generation tool for this implementation (not the CLI). Each file is a separate generated raster illustration; no contact-sheet crops or resizing were used. These are static portraits, not animated expressions. The UI changes dialogue, mood text and frame color as points arrive.

## Generation prompt

The original royal portraits used this template, substituting the subject below:

> Use case: illustration-story. Asset type: square character portrait for a cozy fantasy cooking deck-building game. Primary request: {subject}. Style: richly painted storybook gouache, confident dark outlines, charming expressive features, warm parchment-and-copper palette with jewel-tone accents, polished hand-painted game illustration. Composition: a single square portrait, main face centered in upper-middle, clear silhouette and generous safe margins for rounded UI crop; chest-up framing where applicable. No UI, no lettering, no logo, no watermark.

## Subjects and shipped files

- [cook.png](cook.png): a tired but warm-hearted royal cook in a cream chef's cap and weathered apron, red scarf, holding a wooden tasting spoon; a cozy candlelit tavern kitchen behind him.
- [princess.png](princess.png): a haughty adult princess wearing a small gold crown and plum-purple formal dress, lifting one tiny silver spoon with a skeptical raised eyebrow; royal dining room behind her.
- [ogre.png](ogre.png): original, more humanized ogre portrait retained for provenance but no longer used in the game.
- [dragon.png](dragon.png): original apron-wearing dragon portrait retained for provenance but no longer used in the game.
- [ogre-v2.png](ogre-v2.png): Grum as a low-slung, hairless, tusked and clawed ogre on his bridge, with a large bowl of stew. Built-in image-generation edit of the original ogre portrait, then a focused edit to replace the humanlike face with a blunt bony muzzle and ridged brow. The style, setting and warm lighting were kept; clothes and jewelry were excluded.
- [dragon-v2.png](dragon-v2.png): a fully animal-form copper dragon curled around its furnace with a bowl at its claws. Built-in image generation using the original dragon image as a painterly style and palette reference; clothing, jewelry and human features were excluded.
- [witch.png](witch.png): a clever elderly witch diplomat with silver hair, teal cloak and tall crooked hat, studying a luminous purple spoon with a mischievous smile; moonlit banquet hall behind her.
- [feast.png](feast.png): a lively small group of medieval tavern diners of varied appearances, an elderly woman and a young adult traveler in front, sharing bowls around a wooden table; warm welcoming fantasy inn.

## Caravan portraits

The six caravan illustrations use a consistent square, richly painted fantasy-game style with dark contours, textured brushwork, warm campfire against cool forest dusk, and safe margins for the rounded UI crop. All were generated with the built-in tool. The feast image was then edited using the troll portrait as a design reference so the creature remained nonhuman.

- [road-forest.png](road-forest.png): lost traveler cooks foraged mushrooms, roots and berries alone on a winding pine-forest road.
- [road-merchant.png](road-merchant.png): friendly weathered merchant at a covered wagon, sharing stew beside the forest road.
- [road-bandits.png](road-bandits.png): three hungry, wary road bandits approach a steaming pot by the merchant's wagon at night.
- [road-troll.png](road-troll.png): towering blue slate-skinned, mossy, long-armed troll with a beastlike muzzle beside the wagon and pot; visibly taller than the wagon, with no clothing or human facial proportions.
- [road-feast.png](road-feast.png): former bandits, merchant and traveler share an outdoor caravan feast while the same nonhuman blue troll watches from the firelight's edge.
- [road-dragon.png](road-dragon.png): immense copper-red quadrupedal dragon with wings, four clawed legs and a long tail lands at the forest caravan feast and studies the old pot.

The final core prompts were, respectively: “A lone traveler lost on a winding forest road cooks a simple meal from freshly foraged mushrooms, roots and berries”; “A friendly traveling merchant with a practical weathered cloak and a small covered wagon stops beside a forest campfire, intrigued by a steaming iron pot”; “A small rough group of forest-road bandits emerge from the trees toward a merchant caravan at night, drawn by the smell of a steaming iron pot”; “A towering blue forest troll follows the scent of stew to a traveling merchant caravan at night, with elongated bulky torso, long arms, blue slate-like mossy skin and a broad animal-like snout”; “A growing merchant caravan pauses at a forest clearing for an outdoor supper, with former bandits as escorts and a blue troll watching from the firelight's edge”; and “A magnificent, fully quadrupedal copper-red dragon lands beside a merchant caravan's forest clearing feast at twilight, drawn by festivities and stew.” Every prompt prohibited text and watermarks. The troll and dragon prompts also explicitly prohibited humanizing clothing, jewelry, faces and posture. The feast edit asked to match the troll in the group scene to [road-troll.png](road-troll.png) while preserving the people, wagon, pot, lighting and composition.

The game loads these from `stories/catalog.js` portrait keys. Repeated ordinary encounters deliberately share the cook or feast portrait. Stocks reuse existing ingredient illustrations through `imageId`; additional residues reuse their deck's residue illustrations with distinct symbols and names. Existing transparent ingredient images were not altered.

The exact final ogre edit prompt was: “Make Grum's head unmistakably nonhuman: replace humanlike hair, beard, eyebrows, round nose and face with a heavy hairless ogre-rhinoceros head, ridged brow, rough mossy hide, blunt bony muzzle, wide nostrils, small intelligent deep-set eyes and lower tusks. No earrings or other jewelry. Keep huge clawed hands and crouching beastlike posture.” It also required preserving the prior painterly bridge, lighting, stew and green palette, with no clothes, text or watermark.

The dragon prompt was: “A fully animal-form intelligent copper dragon inside an ancient stone furnace chamber, scales, long reptilian muzzle, swept horns, folded membranous wings, four clawed limbs and long tail. It curls around the furnace's open heat vent, watching a large bowl of stew placed on the stone floor. Convey attention through its eyes and posture.” It required the original's painterly copper palette and no clothing, apron, jewelry, human torso, hands, smile, table, text or watermark.
