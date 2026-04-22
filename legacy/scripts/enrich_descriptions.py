#!/usr/bin/env python3
"""Enrich CSV with product descriptions fetched from individual product pages."""

import csv
import re
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

CSV_PATH = "/Users/davidabn/chinelaria/catalogo_chinelaria.csv"
OUTPUT_PATH = "/Users/davidabn/chinelaria/catalogo_chinelaria.csv"


def fetch_description(url):
    """Fetch product description from individual product page."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return ""
        soup = BeautifulSoup(r.text, "html.parser")
        # Try multiple class names (varies by product type)
        for cls in ["descricao-produto", "description", "produto-descricao"]:
            el = soup.find(class_=cls)
            if el:
                text = el.get_text(" ", strip=True)
                # Remove leading "Descrição do produto" prefix
                text = re.sub(r'^Descrição do produto\s*', '', text)
                text = re.sub(r'\s+', ' ', text).strip()
                if len(text) > 500:
                    text = text[:497] + "..."
                if text:
                    return text
        # Fallback: meta description
        meta = soup.find("meta", attrs={"name": "description"})
        if meta:
            text = meta.get("content", "").strip()
            if text and len(text) > 30:
                return text[:500]
        return ""
    except Exception:
        return ""


def main():
    # Read CSV
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        fieldnames = reader.fieldnames
        rows = list(reader)

    # Find rows without description
    to_enrich = [(i, row) for i, row in enumerate(rows) if not row["descricao"].strip()]
    print(f"Total: {len(rows)} produtos")
    print(f"Sem descrição: {len(to_enrich)} produtos")
    print(f"Buscando descrições... (isso pode levar alguns minutos)\n")

    # Fetch descriptions in parallel (5 threads to be polite)
    done = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {}
        for i, row in to_enrich:
            url = row["link"]
            if not url:
                continue
            futures[executor.submit(fetch_description, url)] = i

        for future in as_completed(futures):
            idx = futures[future]
            desc = future.result()
            if desc:
                rows[idx]["descricao"] = desc
            done += 1
            if done % 50 == 0:
                print(f"  Processados: {done}/{len(to_enrich)}")

    # Count enriched
    enriched = sum(1 for i, _ in to_enrich if rows[i]["descricao"].strip())
    print(f"\nDescrições adicionadas: {enriched}/{len(to_enrich)}")

    # Write back
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

    # Final stats
    total_with_desc = sum(1 for r in rows if r["descricao"].strip())
    print(f"Total com descrição: {total_with_desc}/{len(rows)}")
    print(f"CSV atualizado: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
