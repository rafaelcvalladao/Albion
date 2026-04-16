#!/usr/bin/env python3
"""
Script para analisar items.json e atualizar equipmentHierarchy.js
com dados reais do jogo Albion Online
"""
import json
import re
from pathlib import Path
from collections import defaultdict

def analyze_items():
    """Analisa items.json para extrair estrutura de equipamentos"""
    
    items_file = Path("backend/data/items.json")
    
    if not items_file.exists():
        print(f"❌ Arquivo não encontrado: {items_file}")
        return None
    
    print(f"📊 Analisando {items_file}...")
    
    with open(items_file, 'r', encoding='utf-8') as f:
        items = json.load(f)
    
    if isinstance(items, dict):
        items = list(items.values())
    
    print(f"   Total de itens: {len(items)}")
    
    # Extrair itens de equipamento
    equipment = defaultdict(lambda: defaultdict(set))
    item_names = {}
    
    # Categorias esperadas
    categories = {
        'HEAD': 'Topo',
        'ARMOR': 'Armadura', 
        'MAINHAND': 'Arma',
        'TWOHAND': 'Arma',
        'OFFHAND': 'Arma',
        'FEET': 'Bota',
        'CAPE': 'Capa',
    }
    
    print("\n🔍 Procurando por itens de equipamento...")
    equip_count = 0
    
    for item in items:
        try:
            unique_name = item.get('UniqueName', '')
            localized_name = item.get('LocalizedNames', {}).get('EN-US', '')
            
            if not unique_name or not localized_name:
                continue
            
            # Filtrar apenas itens com tier (T4-T8)
            tier_match = re.search(r'T([4-8])', unique_name)
            if not tier_match:
                continue
            
            item_names[unique_name] = localized_name
            
            # Categorizar por tipo
            for code, category in categories.items():
                if code in unique_name.upper():
                    # Extrair tipo (ex: CLOTH, LEATHER, PLATE)
                    for armor_type in ['CLOTH', 'LEATHER', 'PLATE']:
                        if armor_type in unique_name.upper():
                            equipment[category][armor_type].add(localized_name)
                            equip_count += 1
                            break
                    break
        except:
            pass
    
    print(f"   Encontrados: {equip_count} itens de equipamento únicos")
    
    # Estatísticas
    print("\n📈 Distribuição por categoria:")
    for cat in ['Arma', 'Topo', 'Armadura', 'Bota', 'Capa']:
        if cat in equipment:
            total = sum(len(items) for items in equipment[cat].values())
            print(f"   {cat}: {total} itens")
            for armor_type, items_set in equipment[cat].items():
                print(f"      {armor_type}: {len(items_set)} itens")
    
    return dict(equipment), item_names

def generate_hierarchy_code(equipment_data):
    """Gera código JavaScript para equipmentHierarchy.js"""
    
    code = '''/**
 * Hierarquia de equipamentos baseada em ao-bin-dumps - ATUALIZADO
 * Estrutura: Equipamento → Tipo → Variantes específicas
 */

export const EQUIPMENT_HIERARCHY = {
'''
    
    # Mapeamento de categorias
    category_labels = {
        'Arma': 'Arma',
        'Topo': 'Topo (Capacete)',
        'Armadura': 'Armadura (Peitoral)',
        'Bota': 'Bota (Calçado)',
        'Capa': 'Capa',
    }
    
    for category in ['Arma', 'Topo', 'Armadura', 'Bota', 'Capa']:
        if category not in equipment_data:
            continue
        
        code += f"""  {category}: {{
    label: '{category_labels[category]}',
    types: {{
"""
        
        # Adicionar tipos com seus itens
        for armor_type, items in equipment_data[category].items():
            items_list = sorted(list(items))[:10]  # Primeiros 10 itens
            items_str = ', '.join(f"'{item}'" for item in items_list)
            code += f"      {armor_type}: [{items_str}],\n"
        
        code += """    }
  },
"""
    
    code += '''}

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
'''
    
    return code

if __name__ == "__main__":
    print("=" * 70)
    print("ANALISADOR DE ITENS - Extrair dados reais do Albion")
    print("=" * 70 + "\n")
    
    result = analyze_items()
    
    if result:
        equipment_data, item_names = result
        
        print("\n" + "=" * 70)
        print("PRÓXIMOS PASSOS")
        print("=" * 70)
        
        print("\n💡 Os dados foram analisados com sucesso!")
        print("\n📋 Opções:")
        print("   1. Gerar atualização do equipmentHierarchy.js")
        print("   2. Exportar dados brutos em JSON")
        print("   3. Apenas visualizar estatísticas")
        
        choice = input("\nO que deseja fazer? (1/2/3): ").strip()
        
        if choice == '1':
            print("\n🔄 Gerando código JavaScript...")
            code = generate_hierarchy_code(equipment_data)
            
            # Salvar em arquivo temporário
            temp_file = Path("equipmentHierarchy_updated.js")
            with open(temp_file, 'w', encoding='utf-8') as f:
                f.write(code)
            
            print(f"✓ Arquivo criado: {temp_file}")
            print("\n⚠️  IMPORTANTE:")
            print("   Verifique o arquivo antes de usar!")
            print("   A estrutura pode precisar de ajustes manuais.")
        
        elif choice == '2':
            print("\n💾 Exportando dados brutos...")
            export_file = Path("equipment_data.json")
            with open(export_file, 'w', encoding='utf-8') as f:
                # Converter sets para listas
                export_data = {
                    cat: {
                        armor_type: sorted(list(items)) 
                        for armor_type, items in types.items()
                    }
                    for cat, types in equipment_data.items()
                }
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            print(f"✓ Arquivo criado: {export_file}")
        
        print("\n✅ Análise completa!")

