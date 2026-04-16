#!/usr/bin/env python3
"""
Inspecionar estrutura de nomes em items.json para armas
"""
import json
from pathlib import Path
from collections import defaultdict

items_file = Path("backend/data/items.json")

with open(items_file, 'r', encoding='utf-8') as f:
    items = json.load(f)

if isinstance(items, dict):
    items = list(items.values())

print("=" * 70)
print("ANÁLISE DE NOMES EM ITEMS.JSON")
print("=" * 70 + "\n")

# Procurar por itens que parecem ser armas
print("[Procurando por armas...]")

armas_encontradas = defaultdict(list)

for item in items:
    try:
        if not isinstance(item, dict):
            continue
            
        unique_name = item.get('UniqueName', '')
        localized_names = item.get('LocalizedNames')
        
        if not unique_name or not isinstance(localized_names, dict):
            continue
        
        localized = localized_names.get('EN-US', '')
        
        if not localized:
            continue
        
        # Filtrar por Tier
        if not any(f'T{i}' in unique_name for i in range(4, 9)):
            continue
        
        # Procure por menções de armas
        if any(term in unique_name.upper() for term in ['SWORD', 'BOW', 'AXE', 'MACE', 'SPEAR', 'STAFF', 'CROSSBOW', 'DAGGER', 'PIKE', 'SCYTHE']):
            # Extrair partes do nome
            parts = unique_name.split('_')
            weapon_type = parts[1] if len(parts) > 1 else '?'
            armas_encontradas[weapon_type].append({
                'UniqueName': unique_name,
                'LocalizedName': localized
            })
    except Exception as e:
        pass

print(f"✓ {sum(len(v) for v in armas_encontradas.values())} armas encontradas")

# Mostrar alguns exemplos de cada tipo
print("\n[Exemplos de armas por tipo]:\n")
for weapon_type in sorted(armas_encontradas.keys())[:10]:
    items_list = armas_encontradas[weapon_type][:3]
    print(f"  {weapon_type} ({len(armas_encontradas[weapon_type])} itens)")
    for item in items_list:
        print(f"    - {item['UniqueName']}")
        print(f"      → {item['LocalizedName']}")
    print()

# Mostrar TODOS os tipos de armas encontrados
print(f"\n[Resumo de tipos de armas encontrados]:")
for weapon_type in sorted(armas_encontradas.keys()):
    print(f"  {weapon_type}: {len(armas_encontradas[weapon_type])} itens")
