// Rules data: portable game balance, intentionally separate from the interface/runtime.
window.STEW_REACTIONS = [
  { id: 'browning', name: 'Browning', needs: ['protein', 'sugar'], minTemp: 70, maxTemp: 110, effect: { protein: 0.25, sugar: 0.25 }, description: 'Protein and Sugar each gain +25% per strength.' },
  { id: 'infusion', name: 'Infusion', needs: ['fat', 'aromatic'], minTemp: 40, maxTemp: 100, effect: { fat: 0.10, aromatic: 0.20 }, description: 'Fat gains +10%; Aromatic gains +20% per strength.' },
  { id: 'extraction', name: 'Extraction', needs: ['acid', 'mineral'], minTemp: 50, maxTemp: 120, effect: { mineral: 0.40 }, description: 'Mineral gains +40% per strength; acid fades faster.' },
  { id: 'preservation', name: 'Preservation', needs: ['acid', 'sugar'], minTemp: 0, maxTemp: 60, effect: { acid: 0.15, sugar: 0.15 }, description: 'Acid and Sugar each gain +15% per strength.' }
];
