/**
 * Serviço para extrair dados de equipamentos do items.json
 * Carrega dinamicamente dados de armas, armaduras, etc
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ITEMS_FILE = path.join(__dirname, '../data/items.json');

let cachedItems = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3600000; // 1 hora em ms

/**
 * Carrega items.json com cache
 */
function loadItems() {
  const now = Date.now();
  
  // Verificar cache
  if (cachedItems && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedItems;
  }
  
  try {
    const data = fs.readFileSync(ITEMS_FILE, 'utf-8');
    cachedItems = JSON.parse(data);
    cacheTimestamp = now;
    console.log(`✓ Items.json carregado (${cachedItems.length} itens)`);
    return cachedItems;
  } catch (err) {
    console.error('❌ Erro ao carregar items.json:', err.message);
    return [];
  }
}

/**
 * Extrai estrutura de equipamentos dos items
 * Retorna: { Arma: { tipos... }, Topo: { tipos... }, etc }
 */
export function extractEquipmentHierarchy() {
  const items = loadItems();
  const equipment = {
    Arma: { subtypes: {} },
    Topo: { subtypes: {} },
    Armadura: { subtypes: {} },
    Bota: { subtypes: {} },
    Capa: { subtypes: {} }
  };
  
  items.forEach(item => {
    try {
      if (!item || typeof item !== 'object') return;
      
      const uniqueName = item.UniqueName || '';
      const localizedNames = item.LocalizedNames;
      
      if (!uniqueName || !localizedNames || typeof localizedNames !== 'object') return;
      
      // Usar português (PT-BR) para nomes de itens
      const localizedName = localizedNames['PT-BR'] || localizedNames['EN-US'];
      if (!localizedName) return;
      
      // Filtrar apenas items com tier T4-T8
      if (!/T[4-8]/.test(uniqueName)) return;
      
      // Estrutura: T{tier}_{TYPE}_{specifics}
      const parts = uniqueName.split('_');
      if (parts.length < 2) return;
      
      const itemType = parts[1]; // HEAD, ARMOR, FEET, CAPE, 2H, MAIN, OFF, ARTEFACT
      
      let category = null;
      let subtype = null;
      
      // Mapear tipos para categorias
      switch(itemType) {
        case 'HEAD':
          category = 'Topo';
          subtype = extractMaterialType(uniqueName, localizedName);
          break;
        case 'ARMOR':
        case 'CHEST':
          category = 'Armadura';
          subtype = extractMaterialType(uniqueName, localizedName);
          break;
        case 'FEET':
        case 'SHOES':
          category = 'Bota';
          subtype = extractMaterialType(uniqueName, localizedName);
          break;
        case 'CAPE':
          category = 'Capa';
          subtype = 'Normal';
          break;
        case '2H':
        case 'MAIN':
        case 'OFF':
        case 'ARTEFACT':
          category = 'Arma';
          subtype = getWeaponSubtype(parts, localizedName);
          break;
      }
      
      // Só adicionar se tem categoria E subtipo válido
      if (category && subtype) {
        if (!equipment[category].subtypes[subtype]) {
          equipment[category].subtypes[subtype] = [];
        }
        equipment[category].subtypes[subtype].push(localizedName);
      }
    } catch (err) {
      // Ignorar itens problemáticos
    }
  });
  
  // Remover duplicatas (baseado em nome base sem tier), ordenar e limitar quantidade
  Object.values(equipment).forEach(cat => {
    Object.keys(cat.subtypes).forEach(type => {
      // Usar Set com nomes deduplicated (sem tier prefix)
      const uniqueItems = new Set();
      cat.subtypes[type].forEach(item => {
        const baseName = extractBaseName(item);
        uniqueItems.add(baseName);
      });
      
      // Converter Set para array, ordenar e limitar
      const unique = Array.from(uniqueItems).sort();
      cat.subtypes[type] = unique.slice(0, 100);
    });
  });
  
  return equipment;
}

/**
 * Extrai o nome base do item, removendo prefixos de tier
 * Ex: "Robe de Clérigo do Adepto" → "Robe de Clérigo"
 * Ex: "Traje do Cavouqueiro Adepto" → "Traje do Cavouqueiro"
 */
