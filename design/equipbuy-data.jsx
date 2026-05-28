// equipbuy-data.jsx — shared constants + mock data for Equip Buy.

const SLOT_DEFS = [
  { id: 'arma',  label: 'Arma',  subLabel: 'Arma' },
  { id: 'topo',  label: 'Topo',  subLabel: 'Capacete' },
  { id: 'meio',  label: 'Meio',  subLabel: 'Peitoral' },
  { id: 'baixo', label: 'Baixo', subLabel: 'Sapatos' },
  { id: 'capa',  label: 'Capa',  subLabel: 'Capa' },
];

const EB_CITIES   = ['Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Bridgewatch', 'Brecilien', 'Caerleon'];
const EB_QUALITIES = ['Normal', 'Bom', 'Excelente', 'Obra-Prima', 'Magnum Opus'];

const ITEM_SUGGESTIONS = [
  'Arco', 'Arco Real', 'Arco de Guerra', 'Adaga Sombria', 'Cajado Místico',
  'Espada Larga', 'Maça Real', 'Foice Sangrenta', 'Lança Cravejada',
  'Besta Pesada', 'Capote Feérico', 'Casaco Espectral', 'Sandálias Feéricas', 'Capa do Ancião',
];

// Mock single-item result (Arco · nv 8 · Bom · Fort Sterling)
const MOCK_ITEM_RESULT = {
  itemName: 'Arco',
  nivel: 8,
  qualidade: 'Bom',
  cidade: 'Fort Sterling',
  comprarPronto: {
    total: 305271, sub: 'T6.2 em Martlock',
  },
  comprarEncantar: {
    total: 256915, sub: 'T7.1 — .0 + Runa 7 ×384', cheaper: true,
  },
  economia: 48356,  // positive = encantando is cheaper
  rows: [
    { tier: 6, enc: 2, city: 'Martlock',     preco: 300000, tele:  5271,  total: 305271, atualizado: 'há 5h',    best: true },
    { tier: 6, enc: 2, city: 'Lymhurst',     preco: 309997, tele:  2635,  total: 312632, atualizado: 'há 2h' },
    { tier: 5, enc: 3, city: 'Thetford',     preco: 359986, tele:  1751,  total: 361737, atualizado: 'há 52min' },
    { tier: 8, enc: 0, city: 'Brecilien',    preco: 469882, tele: 11860,  total: 481742, atualizado: 'há 32min' },
    { tier: 4, enc: 4, city: 'Bridgewatch',  preco: null,   tele: null,   total: null,   atualizado: '—', dim: true },
    { tier: 4, enc: 4, city: 'Fort Sterling',preco: null,   tele: null,   total: null,   atualizado: '—', dim: true, locked: true },
  ],
};

// Mock set result — Arqueiro @ Fort Sterling, nv 8
const MOCK_SET_RESULT = {
  setName: 'Arqueiro',
  cidade: 'Fort Sterling',
  custoCidade: 837208,
  custoOtimizado: 1005627,
  slots: [
    {
      id: 'arma', slotLabel: 'Arma · Arma', itemName: 'Arco', nivel: 8,
      melhor: { tier: 7, enc: 1, action: 'encantar', total: 256915, city: 'Bridgewatch', detail: '.0 + Runa 7 ×384' },
      local:  { tier: 7, enc: 1, action: 'encantar', total: 278866, city: 'Fort Sterling', detail: '.0 + Runa 7 ×384' },
    },
    {
      id: 'topo', slotLabel: 'Topo · Capacete', itemName: 'Capote Feérico', nivel: 8,
      melhor: { tier: 7, enc: 1, action: 'encantar', total: 123219, city: 'Lymhurst', detail: '.0 + Runa 7 ×96' },
      local:  { tier: 6, enc: 2, action: 'encantar', total: 175410, city: 'Fort Sterling', detail: '.0 + Runa 6 + Alma 6 ×96' },
    },
    {
      id: 'meio', slotLabel: 'Meio · Peitoral', itemName: 'Casaco Espectral', nivel: 8,
      melhor: { tier: 5, enc: 3, action: 'encantar', total: 199331, city: 'Bridgewatch', detail: '.0 + Runa 5 + Alma 5 + Relíquia 5 ×192' },
      local:  { tier: 5, enc: 3, action: 'encantar', total: 236976, city: 'Fort Sterling', detail: '.1 + Alma 5 + Relíquia 5 ×192' },
    },
    {
      id: 'baixo', slotLabel: 'Baixo · Sapatos', itemName: 'Sandálias Feéricas', nivel: 8,
      melhor: { tier: 7, enc: 1, action: 'encantar', total: 303215, city: 'Lymhurst', detail: '.0 + Runa 7 ×96' },
      local:  { noPrice: true, city: 'Fort Sterling' },
    },
    {
      id: 'capa', slotLabel: 'Capa · Capa', itemName: 'Capa', nivel: 8,
      melhor: { tier: 8, enc: 0, action: 'pronto', total: 122947, city: 'Martlock' },
      local:  { tier: 7, enc: 1, action: 'encantar', total: 145956, city: 'Fort Sterling', detail: '.0 + Runa 7 ×192' },
    },
  ],
};

Object.assign(window, {
  EB_SLOT_DEFS: SLOT_DEFS,
  EB_CITIES, EB_QUALITIES, EB_ITEM_SUGGESTIONS: ITEM_SUGGESTIONS,
  EB_MOCK_ITEM: MOCK_ITEM_RESULT,
  EB_MOCK_SET: MOCK_SET_RESULT,
});
