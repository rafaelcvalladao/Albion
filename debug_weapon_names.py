#!/usr/bin/env python3
"""
Debugar estrutura exata de nomes de armas
"""
import json
from pathlib import Path

items_file = Path("backend/data/items.json")

with open(items_file, 'r', encoding='utf-8') as f:
    items = json.load(f)

if isinstance(items, dict):
    items = list(items.values())

print("=" * 70)
print("DEBUGAR ESTRUTURA DE NOMES DE ARMAS")
print("=" * 70 + "\n")

# Procurar por armas específicas
keywords = ['SWORD', 'BOW', 'AXE', '2H', 'MAIN']

count = 0
for keyword in keywords:
    print(f"\n[Itens com '{keyword}']:")
    encontrados = []
    
    for item in items:
        try:
            if not isinstance(item, dict):
                continue
            
            unique = item.get('UniqueName', '')
            if not unique or keyword not in unique.upper():
                continue
            
            if not any(f'T{i}' in unique for i in range(4, 9)):
                continue
            
            encontrados.append(unique)
            if len(encontrados) <= 5:
                print(f"  {unique}")
        except:
            pass
    
    if encontrados:
        print(f"  Total: {len(encontrados)} itens")
    
    if count < 3:
        # Mostrar próximos 3 keywords para debug
        count += 1
    else:
        break
