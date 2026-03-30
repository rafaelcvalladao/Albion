import tkinter as tk
from tkinter import ttk, messagebox
import requests
import sv_ttk
import threading
from datetime import datetime, timedelta
import re

# Mapa de pesos dos itens (em kg) para calcular custo de teleporte
ITEM_WEIGHTS = {
    # Armas (tipicamente 1-2 kg)
    "_MAIN_": 1.5, "_2H_": 2.0, "_RANGED_": 1.5,
    # Armaduras (tipicamente 2-3 kg)
    "_BODY_": 2.5, "_HEAD_": 1.0, "_SHOES_": 0.5, "_CAPE": 0.3, "_GLOVES_": 0.5,
    # Escudos e off-hands
    "_OFF_": 1.5, "_SHIELD_": 2.0,
    # Montarias (6-8 kg cada)
    "_MOUNT_": 7.0,
    # Consumíveis (0.1-0.5 kg)
    "_POTION_": 0.1, "_MEAL_": 0.2, "_DRINK_": 0.1, "_SPICE_": 0.05, "_HERB_": 0.05,
    # Artefatos e acessórios
    "_RUNE": 0.3, "_SOUL": 0.3, "_RELIC": 0.3, "_BAG": 1.0, "_AMULET_": 0.2, "_RING_": 0.1,
    # Materiais
    "_ORE_": 0.05, "_WOOD_": 0.05, "_LEATHER_": 0.05, "_CLOTH_": 0.02, "_PLANKS": 0.1,
}

# Taxa de teleporte: 0.0075 prata por kg (aproximado)
TELEPORT_RATE_PER_KG = 0.0075
# Taxa de venda: 6.5% (0.935 mantido, pode ser ajustado)
SALE_TAX_RATE = 0.935

# Categorias expandidas com muitos mais itens
CATEGORIAS = {
    "Todos": [],  # Será preenchido dinamicamente
    "Armas": [
        "_MAIN_BLOODLETTER", "_MAIN_DAGGER", "_MAIN_SWORD", "_MAIN_MACE", "_MAIN_AXE", "_MAIN_HAMMER",
        "_MAIN_SPEAR", "_MAIN_STAFF", "_MAIN_CURSEDSTAFF", "_MAIN_NATURESTAFF", "_MAIN_FIRESTAFF", "_MAIN_FROSTSTAFF", "_MAIN_HOLYSTAFF",
        "_2H_BOW", "_2H_CROSSBOW", "_2H_CARVINGSWORD", "_2H_GREATAXE", "_2H_MAUL", "_2H_HALBERD", "_2H_PIKE", "_2H_DUALAXE_KEEPER", "_2H_DUALAXE", "_2H_MACE",
        "_RANGED_BOW", "_RANGED_CROSSBOW",
    ],
    "Armaduras": [
        "_BODY_CLERICROBE", "_BODY_ASSASSINJACKET", "_BODY_SOLDIERARMOR", "_BODY_MAGE", "_BODY_CLOTHROBES", "_BODY_LEATHERARMOR", "_BODY_PLATEARMOR",
        "_BODY_CLOTH", "_BODY_LEATHER", "_BODY_PLATE",
    ],
    "Elmos": [
        "_HEAD_HUNTER", "_HEAD_CLERICHOOD", "_HEAD_SOLDIERHELMET", "_HEAD_MAGE",
        "_HEAD_CLOTH", "_HEAD_LEATHER", "_HEAD_PLATE",
    ],
    "Botas": [
        "_SHOES_SOLDIERBOOTS", "_SHOES_ASSASSINSHOES", "_SHOES_CLERICSHOES",
        "_SHOES_CLOTH", "_SHOES_LEATHER", "_SHOES_PLATE",
    ],
    "Capas": [
        "_CAPE", "_CAPEITEM_FW_LYMHURST", "_CAPEITEM_FW_FORTSTERLING", "_CAPEITEM_FW_MARTLOCK", 
        "_CAPEITEM_FW_THETFORD", "_CAPEITEM_FW_BRIDGEWATCH",
    ],
    "Escudos": [
        "_SHIELD_TOWER", "_SHIELD_KITE", "_SHIELD_ROUND", "_OFF_DAGGER", "_OFF_SHIELD",
    ],
    "Luvas": [
        "_GLOVES_CLOTH", "_GLOVES_LEATHER", "_GLOVES_PLATE",
    ],
    "Montarias": [
        "_MOUNT_HORSE", "_MOUNT_OX", "_MOUNT_SWIFTCLAW", "_MOUNT_STAG", "_MOUNT_RAM", "_MOUNT_MOOSE",
    ],
    "Consumíveis": [
        "_POTION_HEAL", "_POTION_ENERGY", "_POTION_POWER", "_POTION_FORCE",
        "_MEAL_STEAK", "_MEAL_OMELETTE", "_MEAL_STEW", "_MEAL_PIE", "_MEAL_BREAD", "_MEAL_CHEESE",
        "_DRINK_WATER", "_DRINK_BEER",
        "_SPICE_SUGAR", "_SPICE_SALT", "_SPICE_HERB",
    ],
    "Artefatos": [
        "_RUNE_AIR", "_RUNE_FIRE", "_RUNE_FROST", "_RUNE_HOLY", "_RUNE_NATURE", "_RUNE_ARCANE",
        "_SOUL_", "_RELIC_",
        "_AMULET_", "_RING_",
    ],
    "Bolsas": [
        "_BAG_SMALL", "_BAG_MEDIUM", "_BAG_LARGE",
        "_BAG",
    ],
    "Materiais": [
        "_ORE_COPPER", "_ORE_TIN", "_ORE_IRON", "_ORE_STEEL", "_ORE_TITANIUM",
        "_WOOD_BIRCH", "_WOOD_OAK", "_WOOD_ASHWOOD", "_WOOD_IRONWOOD", "_WOOD_EBONWOOD",
        "_LEATHER_THIN", "_LEATHER_THICK",
        "_CLOTH_LINEN", "_CLOTH_CLOTH", "_CLOTH_SILK",
        "_PLANKS", "_METAL", "_HIDE", "_FABRIC",
    ],
    "Ferragens": [
        "_NAILS", "_SCREWS", "_BOLTS", "_HINGES",
    ],
    "Outros": [
        "_BOOK_", "_SCROLL_", "_CRYSTAL_",
    ]
}

