# Story portrait assets

Created with the built-in image-generation tool for this implementation (not the CLI). Each file is a separate generated raster illustration; no contact-sheet crops or resizing were used. These are static portraits, not animated expressions. The UI changes dialogue, mood text and frame color as points arrive.

## Generation prompt

Every request used this complete template, substituting the subject below:

> Use case: illustration-story. Asset type: square character portrait for a cozy fantasy cooking deck-building game. Primary request: {subject}. Style: richly painted storybook gouache, confident dark outlines, charming expressive features, warm parchment-and-copper palette with jewel-tone accents, polished hand-painted game illustration. Composition: a single square portrait, main face centered in upper-middle, clear silhouette and generous safe margins for rounded UI crop; chest-up framing where applicable. No UI, no lettering, no logo, no watermark.

## Subjects and shipped files

- [cook.png](cook.png): a tired but warm-hearted royal cook in a cream chef's cap and weathered apron, red scarf, holding a wooden tasting spoon; a cozy candlelit tavern kitchen behind him.
- [princess.png](princess.png): a haughty adult princess wearing a small gold crown and plum-purple formal dress, lifting one tiny silver spoon with a skeptical raised eyebrow; royal dining room behind her.
- [ogre.png](ogre.png): a huge friendly-hungry green ogre innkeeper with small tusks and a patched burgundy waistcoat, clutching an enormous empty wooden bowl; mountain roadside inn behind him.
- [dragon.png](dragon.png): an imperious copper-red dragon with swept horns and expressive gold eyes, head and upper chest visible, breathing a little harmless steam toward a cooking furnace; dark warm forge behind it.
- [witch.png](witch.png): a clever elderly witch diplomat with silver hair, teal cloak and tall crooked hat, studying a luminous purple spoon with a mischievous smile; moonlit banquet hall behind her.
- [feast.png](feast.png): a lively small group of medieval tavern diners of varied appearances, an elderly woman and a young adult traveler in front, sharing bowls around a wooden table; warm welcoming fantasy inn.

The game loads these from `stories/catalog.js` portrait keys. Repeated ordinary encounters deliberately share the cook or feast portrait. Stocks reuse existing ingredient illustrations through `imageId`; additional residues reuse their deck's residue illustrations with distinct symbols and names. Existing transparent ingredient images were not altered.
