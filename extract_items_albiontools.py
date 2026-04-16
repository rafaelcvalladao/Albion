#!/usr/bin/env python3
"""
Script para extrair dados de itens do Albion Online usando albiontools
Mais preciso que UnityPy para arquivos BIN do Albion
"""
import json
import sys
from pathlib import Path

def extract_with_albiontools():
    """Extrai dados usando albiontools"""
    try:
        from albiontools import Parser
    except ImportError:
        print("❌ albiontools não está instalado.")
        print("\nPara instalar, execute:")
        print("  pip install git+https://github.com/ao-data/albiontools")
        return False
    
    game_data_path = Path(r"C:\Program Files (x86)\AlbionOnline\game\Albion-Online_Data\StreamingAssets\GameData")
    items_bin_path = game_data_path / "items.bin"
    
    if not items_bin_path.exists():
        print(f"❌ Arquivo não encontrado: {items_bin_path}")
        return False
    
    print(f"📂 Lendo arquivo: {items_bin_path}")
    print(f"   Tamanho: {items_bin_path.stat().st_size / 1024 / 1024:.1f} MB")
    
    try:
        print("\n[1/3] Parsing arquivo BIN...")
        parser = Parser()
        
        # Carregar arquivo BIN
        with open(items_bin_path, 'rb') as f:
            items_data = parser.parse(f)
        
        print(f"[2/3] Verificando estrutura dos dados...")
        
        # Converter para formato esperado (lista de dicts)
        if isinstance(items_data, dict):
            items_list = list(items_data.values())
        else:
            items_list = items_data
        
        print(f"   ✓ {len(items_list)} itens encontrados")
        
        # Salvar
        output_path = Path("items_local.json")
        print(f"\n[3/3] Salvando em {output_path}...")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(items_list, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Sucesso! {len(items_list)} itens extraídos")
        
        if items_list:
            first = items_list[0]
            print(f"\n   Exemplo de item:")
            print(f"   {json.dumps(first, indent=3, ensure_ascii=False)[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao extrair: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("EXTRATOR DE ITENS - Albion Online (albiontools)")
    print("=" * 60 + "\n")
    
    success = extract_with_albiontools()
    sys.exit(0 if success else 1)
