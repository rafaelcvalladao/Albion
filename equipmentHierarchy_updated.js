/**
 * Hierarquia de equipamentos baseada em ao-bin-dumps - ATUALIZADO
 * Estrutura: Equipamento → Tipo → Variantes específicas
 */

export const EQUIPMENT_HIERARCHY = {
  Topo: {
    label: 'Topo (Capacete)',
    types: {
      PLATE: ['Adept's Ancient Padding', 'Adept's Carved Skull Padding', 'Adept's Demon Helmet', 'Adept's Demonic Scraps', 'Adept's Duskweaver Helmet', 'Adept's Exalted Visor', 'Adept's Graveguard Helmet', 'Adept's Guardian Helmet', 'Adept's Helmet of Valor', 'Adept's Judicator Helmet'],
      LEATHER: ['Adept's Assassin Hood', 'Adept's Augured Padding', 'Adept's Demonhide Padding', 'Adept's Flawless Griffin Beak', 'Adept's Ghastly Visor', 'Adept's Hellion Hood', 'Adept's Hood of Tenacity', 'Adept's Hunter Hood', 'Adept's Imbued Visor', 'Adept's Mercenary Hood'],
      CLOTH: ['Adept's Alluring Padding', 'Adept's Cleric Cowl', 'Adept's Cowl of Purity', 'Adept's Cultist Cowl', 'Adept's Druid Cowl', 'Adept's Druidic Preserved Beak', 'Adept's Feyscale Hat', 'Adept's Fiend Cowl', 'Adept's Infernal Cloth Visor', 'Adept's Intact Fey Fibula'],
    }
  },
  Armadura: {
    label: 'Armadura (Peitoral)',
    types: {
      PLATE: ['Adept's Ancient Chain Rings', 'Adept's Armor of Valor', 'Adept's Demon Armor', 'Adept's Demonic Plates', 'Adept's Duskweaver Armor', 'Adept's Exalted Plating', 'Adept's Graveguard Armor', 'Adept's Guardian Armor', 'Adept's Judicator Armor', 'Adept's Knight Armor'],
      LEATHER: ['Adept's Assassin Jacket', 'Adept's Augured Sash', 'Adept's Demonhide Leather', 'Adept's Ghastly Leather', 'Adept's Hellion Jacket', 'Adept's Hunter Jacket', 'Adept's Imbued Leather Folds', 'Adept's Jacket of Tenacity', 'Adept's Mercenary Jacket', 'Adept's Mistwalker Jacket'],
      CLOTH: ['Adept's Alluring Amulet', 'Adept's Cleric Robe', 'Adept's Cultist Robe', 'Adept's Druid Robe', 'Adept's Druidic Feathers', 'Adept's Fey Dorsal Wing', 'Adept's Feyscale Robe', 'Adept's Fiend Robe', 'Adept's Infernal Cloth Folds', 'Adept's Mage Robe'],
    }
  },
  Capa: {
    label: 'Capa',
    types: {
      PLATE: ['Decorative Keeper Platemail Cape', 'Decorative Morgana Platemail Cape', 'Decorative Undead Platemail Cape', 'Wardrobe Skin: Decorative Keeper Platemail Cape', 'Wardrobe Skin: Decorative Morgana Platemail Cape', 'Wardrobe Skin: Decorative Undead Platemail Cape'],
      LEATHER: ['Decorative Keeper Leather Cape', 'Decorative Morgana Leather Cape', 'Decorative Undead Leather Cape', 'Wardrobe Skin: Decorative Keeper Leather Cape', 'Wardrobe Skin: Decorative Morgana Leather Cape', 'Wardrobe Skin: Decorative Undead Leather Cape'],
      CLOTH: ['Decorative Keeper Cloth Cape', 'Decorative Morgana Cloth Cape', 'Decorative Undead Cloth Cape', 'Wardrobe Skin: Decorative Keeper Cloth Cape', 'Wardrobe Skin: Decorative Morgana Cloth Cape', 'Wardrobe Skin: Decorative Undead Cloth Cape'],
    }
  },
}

/**
 * Níveis de qualidade dos itens baseado em ao-bin-dumps
 * @0 = Normal, @1 = Bom, @2 = Excepcional, @3 = Excelente, @4 = Obra-prima
 */
export const QUALITY_LEVELS = [
  { value: '0', label: 'Normal', suffix: '' },
  { value: '1', label: 'Bom', suffix: '@1' },
  { value: '2', label: 'Excepcional', suffix: '@2' },
  { value: '3', label: 'Excelente', suffix: '@3' },
  { value: '4', label: 'Obra-prima', suffix: '@4' },
];

// ... resto do arquivo permanece igual
