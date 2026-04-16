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
  
  const categoryMap = {
    'HEAD': 'Topo',
    'ARMOR': 'Armadura',
    'FEET': 'Bota',
    'CAPE': 'Capa',
    'MAINHAND': 'Arma',
    'TWOHAND': 'Arma',
    'OFFHAND': 'Arma'
  };
  
  const typeMap = {
    'CLOTH': 'Pano',
    'LEATHER': 'Couro',
    'PLATE': 'Placa'
  };
  
  items.forEach(item => {
    try {
      const uniqueName = item.UniqueName || '';
      const localizedName = item.LocalizedNames?.['EN-US'] || '';
      
      if (!uniqueName || !localizedName) return;
      
      // Filtrar apenas items com tier T4-T8
      if (!/T[4-8]/.test(uniqueName)) return;
      
      // Encontrar categoria
      let category = null;
      let type = null;
      
      for (const [key, cat] of Object.entries(categoryMap)) {
        if (uniqueName.includes(key)) {
          category = cat;
          
          // Encontrar tipo (CLOTH, LEATHER, PLATE)
          for (const [typeKey, typeName] of Object.entries(typeMap)) {
            if (uniqueName.includes(typeKey)) {
              type = typeName;
              break;
            }
          }
          break;
        }
      }
      
      if (category && type) {
        if (!equipment[category].subtypes[type]) {
          equipment[category].subtypes[type] = [];
        }
        equipment[category].subtypes[type].push(localizedName);
      }
    } catch (err) {
      // Ignorar itens problemáticos
    }
  });
  
  // Remover duplicatas e ordenar
  Object.values(equipment).forEach(cat => {
    Object.keys(cat.subtypes).forEach(type => {
      cat.subtypes[type] = [...new Set(cat.subtypes[type])].sort();
    });
  });
  
  return equipment;
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
