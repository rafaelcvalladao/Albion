#!/usr/bin/env python3
"""
Script to analyze items.json from ao-bin-dumps
"""
import json
import urllib.request
import gzip
import re
from collections import defaultdict

# Download items.json
print("[1/5] Downloading items.json...")
url = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json"
try:
    with urllib.request.urlopen(url) as response:
        content = response.read()
    items_data = json.loads(content)
    print(f"✓ Downloaded: {len(items_data)} items")
except Exception as e:
    print(f"✗ Error downloading: {e}")
    exit(1)

# Analyze structure
print("\n[2/5] Analyzing structure...")
if isinstance(items_data, list):
    first_item = items_data[0]
    print(f"First item structure:")
    print(json.dumps((first_item), indent=2)[:500] + "...")
    all_keys = set()
    for item in items_data:
        if isinstance(item, dict):
            all_keys.update(item.keys())
    print(f"\nAll fields found: {sorted(all_keys)}")
    print(f"Total unique fields: {len(all_keys)}")
elif isinstance(items_data, dict):
    first_item = next(iter(items_data.values()))
    print(f"First item structure:")
    print(json.dumps(first_item, indent=2)[:500] + "...")
    all_keys = set()
    for item in items_data.values():
        if isinstance(item, dict):
            all_keys.update(item.keys())
    print(f"\nAll fields found: {sorted(all_keys)}")
    print(f"Total unique fields: {len(all_keys)}")

# Analyze naming patterns and tiers
print("\n[3/5] Analyzing UniqueName patterns...")
tier_counts = defaultdict(int)
category_counts = defaultdict(int)
prefix_counts = defaultdict(int)
quality_counts = defaultdict(int)

# Handle both array and dict formats
items_list = items_data if isinstance(items_data, list) else list(items_data.values())

for item in items_list:
    if isinstance(item, dict) and "UniqueName" in item:
        name = item["UniqueName"]
        # Count tiers
        match_tier = re.match(r"T(\d)", name)
        if match_tier:
            tier = f"T{match_tier.group(1)}"
            tier_counts[tier] += 1
        # Count prefixes
        if name.startswith("UNIQUE_"):
            prefix_counts["UNIQUE_"] += 1
        elif name.startswith("QUESTITEM_"):
            prefix_counts["QUESTITEM_"] += 1
        elif name.startswith("SKIN_"):
            prefix_counts["SKIN_"] += 1
        elif name.startswith("UNLOCK_"):
            prefix_counts["UNLOCK_"] += 1
        else:
            prefix_counts["TIER_PREFIX"] += 1
        
        # Count quality levels
        if "@" in name:
            quality = name.split("@")[-1]
            quality_counts[f"@{quality}"] += 1
        else:
            quality_counts["NO_QUALITY"] += 1
        
        # Count categories (second token for T-prefixed items)
        if name.startswith("T"):
            parts = name.split("_")
            if len(parts) > 1:
                category = parts[1]
                category_counts[category] += 1

print("Tier Distribution:")
for tier in sorted(tier_counts.keys()):
    print(f"  {tier}: {tier_counts[tier]} items")

print(f"\nPrefix Distribution:")
for prefix in sorted(prefix_counts.keys()):
    print(f"  {prefix}: {prefix_counts[prefix]} items")

print(f"\nQuality Level Distribution:")
for quality in sorted(quality_counts.keys()):
    print(f"  {quality}: {quality_counts[quality]} items")

print(f"\nTop 20 Categories:")
sorted_cats = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:20]
for cat, count in sorted_cats:
    print(f"  {cat}: {count} items")

# Find examples
print("\n[4/5] Finding example items...")
examples = defaultdict(list)
for item in items_list:
    if isinstance(item, dict) and "UniqueName" in item:
        name = item["UniqueName"]
        parts = name.split("_")
        if len(parts) > 1:
            category = parts[1] if name.startswith("T") else parts[0]
            if len(examples[category]) < 3:
                examples[category].append({
                    "UniqueName": name,
                    "LocalisedName": item.get("LocalisedName", "N/A")
                })

print("\nExample items per category (first 10 categories):")
for i, (cat, items) in enumerate(sorted(examples.items())[:10]):
    print(f"\n  {cat}:")
    for item in items:
        print(f"    - {item['UniqueName']} ({item['LocalisedName']})")

# Summary statistics
print(f"\n[5/5] Summary Statistics:")
print(f"Total items: {len(items_list)}")
print(f"Unique tiers: {len(tier_counts)}")
print(f"Unique categories: {len(category_counts)}")
print(f"Unique prefixes: {len(prefix_counts)}")
print(f"Unique quality levels: {len(quality_counts)}")

# Save detailed results
with open("analyze_results.json", "w", encoding="utf-8") as f:
    json.dump({
        "total_items": len(items_list),
        "tier_distribution": dict(tier_counts),
        "category_distribution": dict(category_counts),
        "prefix_distribution": dict(prefix_counts),
        "quality_distribution": dict(quality_counts),
        "example_items": dict(examples),
    }, f, indent=2, ensure_ascii=False)

print("\n✓ Analysis complete! Results saved to analyze_results.json")
