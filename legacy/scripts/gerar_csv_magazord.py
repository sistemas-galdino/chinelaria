#!/usr/bin/env python3
"""
Gera CSV completo do catálogo da Chinelaria via API Magazord.
Agrupa derivações por produto+cor, com estoque, preço e link.
"""

import csv
import json
import re
import sys
import time
import unicodedata
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

API_BASE = "https://chinelarialeilaneneves.painel.magazord.com.br/api"
API_USER = "MZDKc9317ea99f7807c12d38f598bd271aee5cc82c80abe23c3c95ae5465104c"
API_PASS = "u@DlO9bYoZ7$"
SITE_BASE = "https://www.chinelarialeilaneneves.com.br"
OUTPUT_CSV = f"/Users/davidabn/chinelaria/catalogo_chinelaria_api_{datetime.now().strftime('%Y-%m-%d_%H%M')}.csv"

session = requests.Session()
session.auth = (API_USER, API_PASS)


def api_get(endpoint, params=None):
    """GET request to Magazord API with retry."""
    for attempt in range(3):
        try:
            r = session.get(f"{API_BASE}{endpoint}", params=params, timeout=30)
            if r.status_code == 200:
                return r.json()
            print(f"  WARN: {endpoint} returned {r.status_code}")
        except Exception as e:
            print(f"  WARN: {endpoint} error: {e}")
        time.sleep(1)
    return None


def make_slug(nome):
    """Generate URL slug from derivation name (without size and unit)."""
    # Remove size and/or "un" from end: (... 34), (... 35/36), (... un), (... 34 un)
    sem_tam = re.sub(r'\s+(\d+(/\d+)?(\s+un)?|un)\)\s*$', ')', nome)
    sem_tam = sem_tam.replace('(', ' ').replace(')', ' ')
    slug = unicodedata.normalize('NFD', sem_tam).encode('ascii', 'ignore').decode('ascii')
    slug = re.sub(r'[^a-z0-9]+', '-', slug.lower()).strip('-')
    return slug


def fetch_all_derivacoes():
    """Fetch all active product derivations from API."""
    all_items = []
    page = 1
    total_pages = 1

    while page <= total_pages:
        print(f"  Derivações: página {page}/{total_pages}...", end=" ", flush=True)
        data = api_get("/v2/site/produtoDerivacoes", {
            "limit": 100, "page": page, "ativo": 1
        })
        if not data or data.get("status") != "success":
            print("ERRO")
            break

        items = data["data"]["items"]
        total_pages = data["data"].get("total_pages", 1)
        all_items.extend(items)
        print(f"{len(items)} itens")
        page += 1
        time.sleep(0.3)

    return all_items


def fetch_all_estoque():
    """Fetch all active stock data."""
    all_stock = {}
    offset = 0
    batch_size = 100

    while True:
        print(f"  Estoque: offset {offset}...", end=" ", flush=True)
        data = api_get("/v1/listEstoque", {
            "limit": batch_size, "offset": offset, "ativo": "true"
        })
        if not data or not data.get("data"):
            print("FIM")
            break

        items = data["data"]
        if not items:
            print("FIM")
            break

        for item in items:
            all_stock[item["produto"]] = {
                "quantidade": item["quantidadeDisponivelVenda"] or 0,
                "descricao": item.get("descricaoProduto", ""),
            }
        print(f"{len(items)} itens")
        offset += batch_size
        time.sleep(0.3)

    return all_stock


def fetch_all_precos():
    """Fetch all prices from default price table."""
    all_prices = {}
    offset = 0
    batch_size = 100

    while True:
        print(f"  Preços: offset {offset}...", end=" ", flush=True)
        data = api_get("/v1/listPreco", {
            "limit": batch_size, "offset": offset, "tabelaPreco": 1, "ativo": 1
        })
        if not data or not data.get("data"):
            print("FIM")
            break

        items = data["data"]
        if not items:
            print("FIM")
            break

        for item in items:
            all_prices[item["produto"]] = {
                "preco_venda": item.get("precoVenda", ""),
                "preco_antigo": item.get("precoAntigo", ""),
                "desconto": item.get("percentualDesconto", ""),
            }
        print(f"{len(items)} itens")
        offset += batch_size
        time.sleep(0.3)

    return all_prices


