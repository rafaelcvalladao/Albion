#!/usr/bin/env python3
"""
Análise COMPLETA e CUIDADOSA de todos os subtipos de arma no database
Vamos identificar TODOS os tipos únicos de forma precisa
"""
import json
from pathlib import Path
from collections import defaultdict

items_file = Path("backend/data/items.json")

print("=" * 80)
print("ANÁLISE COMPLETA DE ARMAS NO DATABASE")
print("=" * 80 + "\n")

with open(items_file, 'r', encoding='utf-8') as f:
    items = json.load(f)

if isinstance(items, dict):
    items = list(items.values())

# Coletar TODOS os tokens únicos que aparecem em pos_2 para armas (2H, MAIN, OFF, ARTEFACT)
weapon_pos2_tokens = defaultdict(int)
todas_armas = []

for item in items:
    try:
        if not isinstance(item, dict):
            continue
        
        unique = item.get('UniqueName', '')
        localized = item.get('LocalizedNames', {}).get('EN-US', '') if isinstance(item.get('LocalizedNames'), dict) else ''
        
        if not unique or not localized or not any(f'T{i}' in unique for i in range(4, 9)):
            continue
        
        parts = unique.split('_')
        if len(parts) < 2:
            continue
        
        # Se é arma
        if parts[1] in {'2H', 'MAIN', 'OFF', 'ARTEFACT'}:
            # Token em pos_2
            if len(parts) >= 3:
                pos2_token = parts[2]
                # Remover qualidade
                pos2_clean = pos2_token.replace('@0', '').replace('@1', '').replace('@2', '').replace('@3', '').replace('@4', '')
                weapon_pos2_tokens[pos2_clean] += 1
            
            todas_armas.append({
                'UniqueName': unique,
                'Localized': localized,
                'Pos2': parts[2] if len(parts) >= 3 else '?'
            })
    except Exception as e:
        print(f"Erro: {e}")

print("[TOKENS ÚNICOS EM POS_2 - SORTED BY FREQUENCY]\n")
for token in sorted(weapon_pos2_tokens.items(), key=lambda x: x[1], reverse=True):
    print(f"  {token[0]:30s}: {token[1]:4d} itens")

print(f"\n[RESUMO]")
print(f"  Total de tokens únicos em pos_2: {len(weapon_pos2_tokens)}")
print(f"  Total de itens de arma: {len(todas_armas)}")

# Agora vamos ver quais localized_names aparecem para cada token
print(f"\n[EXEMPLOS DE NOMES LOCALIZADOS POR TOKEN]\n")

token_examples = defaultdict(set)
for arma in todas_armas:
    pos2 = arma['Pos2'].replace('@0', '').replace('@1', '').replace('@2', '').replace('@3', '').replace('@4', '')
    # Extrair a primeira palavra significativa do nome localizado (ignora "Adept's", "Master's", etc)
    name_parts = arma['Localized'].split()
    if len(name_parts) > 1:
        # Pegar depois do "'s"
        if "'" in arma['Localized']:
            idx = arma['Localized'].index("'")
            relevant_name = arma['Localized'][idx+3:].strip()  # Pular "'s "
        else:
            relevant_name = ' '.join(name_parts[1:])
    else:
        relevant_name = arma['Localized']
    
    token_examples[pos2].add(relevant_name)

for token in sorted(token_examples.keys())[:30]:  # Mostrar primeiros 30
    examples = sorted(list(token_examples[token]))[:5]
    print(f"  {token}:")
    for ex in examples:
        print(f"    - {ex}")
    if len(token_examples[token]) > 5:
        print(f"    ... e mais {len(token_examples[token]) - 5}")
    print()

print("\n" + "=" * 80)
print("RESUMO DE RECOMENDAÇÕES")
print("=" * 80)
print(f"\nTokens encontrados: {len(weapon_pos2_tokens)}")
print(f"\nProcurar certificar que mappeamos corretamente todos estes tokens")
print(f"no backend/src/equipmentService.js na função getWeaponSubtype()")
