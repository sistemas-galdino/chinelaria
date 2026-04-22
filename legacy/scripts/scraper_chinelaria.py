#!/usr/bin/env python3
"""
Scraper para extrair catálogo completo da Chinelaria Leilane Neves (Magazord).
Gera CSV estruturado para base de conhecimento do GoHighLevel.
"""

import csv
import json
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.chinelarialeilaneneves.com.br"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Categorias principais para scraping (contêm todos os produtos)
MAIN_CATEGORIES = [
    ("Feminino", "Feminino", "calcados-femininos", "Adulto"),
    ("Feminino", "Feminino", "chinelo", "Adulto"),
    ("Feminino", "Feminino", "sandalia", "Adulto"),
    ("Feminino", "Feminino", "tenis-feminino", "Adulto"),
    ("Feminino", "Feminino", "babuches-femininos", "Adulto"),
    ("Feminino", "Feminino", "botas-e-coturnos", "Adulto"),
    ("Feminino", "Feminino", "chinelos-slide-feminino", "Adulto"),
    ("Feminino", "Feminino", "mocassim-feminino", "Adulto"),
    ("Feminino", "Feminino", "papetes-femininas", "Adulto"),
    ("Feminino", "Feminino", "rasteiras", "Adulto"),
    ("Feminino", "Feminino", "sapatilhas-femininas", "Adulto"),
    ("Feminino", "Feminino", "tamancos-femininos", "Adulto"),
    ("Feminino", "Feminino", "bolsas", "Adulto"),
    ("Feminino", "Feminino", "carteiras-femininas", "Adulto"),
    ("Feminino", "Feminino", "meias-femininas", "Adulto"),
    ("Feminino", "Feminino", "mochilas-feminino", "Adulto"),
    ("Masculino", "Masculino", "masculino", "Adulto"),
    ("Infantil Feminino", "Feminino", "infantil-feminino", "Infantil"),
    ("Infantil Masculino", "Masculino", "infantil-masculino", "Infantil"),
    ("Baby Menina", "Feminino", "baby-menina", "Baby"),
    ("Baby Menino", "Masculino", "baby-menino", "Baby"),
    ("Liquidação", None, "liquidacao", None),  # genero/faixa comes from product data
]


def extract_products_from_page(html):
    """Extract product list from page HTML by parsing dataVitrine JSON."""
    idx = html.find("itens: [")
    if idx == -1:
        return []
    start = html.index("[", idx)
    decoder = json.JSONDecoder()
    try:
        itens, _ = decoder.raw_decode(html, start)
        return itens
    except json.JSONDecodeError:
        return []


def get_total_pages(html):
    """Extract total number of pages from pagination HTML."""
    idx = html.find("pesquisa-paginacao")
    if idx == -1:
        return 1
    pag_section = html[idx:idx + 2000]
    matches = re.findall(r'\?p=(\d+)', pag_section)
    if matches:
        return max(int(p) for p in matches)
    return 1


def extract_sizes_and_colors(derivacoes):
    """Extract sizes and colors from derivacoesItem."""
    sizes = set()
    colors = set()
    if not derivacoes:
        return "", ""
    for group in derivacoes:
        if not isinstance(group, list):
            continue
        for item in group:
            if not isinstance(item, dict):
                continue
            deri_nome = item.get("deri_nome", "")
            derivacao = item.get("derivacao", "")
            if not derivacao:
                continue
            if deri_nome == "Tamanho":
                sizes.add(derivacao)
            elif deri_nome == "Cor":
                colors.add(derivacao)
    return " | ".join(sorted(sizes)) if sizes else "", " | ".join(sorted(colors)) if colors else ""