def fetch_product_details(codigo):
    """Fetch product details (description, etc)."""
    data = api_get(f"/v2/site/produto/{codigo}")
    if not data or data.get("status") != "success":
        return {}
    p = data["data"]
    loja = (p.get("produtoLoja") or [{}])[0]
    desc_html = loja.get("descricao", "")
    desc_clean = re.sub(r'<[^>]*>', ' ', desc_html)
    desc_clean = re.sub(r'\s+', ' ', desc_clean).strip()[:500]

    return {
        "descricao": desc_clean,
        "complemento": loja.get("tituloComplemento", ""),
        "acompanha": p.get("acompanha", ""),
        "palavras_chave": (p.get("palavraChave", "") or "")[:200],
    }


def detect_category(nome, derivacoes_nomes):
    """Detect product category from name."""
    nome_lower = nome.lower()
    categories = [
        ("chinelo", "Chinelo"), ("sandália", "Sandália"), ("sandalia", "Sandália"),
        ("tênis", "Tênis"), ("tenis", "Tênis"), ("bota", "Bota"), ("coturno", "Bota"),
        ("papete", "Papete"), ("babuche", "Babuche"), ("tamanco", "Tamanco"),
        ("sapatilha", "Sapatilha"), ("rasteira", "Rasteira"), ("mocassim", "Mocassim"),
        ("sapatênis", "Sapatênis"), ("sapatenis", "Sapatênis"),
        ("meia", "Meia"), ("bolsa", "Bolsa"), ("mochila", "Mochila"),
        ("carteira", "Carteira"), ("slime", "Brinquedo"), ("brinquedo", "Brinquedo"),
    ]
    for keyword, tipo in categories:
        if keyword in nome_lower:
            return tipo
    return "Calçado"


def detect_gender(nome):
    """Detect gender from product name."""
    nome_lower = nome.lower()
    if any(w in nome_lower for w in ["feminino", "feminina", "fem ", "mulher"]):
        return "Feminino"
    if any(w in nome_lower for w in ["masculino", "masculina", "masc "]):
        return "Masculino"
    if any(w in nome_lower for w in ["baby", "bebê", "bebe"]):
        return "Baby"
    if any(w in nome_lower for w in ["infantil", "kids", "mini", "molekinha", "molekinho"]):
        return "Infantil"
    return "Unissex"


