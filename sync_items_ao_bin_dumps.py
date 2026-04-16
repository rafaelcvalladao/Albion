#!/usr/bin/env python3
"""
Script para sincronizar dados de itens com o repositório ao-bin-dumps
Este é o método mais simples e funciona sem Git instalado
"""
import json
import urllib.request
import urllib.error
import sys
from pathlib import Path

def download_items_from_ao_bin_dumps():
    """
    Baixa items.json do repositório ao-bin-dumps
    Este arquivo já contém todos os itens corretamente extraídos
    """
    
    url = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json"
    output_path = Path("items_ao_bin_dumps.json")
    
    print("=" * 60)
    print("SINCRONIZAR COM ao-bin-dumps")
    print("=" * 60 + "\n")
    
    print(f"📐 Baixando items.json do repositório oficial...")
    print(f"   URL: {url}\n")
    
    try:
        # Baixar com progresso
        def download_with_progress(url, output_file):
            print("[Conectando...]")
            with urllib.request.urlopen(url, timeout=30) as response:
                total_size = int(response.headers.get('content-length', 0))
                print(f"Tamanho: {total_size / 1024 / 1024:.1f} MB")
                
                chunk_size = 1024 * 1024  # 1 MB chunks
                downloaded = 0
                chunks = []
                
                print("[Baixando...]")
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    chunks.append(chunk)
                    downloaded += len(chunk)
                    
                    percent = (downloaded / total_size * 100) if total_size > 0 else 0
                    bar_length = 40
                    filled = int(bar_length * downloaded / total_size) if total_size > 0 else 0
                    bar = '█' * filled + '░' * (bar_length - filled)
                    
                    print(f"\r  {bar} {percent:.1f}%", end="", flush=True)
                
                print("\n[Salvando...]")
                with open(output_file, 'wb') as f:
                    for chunk in chunks:
                        f.write(chunk)
        
        download_with_progress(url, output_path)
        
        # Validar JSON
        print("[Validando JSON...]")
        with open(output_path, 'r', encoding='utf-8') as f:
            items = json.load(f)
        
        if isinstance(items, dict):
            items = list(items.values())
        
        item_count = len(items)
        print(f"\n✅ Sucesso!")
        print(f"   Arquivo: {output_path}")
        print(f"   Itens: {item_count}")
        
        if items and isinstance(items[0], dict):
            print(f"\n   Exemplo de item:")
            first = items[0]
            display = {k: v for k, v in list(first.items())[:5]}
            print(f"   {json.dumps(display, indent=4, ensure_ascii=False)}")
        
        return True
        
    except urllib.error.URLError as e:
        print(f"\n❌ Erro de conexão: {e}")
        print("\n💡 Solução:")
        print("   1. Verifique sua conexão com a internet")
        print("   2. O repositório pode estar indisponível")
        print("   3. Tente novamente mais tarde")
        return False
    except json.JSONDecodeError as e:
        print(f"\n❌ Erro ao parsear JSON: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Erro desconhecido: {e}")
        import traceback
        traceback.print_exc()
        return False

def copy_to_project():
    """Copia o arquivo para a pasta do projeto"""
    src = Path("items_ao_bin_dumps.json")
    dst = Path("backend/data/items.json")
    
    if not src.exists():
        print(f"❌ Arquivo origem não existe: {src}")
        return False
    
    dst.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"\n[Copiando para projeto...]")
    import shutil
    
    try:
        shutil.copy(src, dst)
        print(f"✓ Arquivo copiado para: {dst}")
        return True
    except Exception as e:
        print(f"❌ Erro ao copiar: {e}")
        return False

if __name__ == "__main__":
    success = download_items_from_ao_bin_dumps()
    
    if success:
        print("\n" + "=" * 60)
        print("PRÓXIMOS PASSOS")
        print("=" * 60)
        
        copy = input("\nDeseja copiar o arquivo para a pasta 'backend/data/'? (s/n): ").lower() == 's'
        
        if copy:
            if copy_to_project():
                print("\n✅ Dados atualizados com sucesso!")
                print("\n💡 Agora você pode:")
                print("   1. Usar os dados atualizados em 'backend/data/items.json'")
                print("   2. Atualizar equipmentHierarchy.js com novos itens")
                print("   3. Reexportar dados se necessário")
    
    sys.exit(0 if success else 1)
