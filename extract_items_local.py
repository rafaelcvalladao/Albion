#!/usr/bin/env python3
"""
Script para extrair dados de itens do arquivo items.bin local do Albion Online
usando UnityPy
"""
import json
import sys
from pathlib import Path

# Tentar importar UnityPy
try:
    import UnityPy
except ImportError:
    print("UnityPy não está instalado. Instalando...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "UnityPy"])
    import UnityPy

def extract_items_bin():
    """Extrai dados de items.bin usando UnityPy"""
    
    game_data_path = Path(r"C:\Program Files (x86)\AlbionOnline\game\Albion-Online_Data\StreamingAssets\GameData")
    items_bin_path = game_data_path / "items.bin"
    
    if not items_bin_path.exists():
        print(f"❌ Arquivo não encontrado: {items_bin_path}")
        return False
    
    print(f"📂 Lendo arquivo: {items_bin_path}")
    print(f"   Tamanho: {items_bin_path.stat().st_size / 1024 / 1024:.1f} MB")
    
    try:
        # Carregar arquivo BIN
        print("\n[1/4] Carregando arquivo BIN...")
        env = UnityPy.load(str(items_bin_path))
        
        items_data = []
        items_count = 0
        
        # Iterar sobre todos os objetos no arquivo
        print("[2/4] Processando objetos...")
        for obj in env.objects:
            try:
                # Procurar por TextAssets (que contêm JSON)
                if hasattr(obj, "read"):
                    data = obj.read()
                    
                    # Se for um TextAsset, tentar parsear como JSON
                    if hasattr(data, "script"):
                        try:
                            item_json = json.loads(data.script)
                            if isinstance(item_json, dict) and "UniqueName" in item_json:
                                items_data.append(item_json)
                                items_count += 1
                                if items_count % 1000 == 0:
                                    print(f"   ✓ {items_count} itens extraídos...")
                        except (json.JSONDecodeError, TypeError):
                            pass
            except Exception as e:
                pass
        
        if items_count == 0:
            print("⚠️  Nenhum item extraído. Tentando método alternativo...")
            return extract_items_bin_alt()
        
        # Salvar em arquivo JSON
        output_path = Path("items_local.json")
        print(f"\n[3/4] Salvando {items_count} itens em {output_path}...")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(items_data, f, indent=2, ensure_ascii=False)
        
        # Estatísticas
        print(f"\n[4/4] Análise dos dados:")
        print(f"   ✓ Total de itens: {items_count}")
        
        # Amostra
        if items_data:
            print(f"\n   Exemplo de item:")
            first_item = items_data[0]
            print(f"   {json.dumps(first_item, indent=4, ensure_ascii=False)[:300]}...")
        
        print(f"\n✅ Sucesso! Arquivo salvo: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao processar arquivo: {e}")
        import traceback
        traceback.print_exc()
        return False

def extract_items_bin_alt():
    """Método alternativo: procurar por strings JSON dentro do BIN"""
    game_data_path = Path(r"C:\Program Files (x86)\AlbionOnline\game\Albion-Online_Data\StreamingAssets\GameData")
    items_bin_path = game_data_path / "items.bin"
    
    print("Tentando leitura direta do arquivo...")
    try:
        with open(items_bin_path, 'rb') as f:
            content = f.read()
        
        # Procurar por "{" (início de JSON)
        print("Procurando por objetos JSON no arquivo binário...")
        items = []
        
        # Esta é uma abordagem brute-force, pode ser lenta
        import re
        json_pattern = rb'\{"[^"]*":\s*'
        
        # Para arquivos grandes, vamos tentar apenas em seções específicas
        print("⚠️  Este método pode não ser preciso para arquivos binários.")
        print("Recomendo usar a ferramenta oficial ao-data/albiontools.")
        
        return False
    except Exception as e:
        print(f"Erro: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("EXTRATOR DE ITENS - Albion Online")
    print("=" * 60)
    
    success = extract_items_bin()
    
    if not success:
        print("\n⚠️  Solução alternativa:")
        print("   Instale albiontools para extrair dados com precisão:")
        print("   pip install git+https://github.com/ao-data/albiontools")
    
    sys.exit(0 if success else 1)
