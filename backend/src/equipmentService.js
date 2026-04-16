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
      
      const localizedName = localizedNames['EN-US'];
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
  
  // Remover duplicatas, ordenar e limitar quantidade
  Object.values(equipment).forEach(cat => {
    Object.keys(cat.subtypes).forEach(type => {
      const unique = [...new Set(cat.subtypes[type])].sort();
      // Manter no máximo 100 itens por subtipo
      cat.subtypes[type] = unique.slice(0, 100);
    });
  });
  
  return equipment;
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
 */
function getWeaponSubtype(parts, localizedName) {
  // Mapeamento de palavras-chave para subtipo
  const typeMapping = {
    'SWORD': 'Espada',
    'CLAYMORE': 'Espada',
    'CLARENT': 'Espada',
    'GALATINE': 'Espada',
    'BOW': 'Arco',
    'LONGBOW': 'Arco',
    'CROSSBOW': 'Besta',
    'DUALCROSSBOW': 'Besta',
    'AXE': 'Machado',
    'DUALAXE': 'Dois Machados',
    'BATTLEAXE': 'Machado',
    'MACE': 'Maça',
    'SCYTHE': 'Foice',
    'PIKE': 'Lança',
    'HALBERD': 'Lança/Halberd',
    'GLAIVE': 'Lança',
    'SPEAR': 'Lança',
    'STAFF': 'Cetro',
    'ARCANESTAFF': 'Cetro',
    'CURSEDSTAFF': 'Cetro',
    'NATURESTAFF': 'Cetro',
    'FIRESTAFF': 'Cetro',
    'FROSTSTAFF': 'Cetro',
    'HOLYSTAFF': 'Cetro',
    'DAGGER': 'Adaga',
    'HAMMER': 'Martelo',
    'KNUCKLES': 'Punhos',
    'SHAPESHIFTER': 'Transformação',
  };
  
  // Procurar em parts[2] e depois parts[3]
  // O tipo geralmente está em pos_2 da estrutura T{tier}_{slot}_{weapontype}_{variation}
  for (let i = 2; i < Math.min(parts.length, 5); i++) {
    const part = parts[i];
    
    // Remover qualidade (@0-@4) antes de comparar
    const partClean = part.replace(/@\d+$/, '').toUpperCase();
    
    for (const [keyword, subtype] of Object.entries(typeMapping)) {
      if (partClean === keyword || partClean.includes(keyword)) {
        return subtype;
      }
    }
  }
  
  // Fallback: inferir do nome localizado
  if (localizedName.includes('Sword') || localizedName.includes('Blade')) return 'Espada';
  if (localizedName.includes('Bow')) return 'Arco';
  if (localizedName.includes('Crossbow')) return 'Besta';
  if (localizedName.includes('Axe')) return 'Machado';
  if (localizedName.includes('Mace')) return 'Maça';
  if (localizedName.includes('Scythe')) return 'Foice';
  if (localizedName.includes('Pike') || localizedName.includes('Halberd')) return 'Lança/Halberd';
  if (localizedName.includes('Staff')) return 'Cetro';
  if (localizedName.includes('Dagger')) return 'Adaga';
  if (localizedName.includes('Hammer')) return 'Martelo';
  if (localizedName.includes('Fist')) return 'Punhos';
  
  return 'Outra'; // Tipo genérico
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