def main():
    print("=" * 60)
    print("Gerador de CSV via API Magazord")
    print("=" * 60)

    # Step 1: Fetch all derivations
    print("\n[1/4] Buscando derivações...")
    derivacoes = fetch_all_derivacoes()
    print(f"  Total: {len(derivacoes)} derivações ativas")

    # Step 2: Fetch stock
    print("\n[2/4] Buscando estoque...")
    estoque = fetch_all_estoque()
    print(f"  Total: {len(estoque)} registros de estoque")

    # Step 3: Fetch prices
    print("\n[3/4] Buscando preços...")
    precos = fetch_all_precos()
    print(f"  Total: {len(precos)} registros de preço")

    # Step 4: Group by product+color (agrupador)
    print("\n[4/4] Agrupando e gerando CSV...")
    grupos = {}
    for d in derivacoes:
        agrup = d.get("agrupador") or d["codigo"]
        codigo_pai = agrup.split("-")[0] if "-" in agrup else agrup

        if agrup not in grupos:
            nome_raw = d.get("nome") or d.get("nomeCompleto") or agrup
            nome_completo = d.get("nomeCompleto", nome_raw)
            nome_produto = nome_completo.split(" - ")[0] if " - " in nome_completo else nome_completo
            slug = make_slug(nome_raw)

            # Extract color from derivacoes
            cor = ""
            for deriv in d.get("derivacoes", []):
                if deriv.get("derivacao") == 1:  # derivacao 1 = Cor
                    cor = deriv.get("valor", "")

            grupos[agrup] = {
                "nome": nome_produto.strip(),
                "codigo_pai": codigo_pai,
                "cor": cor,
                "tamanhos": [],
                "tamanhos_estoque": [],
                "link": f"{SITE_BASE}/{slug}",
                "ean": d.get("ean", ""),
                "tipo_registro": d.get("tipoRegistro", ""),
            }

        # Extract size
        for deriv in d.get("derivacoes", []):
            if deriv.get("derivacao") == 2:  # derivacao 2 = Tamanho
                tam = deriv.get("valor", "")
                if tam:
                    grupos[agrup]["tamanhos"].append(tam)
                    # Check stock for this specific derivation
                    qty = estoque.get(d["codigo"], {}).get("quantidade", 0)
                    if qty > 0:
                        grupos[agrup]["tamanhos_estoque"].append(f"{tam} ({qty}un)")

    # Fetch product details for unique product codes
    codigos_pai = list(set(g["codigo_pai"] for g in grupos.values()))
    print(f"  Buscando detalhes de {len(codigos_pai)} produtos...")
    detalhes_cache = {}

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {executor.submit(fetch_product_details, cod): cod for cod in codigos_pai}
        done = 0
        for future in as_completed(futures):
            cod = futures[future]
            detalhes_cache[cod] = future.result()
            done += 1
            if done % 50 == 0:
                print(f"    {done}/{len(codigos_pai)} detalhes...")

    # Build CSV rows
    rows = []
    for agrup, g in grupos.items():
        det = detalhes_cache.get(g["codigo_pai"], {})
        preco_info = precos.get(g.get("ean", ""), {})
        # Try to find price by any derivation code
        if not preco_info:
            for d in derivacoes:
                if (d.get("agrupador") or d["codigo"]) == agrup:
                    preco_info = precos.get(d["codigo"], {})
                    if preco_info:
                        break

        nome = g["nome"]
        rows.append({
            "nome": nome,
            "cor": g["cor"],
            "codigo": g["codigo_pai"],
            "tipo_produto": detect_category(nome, ""),
            "genero": detect_gender(nome),
            "preco": preco_info.get("preco_venda", ""),
            "preco_antigo": preco_info.get("preco_antigo", ""),
            "desconto": preco_info.get("desconto", ""),
            "tamanhos_disponiveis": " | ".join(g["tamanhos"]),
            "tamanhos_com_estoque": " | ".join(g["tamanhos_estoque"]),
            "em_estoque": "true" if g["tamanhos_estoque"] else "false",
            "descricao": det.get("descricao", ""),
            "complemento": det.get("complemento", ""),
            "link": g["link"],
        })

    # Fill empty fields (GoHighLevel rejects empty required fields)
    for row in rows:
        if not (row["descricao"] or "").strip():
            row["descricao"] = row["nome"] + " - " + row["tipo_produto"] + " " + row["genero"]
        if not (row["complemento"] or "").strip():
            row["complemento"] = row["tipo_produto"]
        if not (row["cor"] or "").strip():
            row["cor"] = "Padrao"
        if not (row["preco"] or "").strip():
            row["preco"] = "0"
        if not (row["preco_antigo"] or "").strip():
            row["preco_antigo"] = "0"
        if not (row["desconto"] or "").strip():
            row["desconto"] = "0"
        if not (row["tamanhos_disponiveis"] or "").strip():
            row["tamanhos_disponiveis"] = "Consultar"
        if not (row["tamanhos_com_estoque"] or "").strip():
            row["tamanhos_com_estoque"] = "Sem estoque no momento"

    # Remove products without price AND stock (inactive/discontinued)
    rows = [r for r in rows if r["preco"] != "0" or r["em_estoque"] == "true"]

    # Sort and write CSV
    rows.sort(key=lambda x: (x["tipo_produto"], x["nome"]))

    fieldnames = [
        "nome", "cor", "codigo", "tipo_produto", "genero",
        "preco", "preco_antigo", "desconto",
        "tamanhos_disponiveis", "tamanhos_com_estoque", "em_estoque",
        "descricao", "complemento", "link",
    ]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=",", quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)

    # Stats
    em_estoque = sum(1 for r in rows if r["em_estoque"] == "true")
    com_preco = sum(1 for r in rows if r["preco"])
    com_desc = sum(1 for r in rows if r["descricao"])
    com_link = sum(1 for r in rows if r["link"])

    print(f"\n{'=' * 60}")
    print(f"CSV gerado: {OUTPUT_CSV}")
    print(f"  Total de produtos (agrupados por cor): {len(rows)}")
    print(f"  Em estoque: {em_estoque}")
    print(f"  Com preço: {com_preco}")
    print(f"  Com descrição: {com_desc}")
    print(f"  Com link: {com_link}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
