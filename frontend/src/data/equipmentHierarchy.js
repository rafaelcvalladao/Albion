/**
 * Hierarquia de equipamentos baseada em ao-bin-dumps
 * Estrutura: Equipamento → Tipo → Variantes específicas
 */

export const EQUIPMENT_HIERARCHY = {
  Arma: {
    label: 'Arma',
    types: {
      Espada: ['Espada', 'Espada Longa', 'Espada de Guerra', 'Espada Corrupta'],
      Arco: ['Arco', 'Arco Longo', 'Arco de Guerra', 'Arco Sussurrante', 'Arco Plangente', 'Arco Badônico', 'Fura-bruma', 'Arco do Andarilho Celeste'],
      Besta: ['Besta', 'Besta Arcana', 'Besta de Fogo', 'Besta de Gelo', 'Besta Sagrada', 'Besta da Natureza', 'Metamorfo da Besta'],
      Machado: ['Machado', 'Machado de Mão', 'Machado Duplo', 'Machado Duplo Guardião', 'Machado Guardião'],
      'Dois Machados': ['Dois Machados', 'Dois Machados de Mão', 'Machado Duplo Gigante'],
      Maça: ['Maça', 'Maça de Cura', 'Maça Mágica', 'Maça Guardião'],
      Foice: ['Foice', 'Foice Longa', 'Foice Mágica', 'Foice Corrupta'],
      'Lança/Halberd': ['Lança', 'Lança de Guerra', 'Halberd', 'Pike'],
    }
  },
  Topo: {
    label: 'Topo (Capacete)',
    types: {
      Pano: ['Capuz de Pano', 'Capuz de Mago', 'Coração de Clérigo', 'Capuz de Assassino'],
      Couro: ['Capacete de Couro', 'Elmo de Couro', 'Capuz de Caçador', 'Máscara de Couro'],
      Placa: ['Elmo de Placa', 'Elmo de Soldado', 'Elmo de Guardião', 'Coroa de Placa'],
    }
  },
  Armadura: {
    label: 'Armadura (Peitoral)',
    types: {
      Pano: ['Robe de Pano', 'Robe de Clérigo', 'Robe de Mago', 'Jaqueta de Assassino', 'Jaqueta Arcana'],
      Couro: ['Armadura de Couro', 'Jaqueta de Couro', 'Armadura de Caçador', 'Colete de Couro'],
      Placa: ['Armadura de Placa', 'Armadura de Soldado', 'Armadura de Guardião', 'Torso de Placa'],
    }
  },
  Bota: {
    label: 'Bota (Calçado)',
    types: {
      Pano: ['Sapatos de Pano', 'Botas de Mago', 'Sapatos de Clérigo', 'Sapatos de Assassino'],
      Couro: ['Botas de Couro', 'Sapatos de Caçador', 'Botas de Caçador', 'Sapatos de Caçador Leve'],
      Placa: ['Botas de Placa', 'Botas de Soldado', 'Botas de Guardião', 'Botas de Placa Pesada'],
    }
  },
  Capa: {
    label: 'Capa',
    types: {
      Normal: ['Capa Simples', 'Capa de Viajante', 'Capa Elemental'],
      'Facção FW': ['Capa Fort Sterling', 'Capa Lymhurst', 'Capa Bridgewatch', 'Capa Martlock', 'Capa Thetford'],
    }
  }
};

/**
 * Níveis de qualidade dos itens baseado em ao-bin-dumps
 * @1 = Rara, @2 = Excepcional, @3 = Excepcional (alt), @4 = Pristina
 */
export const QUALITY_LEVELS = [
  { value: '0', label: 'Padrão', suffix: '' },
  { value: '1', label: 'Rara', suffix: '@1' },
  { value: '2', label: 'Excepcional', suffix: '@2' },
  { value: '3', label: 'Excepcional (Alt)', suffix: '@3' },
  { value: '4', label: 'Pristina', suffix: '@4' },
];

/**
 * Mapeamento detalhado de código → nome para equipamentos
 * Usando padrões baseados em ao-bin-dumps
 */
export const EQUIPMENT_CODE_MAP = {
  // Armas - 2H
  Espada: ['SWORD', 'GREATSWORD'],
  Arco: ['BOW', 'LONGBOW'],
  Besta: ['CROSSBOW'],
  Machado: ['BATTLEAXE', 'HATCHET'],
  'Dois Machados': ['DUALAXE', 'DUALAXE_KEEPER'],
  Maça: ['MACE', 'CLUB'],
  Foice: ['SCYTHE'],
  'Lança/Halberd': ['PIKE', 'HALBERD'],
  
  // Armas - MAIN (mão primária)
  Adaga: ['DAGGER'],
  
  // Armaduras
  Pano: ['CLOTH', 'MAGEROBES', 'CLOTHROBES'],
  Couro: ['LEATHER', 'LEATHERARMOR'],
  Placa: ['PLATE', 'PLATEARMOR', 'SOLDIERARMOR'],
  
  // Capas
  Normal: ['CAPE', 'CAPEITEM'],
  'Facção FW': ['CAPEITEM_FW'],
};

/**
 * Função para obter o tipo de slot baseado no equipamento selecionado
 */
export function getSlotForEquipment(equipment) {
  const mapping = {
    Arma: ['MAIN', '2H'],
    Topo: ['HEAD'],
    Armadura: ['ARMOR'],
    Bota: ['SHOES'],
    Capa: ['CAPEITEM', 'CAPE'],
  };
  return mapping[equipment] || [];
}

/**
 * Função para obter variantes de um equipamento
 * baseadas na categoria e tipo
 */
export function getVariantsForEquipmentType(equipment, type) {
  if (!EQUIPMENT_HIERARCHY[equipment]) return [];
  return EQUIPMENT_HIERARCHY[equipment].types[type] || [];
}

/**
 * Obtém todos os tipos disponíveis para um equipamento
 */
export function getTypesForEquipment(equipment) {
  if (!EQUIPMENT_HIERARCHY[equipment]) return [];
  return Object.keys(EQUIPMENT_HIERARCHY[equipment].types);
}

/**
 * Obtém todas as categorias de equipamento
 */
export function getAllEquipmentCategories() {
  return Object.keys(EQUIPMENT_HIERARCHY);
}

/**
 * Obtém todos os níveis de qualidade disponíveis
 */
export function getAllQualityLevels() {
  return QUALITY_LEVELS;
}