function extractBaseName(localizedName) {
  // Prefixos de tier em português para remover (com ou sem "do" antes)
  const tierPrefixes = [
    / do Adepto$/,      // Tier 4 com "do"
    / do Curandeiro$/,  // Tier 5 com "do"
    / do Perito$/,      // Tier 5 com "do"
    / do Experiente$/,  // Tier 5 com "do"
    / do Mestre$/,      // Tier 6 com "do"
    / do Grão-mestre$/, // Tier 7 com "do"
    / do Ancião$/,      // Tier 8 com "do"
    / do Encantador$/,  // Tier 8 com "do"
    / Adepto$/,         // Tier 4 sem "do"
    / Curandeiro$/,     // Tier 5 sem "do"
    / Perito$/,         // Tier 5 sem "do"
    / Experiente$/,     // Tier 5 sem "do"
    / Mestre$/,         // Tier 6 sem "do"
    / Grão-mestre$/,    // Tier 7 sem "do"
    / Ancião$/,         // Tier 8 sem "do"
    / Encantador$/,     // Tier 8 sem "do"
  ];
  
  let baseName = localizedName;
  for (const pattern of tierPrefixes) {
    baseName = baseName.replace(pattern, '');
  }
  
  return baseName.trim();
}

/**
 * Extrai tipo de material (Pano, Couro, Placa) baseado no nome
 */
function extractMaterialType(uniqueName, localizedName) {
  if (uniqueName.includes('CLOTH')) return 'Pano';
  if (uniqueName.includes('LEATHER')) return 'Couro';
  if (uniqueName.includes('PLATE')) return 'Placa';
  
  // Fallback: inferir do nome localizado
  if (localizedName.includes('Cloth') || localizedName.includes('Mage') || localizedName.includes('Cleric')) return 'Pano';
  if (localizedName.includes('Leather') || localizedName.includes('Hunter') || localizedName.includes('Assassin')) return 'Couro';
  if (localizedName.includes('Plate') || localizedName.includes('Soldier') || localizedName.includes('Guardian')) return 'Placa';
  
  return 'Pano'; // Padrão
}

/**
 * Extrai subtipo de arma (Espada, Arco, etc)
 * Baseado na estrutura: T4_2H_KNUCKLES_HELL ou T4_MAIN_BOW_CRYSTAL
 * O tipo de arma está em parts[2], parts[3], etc
 * ANÁLISE COMPLETA: 84 tokens únicos identificados no database
 */
