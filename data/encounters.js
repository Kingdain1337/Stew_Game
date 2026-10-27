window.STEW_POTS = [
  { id:'iron', name:'Iron Cauldron', capacity:5, description:'A balanced 5 L starting pot. Five residue slots and a quick, concentrated stew.' },
  { id:'stockpot', name:'Royal Stockpot', capacity:7, description:'A larger pot preserves ingredients longer, but every new addition is more diluted.' }
];

window.STEW_ENCOUNTERS = [
  { id:'treasurer', name:'Royal Treasurer', title:'The careful first tasting', target:500, servings:5, modifier:{type:'type', target:'Mineral', multiplier:1.30, penaltyType:'Meat', penalty:0.80}, text:'Mineral x1.30 · Meat x0.80' },
  { id:'duchess', name:'Duchess of Embers', title:'A demand for a lively broth', target:850, servings:5, modifier:{type:'temperature', threshold:100, multiplier:0.80}, text:'Servings above 100°C score x0.80' },
  { id:'alchemist', name:'The Palace Alchemist', title:'An exacting final palate', target:1300, servings:5, modifier:{type:'type', target:'Vegetable', multiplier:1.20, penaltyType:'Dairy', penalty:0.85}, text:'Vegetable x1.20 · Dairy x0.85' }
];