def detect_product_type(nome, categoria_str):
    """Detect product type from name and category."""
    nome_lower = nome.lower()
    cat_lower = (categoria_str or "").lower()
    types = [
        ("chinelo", "Chinelo"), ("sandália", "Sandália"), ("sandalia", "Sandália"),
        ("tênis", "Tênis"), ("tenis", "Tênis"), ("bota", "Bota"), ("coturno", "Bota"),
        ("papete", "Papete"), ("babuche", "Babuche"), ("tamanco", "Tamanco"),
        ("sapatilha", "Sapatilha"), ("rasteira", "Rasteira"), ("mocassim", "Mocassim"),
        ("sapatênis", "Sapatênis"), ("sapatenis", "Sapatênis"),
        ("slide", "Chinelo Slide"), ("meia", "Meia"), ("bolsa", "Bolsa"),
        ("mochila", "Mochila"), ("carteira", "Carteira"), ("slime", "Brinquedo"),
        ("brinquedo", "Brinquedo"), ("mola", "Brinquedo"), ("gel mágico", "Brinquedo"),
    ]
    for keyword, tipo in types:
        if keyword in nome_lower or keyword in cat_lower:
            return tipo
    return "Calçado"


def detect_gender_from_product(nome, categoria_str):
    """Detect gender from product data."""
    text = f"{nome} {categoria_str}".lower()
    if "feminino" in text or "feminina" in text or "fem" in text:
        return "Feminino"
    if "masculino" in text or "masculina" in text:
        return "Masculino"
    if "baby" in text or "bebê" in text or "bebe" in text:
        return "Unissex Baby"
    if "infantil" in text or "kids" in text or "mini" in text:
        return "Infantil"
    if "unisex" in text or "unissex" in text:
        return "Unissex"
    return None


def scrape_category(session, categoria_nome, genero_default, slug, faixa_default):
    """Scrape all products from a category, handling pagination."""
    products = []
    page = 1

    # First page
    url = f"{BASE_URL}/{slug}"
    print(f"  Fetching {url} ...", end=" ", flush=True)
    resp = session.get(url, headers=HEADERS)
    if resp.status_code != 200:
        print(f"ERROR {resp.status_code}")
        return products

    html = resp.text
    total_pages = get_total_pages(html)
    items = extract_products_from_page(html)
    print(f"{len(items)} products (page 1/{total_pages})")

    for item in items:
        products.append(item)

    # Remaining pages
    for page in range(2, total_pages + 1):
        time.sleep(0.5)  # Be polite
        url = f"{BASE_URL}/{slug}?p={page}"
        print(f"  Fetching page {page}/{total_pages} ...", end=" ", flush=True)
        resp = session.get(url, headers=HEADERS)
        if resp.status_code != 200:
            print(f"ERROR {resp.status_code}")
            continue
        items = extract_products_from_page(resp.text)
        print(f"{len(items)} products")
        products.extend(items)

    return products


def build_product_row(item, categoria_nome, genero_default, faixa_default, is_liquidacao):
    """Build a CSV row from a product item."""
    nome = (item.get("nome") or "").strip()
    marca = (item.get("marca") or "").strip()
    referencia = (item.get("codigo") or "").strip()
    categoria_str = item.get("categoria") or ""
    complemento = (item.get("complemento") or "").strip()

    # Parse category hierarchy
    cats = [c.strip() for c in categoria_str.split(",") if c.strip()]
    categoria = cats[0] if cats else categoria_nome
    subcategoria = cats[-1] if len(cats) > 1 else ""

    # Gender
    genero = detect_gender_from_product(nome, categoria_str)
    if not genero:
        genero = genero_default or "Unissex"

    # Age range
    faixa_etaria = faixa_default
    if not faixa_etaria:
        text = f"{nome} {categoria_str}".lower()
        if "baby" in text or "bebê" in text:
            faixa_etaria = "Baby"
        elif "infantil" in text or "kids" in text or "mini" in text:
            faixa_etaria = "Infantil"
        else:
            faixa_etaria = "Adulto"

    # Product type
    tipo_produto = detect_product_type(nome, categoria_str)

    # Prices
    preco = item.get("valor") or ""
    preco_pix = item.get("valor_pix") or ""
    preco_de = item.get("valor_de") or ""

    # Sizes and colors
    tamanhos, cores = extract_sizes_and_colors(item.get("derivacoesItem"))

    # Stock
    em_estoque = "Sim" if item.get("qtde_estoque") else "Não"

    # Link
    link = item.get("link", "")
    if link and not link.startswith("http"):
        link = f"{BASE_URL}{link}"

    # Image
    imagem = item.get("midia_url") or ""

    return {
        "nome": nome,
        "marca": marca,
        "referencia": referencia,
        "categoria": categoria,
        "subcategoria": subcategoria,
        "genero": genero,
        "faixa_etaria": faixa_etaria,
        "tipo_produto": tipo_produto,
        "preco": preco,
        "preco_pix": preco_pix,
        "preco_de": preco_de,
        "tamanhos_disponiveis": tamanhos,
        "cores_disponiveis": cores,
        "descricao": complemento,
        "link": link,
        "imagem_url": imagem,
        "em_estoque": em_estoque,
        "em_liquidacao": "Sim" if is_liquidacao else "Não",
    }


