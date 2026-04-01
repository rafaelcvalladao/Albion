#!/usr/bin/env python3
"""
Test script to download and check items.json
"""
import json
import urllib.request
import sys

print("Starting download test...")
sys.stdout.flush()

url = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json"
print(f"URL: {url}")
sys.stdout.flush()

try:
    print("Opening URL...")
    sys.stdout.flush()
    with urllib.request.urlopen(url, timeout=30) as response:
        print(f"Response code: {response.status}")
        sys.stdout.flush()
        content = response.read()
        print(f"Downloaded {len(content)} bytes")
        sys.stdout.flush()

    print("Parsing JSON...")
    sys.stdout.flush()
    items_data = json.loads(content)
    print(f"Successfully parsed! Found {len(items_data)} items")
    sys.stdout.flush()
    
    # Show first item
    if isinstance(items_data, list):
        print("\nFirst item (truncated):")
        print(json.dumps(items_data[0], indent=2)[:300])
    elif isinstance(items_data, dict):
        first_item = next(iter(items_data.values()))
        print("\nFirst item (truncated):")
        print(json.dumps(first_item, indent=2)[:300])
    
    sys.stdout.flush()

except json.JSONDecodeError as e:
    print(f"JSON parsing error: {e}")
    print(f"First 200 bytes: {content[:200]}")
    sys.stdout.flush()
except urllib.error.URLError as e:
    print(f"URL error: {e}")
    sys.stdout.flush()
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    sys.stdout.flush()

print("\nTest complete.")