function getWeaponSubtype(parts, localizedName) {
  // Mapeamento COMPLETO baseado em análise completa do database
  const typeMapping = {
    // ESPADA e variantes (8 tokens)
    'SWORD': 'Espada',
    'CLAYMORE': 'Espada',
    'DUALSWORD': 'Espada',
    'RAPIER': 'Espada',
    'SCIMITAR': 'Espada',
    'DUALSCIMITAR': 'Espada',
    'CLEAVER': 'Espada',
    
    // ARCO e variantes (3 tokens)
    'BOW': 'Arco',
    'LONGBOW': 'Arco',
    'WARBOW': 'Arco',
    
    // BESTA e variantes (5 tokens)
    'CROSSBOW': 'Besta',
    'CROSSBOWLARGE': 'Besta',
    'DUALCROSSBOW': 'Besta',
    '1HCROSSBOW': 'Besta',
    'REPEATINGCROSSBOW': 'Besta',
    
    // MACHADO e variantes (2 tokens)
    'AXE': 'Machado',
    'DUALAXE': 'Machado',
    
    // MAÇA e variantes (3 tokens)
    'MACE': 'Maça',
    'DUALMACE': 'Maça',
    'ROCKMACE': 'Maça',
    
    // MARTELO e variantes (4 tokens)
    'HAMMER': 'Martelo',
    'DUALHAMMER': 'Martelo',
    'POLEHAMMER': 'Martelo',
    'FLAIL': 'Martelo',
    
    // FOICE e variantes (3 tokens)
    'SCYTHE': 'Foice',
    'TWINSCYTHE': 'Foice',
    'DUALSICKLE': 'Foice',
    
    // LANÇA/HALBERD e variantes (6 tokens)
    'SPEAR': 'Lança',
    'GLAIVE': 'Lança',
    'HALBERD': 'Lança/Halberd',
    'QUARTERSTAFF': 'Lança/Halberd',
    'HARPOON': 'Lança',
    'TRIDENT': 'Lança',
    
    // ADAGA e variantes (2 tokens)
    'DAGGER': 'Adaga',
    'DAGGERPAIR': 'Adaga',
    
    // BASTÃO e variantes (14 tokens)
    'STAFF': 'Bastão',
    'HOLYSTAFF': 'Bastão Sagrado',
    'NATURESTAFF': 'Bastão da Natureza',
    'CURSEDSTAFF': 'Bastão Amaldiçoado',
    'FIRESTAFF': 'Bastão de Fogo',
    'FROSTSTAFF': 'Bastão de Gelo',
    'ARCANESTAFF': 'Bastão Arcano',
    'INFERNOSTAFF': 'Bastão de Fogo',
    'DEMONICSTAFF': 'Bastão Demoníaco',
    'GLACIALSTAFF': 'Bastão de Gelo',
    'ENIGMATICSTAFF': 'Bastão Misterioso',
    'DIVINESTAFF': 'Bastão Divino',
    'WILDSTAFF': 'Bastão Selvagem',
    'IRONCLADEDSTAFF': 'Bastão de Ferro',
    'COMBATSTAFF': 'Bastão de Combate',
    'ROCKSTAFF': 'Bastão de Pedra',
    'DOUBLEBLADEDSTAFF': 'Bastão Duplo',
    
    // LUVAS DE GUERRA / PUNHOS (4 tokens)
    'KNUCKLES': 'Luvas de Guerra',
    'CLAWPAIR': 'Luvas de Guerra',
    'ICEGAUNTLETS': 'Luvas de Guerra',
    'IRONGAUNTLETS': 'Luvas de Guerra',
    
    // ESCUDO (3 tokens)
    'SHIELD': 'Escudo',
    'TOWERSHIELD': 'Escudo',
    'SPIKEDSHIELD': 'Escudo',
    
    // TRANSFORMAÇÃO (1 token)
    'SHAPESHIFTER': 'Transformação',
    
    // TOCHA (1 token)
    'TORCH': 'Tocha',
    
    // ARTEFATOS e SECUNDÁRIOS (25. tokens)
    'BOOK': 'Artefato',
    'ORB': 'Artefato',
    'DEMONSKULL': 'Artefato',
    'TOTEM': 'Artefato',
    'CENSER': 'Artefato',
    'TOME': 'Artefato',
    'HORN': 'Artefato',
    'TALISMAN': 'Artefato',
    'LAMP': 'Artefato',
    'JESTERCANE': 'Artefato',
    'SKULLORB': 'Artefato',
    'FIRE': 'Artefato',
    'ICECRYSTAL': 'Artefato',
    'ENIGMATICORB': 'Artefato',
    'ARCANE': 'Artefato',
    'RAM': 'Artefato',
  };
  
  // Procurar em each part (especialmente pos_2 onde geralmente está o tipo)
  for (let i = 2; i < Math.min(parts.length, 5); i++) {
    const part = parts[i];
    
    // Remover qualidade (@0-@4) antes de comparar
    const partClean = part.replace(/@\d+$/, '').toUpperCase();
    
    if (typeMapping[partClean]) {
      return typeMapping[partClean];
    }
  }
  
  // Se não encontrou no mapeamento, o item pode ser uma categoria não-arma
  // (2H, MAIN, OFF, ARTEFACT, TOOL, HEAD, ARMOR, SHOES, TOKEN)
  // Nesse caso, retornar null para indicar que não é uma arma
  return null;
}

/**
 * Retorna a estrutura de equipamentos em formato otimizado para frontend
 */
export function getEquipmentData() {
  const hierarchy = extractEquipmentHierarchy();
  
  // Converter para formato esperado pelo EquipBuy.jsx
  const result = {};
  
  for (const [category, data] of Object.entries(hierarchy)) {
    const label = {
      'Arma': 'Arma',
      'Topo': 'Topo (Capacete)',
      'Armadura': 'Armadura (Peitoral)',
      'Bota': 'Bota (Calçado)',
      'Capa': 'Capa'
    }[category];
    
    result[category] = {
      label,
      types: data.subtypes
    };
  }
  
  return result;
}

/**
 * Retorna estrutura simples para listagem dinamicamente
 */
export function getEquipmentList() {
  const hierarchy = extractEquipmentHierarchy();
  const list = {};
  
  Object.entries(hierarchy).forEach(([category, data]) => {
    list[category] = {
      label: {
        'Arma': 'Arma',
        'Topo': 'Topo (Capacete)',
        'Armadura': 'Armadura (Peitoral)',
        'Bota': 'Bota (Calçado)',
        'Capa': 'Capa'
      }[category],
      types: Object.keys(data.subtypes),
      items: data.subtypes
    };
  });
  
  return list;
}