CIDADES_SEGURAS = ["Bridgewatch", "FortSterling", "Lymhurst", "Martlock", "Thetford", "Brecilien"]

# Mapear quality para nome em português
QUALITY_NAMES = {1: "Normal", 2: "Bom", 3: "Excepcional", 4: "Excelente"}

class AlbionMarketAnalyzer:
    def __init__(self, root):
        self.root = root
        self.root.title("Albion Market Analyzer - Arbitragem Segura v2")
        self.root.geometry("1600x900")
        
        self.setup_ui()
        sv_ttk.set_theme("dark")

    def setup_ui(self):
        # --- PAINEL DE FILTROS (TOP) ---
        filtros_frame = ttk.Frame(self.root, padding=15)
        filtros_frame.pack(fill=tk.X, side=tk.TOP)

        # Linha 1: Categoria e Status
        linha1 = ttk.Frame(filtros_frame)
        linha1.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(linha1, text="Categoria:").pack(side=tk.LEFT, padx=(0, 5))
        self.cat_var = tk.StringVar(value="Armas")
        self.cb_categoria = ttk.Combobox(linha1, textvariable=self.cat_var, values=list(CATEGORIAS.keys()), state="readonly", width=18)
        self.cb_categoria.pack(side=tk.LEFT, padx=(0, 20))

        ttk.Label(linha1, text="Estado (Quality):").pack(side=tk.LEFT, padx=(0, 5))
        self.quality_var = tk.StringVar(value="1")
        self.cb_quality = ttk.Combobox(linha1, textvariable=self.quality_var, values=["1", "2", "3", "4"], state="readonly", width=8)
        self.cb_quality.pack(side=tk.LEFT, padx=(0, 20))

        ttk.Label(linha1, text="Dados no máx:", font=("", 9)).pack(side=tk.LEFT, padx=(0, 5))
        self.idade_var = tk.StringVar(value="6")
        self.cb_idade = ttk.Combobox(linha1, textvariable=self.idade_var, values=["2", "6", "12", "24", "48"], state="readonly", width=5)
        self.cb_idade.pack(side=tk.LEFT, padx=(0, 2))
        ttk.Label(linha1, text="h").pack(side=tk.LEFT, padx=(0, 20))

        self.lbl_status = ttk.Label(linha1, text="Pronto", foreground="gray", font=("", 9))
        self.lbl_status.pack(side=tk.LEFT, padx=10)

        # Linha 2: Checkboxes e Configurações
        linha2 = ttk.Frame(filtros_frame)
        linha2.pack(fill=tk.X, pady=(0, 10))

        self.buy_order_var = tk.BooleanVar(value=False)
        self.cb_buy_order = ttk.Checkbutton(linha2, text="Considerar Buy Order (compra)", variable=self.buy_order_var)
        self.cb_buy_order.pack(side=tk.LEFT, padx=(0, 20))

        ttk.Label(linha2, text="Taxa Venda (%):", font=("", 9)).pack(side=tk.LEFT, padx=(0, 5))
        self.taxa_venda_var = tk.StringVar(value="6.5")
        self.entry_taxa_venda = ttk.Entry(linha2, textvariable=self.taxa_venda_var, width=6)
        self.entry_taxa_venda.pack(side=tk.LEFT, padx=(0, 20))

        ttk.Label(linha2, text="Teleporte (prata/kg):", font=("", 9)).pack(side=tk.LEFT, padx=(0, 5))
        self.teleport_var = tk.StringVar(value=f"{TELEPORT_RATE_PER_KG:.4f}")
        self.entry_teleport = ttk.Entry(linha2, textvariable=self.teleport_var, width=8)
        self.entry_teleport.pack(side=tk.LEFT, padx=(0, 20))

        self.btn_buscar = ttk.Button(linha2, text="BUSCAR OPORTUNIDADES", style="Accent.TButton", command=self.iniciar_busca)
        self.btn_buscar.pack(side=tk.RIGHT)

        # --- TABELA DE RESULTADOS ---
        frame_tabela = ttk.Frame(self.root, padding=15)
        frame_tabela.pack(fill=tk.BOTH, expand=True)

        colunas = ("item", "tier", "encanto", "estado", "origem", "destino", "compra", "venda", "custo_teleporte", "lucro", "media_7d", "atualizacao")
        self.tree = ttk.Treeview(frame_tabela, columns=colunas, show="headings", height=20)
        
        self.tree.heading("item", text="Item")
        self.tree.heading("tier", text="T")
        self.tree.heading("encanto", text="E")
        self.tree.heading("estado", text="Est")
        self.tree.heading("origem", text="Comprar em")
        self.tree.heading("destino", text="Vender em")
        self.tree.heading("compra", text="P. Compra")
        self.tree.heading("venda", text="P. Venda")
        self.tree.heading("custo_teleporte", text="Teleporte")
        self.tree.heading("lucro", text="Lucro Líquido")
        self.tree.heading("media_7d", text="Média 7d")
        self.tree.heading("atualizacao", text="Atualização")

        self.tree.column("item", width=180)
        self.tree.column("tier", width=25, anchor="center")
        self.tree.column("encanto", width=25, anchor="center")
        self.tree.column("estado", width=30, anchor="center")
        self.tree.column("origem", width=100, anchor="center")
        self.tree.column("destino", width=100, anchor="center")
        self.tree.column("compra", width=100, anchor="e")
        self.tree.column("venda", width=100, anchor="e")
        self.tree.column("custo_teleporte", width=90, anchor="e")
        self.tree.column("lucro", width=120, anchor="e")
        self.tree.column("media_7d", width=100, anchor="center")
        self.tree.column("atualizacao", width=130, anchor="center")

        # Scrollbars
        vsb = ttk.Scrollbar(frame_tabela, orient=tk.VERTICAL, command=self.tree.yview)
        hsb = ttk.Scrollbar(frame_tabela, orient=tk.HORIZONTAL, command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        
        self.tree.grid(row=0, column=0, sticky="nsew")
        vsb.grid(row=0, column=1, sticky="ns")
        hsb.grid(row=1, column=0, sticky="ew")
        frame_tabela.grid_rowconfigure(0, weight=1)
        frame_tabela.grid_columnconfigure(0, weight=1)


    def extrair_info_item(self, item_id):
        """Extrai tier, encantamento e nome base do nome do item"""
        # Tier é sempre os primeiros 2 caracteres (T4, T5, etc)
        tier = item_id[:2] if item_id.startswith('T') else "?"
        
        # Encantamento: último elemento após @ ou no final do ID
        encanto = "0"
        if '@' in item_id:
            parts = item_id.split('@')
            encanto = parts[-1] if parts[-1].isdigit() else "0"
        
        # Nome base: remover tier e encantamento
        nome_base = item_id[2:]  # Remove T4, T5, etc
        if '@' in nome_base:
            nome_base = nome_base[:nome_base.rfind('@')]
        
        nome_limpo = nome_base.replace("_", " ").strip()
        
        return tier, encanto, nome_limpo

    def obter_peso_item(self, item_id):
        """Retorna o peso estimado do item para cálculo de teleporte"""
        for prefixo, peso in ITEM_WEIGHTS.items():
            if prefixo in item_id.upper():
                return peso
        return 1.0  # Peso padrão

    def gerar_lista_itens(self):
        """Gera a lista de itens baseado na categoria selecionada"""
        categoria = self.cat_var.get()
        
        if categoria == "Todos":
            # Juntar todos os itens de todas as categorias
            bases = []
            for cat, itens in CATEGORIAS.items():
                if cat != "Todos":
                    bases.extend(itens)
            bases = list(set(bases))  # Remover duplicatas
        else:
            bases = CATEGORIAS.get(categoria, [])
        
        tiers = ["T4", "T5", "T6", "T7", "T8"]
        lista_itens = []
        
        for t in tiers:
            for b in bases:
                lista_itens.append(f"{t}{b}")
                # Também adicionar versões com encantamentos (@1, @2, @3, @4)
                for enc in ["@1", "@2", "@3", "@4"]:
                    lista_itens.append(f"{t}{b}{enc}")
        
        return lista_itens

    def obter_media_vendas_7d(self, item_id, cidade):
        """Busca o histórico e calcula a média diária dos últimos 7 dias na cidade destino"""
        try:
            url = f"https://www.albion-online-data.com/api/v2/stats/history/{item_id}?locations={cidade}&time-scale=24"
            resposta = requests.get(url, timeout=10).json()
            
            if not resposta or not resposta[0].get('data'):
                return 0
                
            dados_historico = resposta[0]['data']
            limite_7d = datetime.utcnow() - timedelta(days=7)
            
            total_vendido = 0
            dias_contados = 0
            
            for registro in dados_historico:
                data_registro = datetime.strptime(registro['timestamp'], "%Y-%m-%dT%H:%M:%S")
                if data_registro >= limite_7d:
                    total_vendido += registro['item_count']
                    dias_contados += 1
            
            if dias_contados == 0:
                return 0
                
            return int(total_vendido / 7) # Média dividida estritamente por 7 dias
        except:
            return 0

    def iniciar_busca(self):
        """Inicia a busca de oportunidades em thread separada"""
        self.btn_buscar.config(state="disabled")
        self.tree.delete(*self.tree.get_children())
        self.lbl_status.config(text="Buscando preços...")
        
        threading.Thread(target=self.processar_dados, daemon=True).start()

    def processar_dados(self):
        """Processa dados da API e calcula lucro com todas as taxas"""
        itens = self.gerar_lista_itens()
        cidades_str = ",".join(CIDADES_SEGURAS)
        max_idade_horas = int(self.idade_var.get())
        agora = datetime.utcnow()
        usar_buy_order = self.buy_order_var.get()
        quality = self.quality_var.get()
        
        try:
            taxa_venda = float(self.taxa_venda_var.get()) / 100
            teleport_rate = float(self.teleport_var.get())
        except ValueError:
            self.root.after(0, lambda: messagebox.showerror("Erro", "Taxa de venda ou teleporte inválida"))
            self.root.after(0, lambda: self.btn_buscar.config(state="normal"))
            return
        
        # Quebrar em chunks para evitar erro 414 URI Too Long
        chunk_size = 100
        chunks = [itens[i:i + chunk_size] for i in range(0, len(itens), chunk_size)]
        
        oportunidades_brutas = []

        try:
            for chunk in chunks:
                ids_str = ",".join(chunk)
                url_precos = f"https://www.albion-online-data.com/api/v2/stats/prices/{ids_str}?locations={cidades_str}&qualities={quality}"
                resposta_precos = requests.get(url_precos, timeout=15).json()
                
                mapa_precos = {}
                for p in resposta_precos:
                    data_str = p['sell_price_min_date']
                    if not data_str or data_str.startswith("0001"):
                        continue
                        
                    data_api = datetime.strptime(data_str, "%Y-%m-%dT%H:%M:%S")
                    idade_horas = (agora - data_api).total_seconds() / 3600
                    
                    if idade_horas <= max_idade_horas and p['sell_price_min'] > 0:
                        it = p['item_id']
                        if it not in mapa_precos:
                            mapa_precos[it] = {}
                        
                        cidade = p['city']
                        # Usar buy_price_max se checkbox estiver marcado, senão usar sell_price_min
                        preco_compra = p['buy_price_max'] if usar_buy_order and p['buy_price_max'] > 0 else p['sell_price_min']
                        preco_venda = p['sell_price_min']  # Sempre garantir o menor da sell order
                        
                        mapa_precos[it][cidade] = {
                            'preco_compra': preco_compra,
                            'preco_venda': preco_venda,
                            'data_str': data_str.replace("T", " ")[:16],
                            'tem_buy_order': usar_buy_order and p['buy_price_max'] > 0
                        }

                for item_id, cidades_info in mapa_precos.items():
                    peso = self.obter_peso_item(item_id)
                    custo_teleporte = peso * teleport_rate
                    tier, encanto, nome_base = self.extrair_info_item(item_id)
                    
                    cidades_lista = list(cidades_info.items())
                    
                    for i, (cidade_ori, info_ori) in enumerate(cidades_lista):
                        for j, (cidade_dest, info_dest) in enumerate(cidades_lista):
                            if i == j:
                                continue
                            
                            preco_compra = info_ori['preco_compra']
                            preco_venda = info_dest['preco_venda']
                            
                            # Calcular lucro:
                            # Receita: preco_venda * (1 - taxa_venda)
                            # Custos: preco_compra + custo_teleporte
                            # Lucro = Receita - Custos
                            receita = preco_venda * taxa_venda
                            custos = preco_compra + custo_teleporte
                            lucro_liquido = receita - custos
                            
                            if lucro_liquido > 0:
                                oportunidades_brutas.append({
                                    'id': item_id,
                                    'nome_base': nome_base,
                                    'tier': tier,
                                    'encanto': encanto,
                                    'estado': QUALITY_NAMES.get(int(quality), "?"),
                                    'origem': cidade_ori,
                                    'destino': cidade_dest,
                                    'compra': preco_compra,
                                    'venda': preco_venda,
                                    'custo_teleporte': custo_teleporte,
                                    'lucro': lucro_liquido,
                                    'atualizacao_dest': info_dest['data_str']
                                })

            # Ordena pelo maior lucro
            oportunidades_brutas.sort(key=lambda x: x['lucro'], reverse=True)
            top_oportunidades = oportunidades_brutas[:50]  # Pega os 50 melhores
            
            resultados_finais = []
            self.lbl_status.config(text="Calculando médias de vendas de 7 dias...")
            
            for op in top_oportunidades:
                media_vendas = self.obter_media_vendas_7d(op['id'], op['destino'])
                
                if media_vendas > 0:
                    op['media_7d'] = media_vendas
                    resultados_finais.append(op)
                    
                if len(resultados_finais) >= 20:
                    break
            
            self.root.after(0, self.atualizar_tabela, resultados_finais[:20])

        except Exception as e:
            self.root.after(0, lambda: messagebox.showerror("Erro na API", f"Falha na conexão: {e}"))
            self.root.after(0, lambda: self.lbl_status.config(text="Erro na busca."))
            self.root.after(0, lambda: self.btn_buscar.config(state="normal"))

    def atualizar_tabela(self, resultados):
        """Atualiza a tabela com os resultados encontrados"""
        for op in resultados:
            self.tree.insert("", tk.END, values=(
                op['nome_base'],
                op['tier'],
                op['encanto'],
                op['estado'],
                op['origem'],
                op['destino'],
                f"{op['compra']:,}",
                f"{op['venda']:,}",
                f"{op['custo_teleporte']:.0f}",
                f"{op['lucro']:,.0f}",
                f"{op['media_7d']} / dia",
                op['atualizacao_dest']
            ))
            
        self.lbl_status.config(text="Busca concluída.")
        self.btn_buscar.config(state="normal")

if __name__ == "__main__":
    root = tk.Tk()
    app = AlbionMarketAnalyzer(root)
    root.mainloop()