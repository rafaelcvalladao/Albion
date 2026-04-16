#!/usr/bin/env python3
"""
Inspecionar o arquivo items.bin para entender seu formato
"""
from pathlib import Path

game_data_path = Path(r"C:\Program Files (x86)\AlbionOnline\game\Albion-Online_Data\StreamingAssets\GameData")
items_bin_path = game_data_path / "items.bin"

if not items_bin_path.exists():
    print(f"❌ Arquivo não encontrado: {items_bin_path}")
    exit(1)

print(f"📂 Inspecionando: {items_bin_path}")
print(f"   Tamanho: {items_bin_path.stat().st_size / 1024 / 1024:.1f} MB")

# Ler primeiros bytes
with open(items_bin_path, 'rb') as f:
    header = f.read(512)

print(f"\n[Primeiros 512 bytes - HEX]:")
print(header.hex()[:256])

print(f"\n[Primeiros 512 bytes - ASCII]:")
try:
    ascii_text = ''.join(chr(b) if 32 <= b < 127 else '.' for b in header)
    print(ascii_text)
except:
    print("Não é texto ASCII puro")

# Procurar por padrões
print(f"\n[Análise de padrões]:")

# BIN files de unity/albion geralmente começam com magic numbers específicos
magic = header[:4]
print(f"   Magic bytes: {magic.hex()}")

# Procurar por JSON
with open(items_bin_path, 'rb') as f:
    content = f.read()

# Procurar por "UniqueName" que é o identificador de item
if b"UniqueName" in content:
    print(f"   ✓ Contém 'UniqueName' - parece ser dados de itens")
    # Encontrar primeira ocorrência
    idx = content.index(b"UniqueName")
    print(f"   Primeira ocorrência em byte: {idx}")
    print(f"   Context: {content[max(0,idx-50):idx+100]}")
else:
    print(f"   ✗ NÃO contém 'UniqueName'")

# Procurar por "{"
json_start = content.find(b"{")
if json_start >= 0:
    print(f"   ✓ Contém '{{' em offset {json_start}")
    print(f"   Context: {content[json_start:json_start+100]}")
else:
    print(f"   ✗ NÃO contém '{{' (não é JSON puro)")

# Procurar por marcadores comuns de compressão
print(f"\n[Compressão?]:")
if content[:2] == b'\x78\x9c':
    print("   ✓ Parece estar em ZLIB (gzip/deflate)")
elif content[:2] == b'BZh':
    print("   ✓ Parece estar em BZIP2")
elif content[:4] == b'PK\x03\x04':
    print("   ✓ Parece ser ZIP")
else:
    print("   ? Formato de compressão desconhecido")