def main():
    session = requests.Session()
    all_products = {}  # keyed by referencia to deduplicate
    liquidacao_refs = set()

    print("=" * 60)
    print("Scraper Chinelaria Leilane Neves")
    print("=" * 60)

    # First pass: scrape liquidação to mark those products
    print("\n[1/2] Scraping Liquidação para marcar produtos em promoção...")
    liq_items = scrape_category(session, "Liquidação", None, "liquidacao", None)
    for item in liq_items:
        ref = item.get("codigo", "")
        if ref:
            liquidacao_refs.add(ref)

    # Second pass: scrape all main categories
    print("\n[2/2] Scraping todas as categorias...")
    for cat_nome, genero, slug, faixa in MAIN_CATEGORIES:
        print(f"\n📁 {cat_nome} ({slug})")
        items = scrape_category(session, cat_nome, genero, slug, faixa)

        for item in items:
            ref = item.get("codigo", "")
            is_liq = ref in liquidacao_refs or slug == "liquidacao"

            row = build_product_row(item, cat_nome, genero, faixa, is_liq)

            # Deduplicate by reference code; prefer non-liquidação entry for category
            if ref not in all_products:
                all_products[ref] = row
            else:
                # Update liquidação flag if found in liquidação
                if is_liq:
                    all_products[ref]["em_liquidacao"] = "Sim"
                # Keep the entry with more complete data
                existing = all_products[ref]
                if not existing["tamanhos_disponiveis"] and row["tamanhos_disponiveis"]:
                    all_products[ref] = row
                    if is_liq:
                        all_products[ref]["em_liquidacao"] = "Sim"

        time.sleep(1)  # Be polite between categories

    # Write CSV
    output_path = "/Users/davidabn/chinelaria/catalogo_chinelaria.csv"
    fieldnames = [
        "nome", "marca", "referencia", "categoria", "subcategoria",
        "genero", "faixa_etaria", "tipo_produto", "preco", "preco_pix",
        "preco_de", "tamanhos_disponiveis", "cores_disponiveis",
        "descricao", "link", "imagem_url", "em_estoque", "em_liquidacao",
    ]

    # Sort by category, then name
    sorted_products = sorted(all_products.values(), key=lambda x: (x["categoria"], x["nome"]))

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        writer.writerows(sorted_products)

    print(f"\n{'=' * 60}")
    print(f"CSV gerado com sucesso!")
    print(f"  Arquivo: {output_path}")
    print(f"  Total de produtos: {len(sorted_products)}")
    print(f"  Produtos em liquidação: {sum(1 for p in sorted_products if p['em_liquidacao'] == 'Sim')}")
    print(f"  Produtos em estoque: {sum(1 for p in sorted_products if p['em_estoque'] == 'Sim')}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
