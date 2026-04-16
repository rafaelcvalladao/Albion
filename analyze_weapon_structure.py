#!/usr/bin/env python3
"""
Ver exatamente quais partes contêm informações de tipo de arma
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
print("ANÁLISE DE ESTRUTURA DE ARMAS")
print("=" * 70 + "\n")

# Focar em MAIN, 2H, OFF que sabemos ser armas
weapon_categories = {'2H', 'MAIN', 'OFF', 'ARTEFACT'}
token_counts = defaultdict(lambda: defaultdict(int))

for item in items:
    try:
        if not isinstance(item, dict):
            continue
        
        unique = item.get('UniqueName', '')
        if not unique or not any(f'T{i}' in unique for i in range(4, 9)):
            continue
        
        parts = unique.split('_')
        if len(parts) < 2:
            continue
        
        # Se é arma (tem 2H, MAIN, OFF, ARTEFACT)
        if parts[1] in weapon_categories or (len(parts) > 2 and parts[2] in weapon_categories):
            # Registrar todos os tokens
            for i, part in enumerate(parts):
                token_counts[f'pos_{i}'][part] += 1
    except:
        pass

# Mostrar os tokens mais frequentes em cada posição
print("[Tokens mais frequentes por posição]\n")
for pos in sorted(token_counts.keys())[:5]:
    print(f"{pos}:")
    sorted_tokens = sorted(token_counts[pos].items(), key=lambda x: x[1], reverse=True)
    for token, count in sorted_tokens[:10]:
        print(f"  {token}: {count}")
    print()
