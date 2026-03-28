import tkinter as tk
from tkinter import ttk, messagebox
import requests
import sv_ttk
import threading
from datetime import datetime, timedelta

# Definição das categorias e bases de itens (T4 a T8 serão aplicados automaticamente)
CATEGORIAS = {
    "Armas": ["_MAIN_BLOODLETTER", "_2H_BOW", "_2H_CARVINGSWORD", "_MAIN_CURSEDSTAFF", "_2H_HALBERD", "_2H_DUALAXE_KEEPER", "_2H_MACE"],
    "Armaduras": ["_BODY_CLERICROBE", "_BODY_ASSASSINJACKET", "_BODY_SOLDIERARMOR", "_BODY_MAGE"],
    "Elmos": ["_HEAD_HUNTER", "_HEAD_CLERICHOOD", "_HEAD_SOLDIERHELMET", "_HEAD_MAGE"],
    "Botas": ["_SHOES_SOLDIERBOOTS", "_SHOES_ASSASSINSHOES", "_SHOES_CLERICSHOES"],
    "Capas": ["_CAPE", "_CAPEITEM_FW_LYMHURST", "_CAPEITEM_FW_FORTSTERLING", "_CAPEITEM_FW_MARTLOCK", "_CAPEITEM_FW_THETFORD", "_CAPEITEM_FW_BRIDGEWATCH"],
    "Montarias": ["_MOUNT_HORSE", "_MOUNT_OX", "_MOUNT_SWIFTCLAW", "_MOUNT_STAG"],
    "Consumíveis": ["_POTION_HEAL", "_POTION_ENERGY", "_MEAL_STEAK", "_MEAL_OMELETTE", "_MEAL_STEW", "_MEAL_PIE"],
    "Artefatos": ["_RUNE", "_SOUL", "_RELIC"],
    "Etc (Bolsas)": ["_BAG"]
}

CIDADES_SEGURAS = ["Bridgewatch", "FortSterling", "Lymhurst", "Martlock", "Thetford", "Brecilien"]

class AlbionMarketAnalyzer:
    def __init__(self, root):
        self.root = root
        self.root.title("Albion Market Analyzer - Arbitragem Segura")
        self.root.geometry("1400x800")
        
        self.setup_ui()
        sv_ttk.set_theme("dark")

    def setup_ui(self):
        # --- CABEÇALHO E FILTROS ---
        header = ttk.Frame(self.root, padding=20)
        header.pack(fill=tk.X)

        # Categoria
        ttk.Label(header, text="Categoria:").pack(side=tk.LEFT, padx=(0, 5))
        self.cat_var = tk.StringVar(value="Armas")
        self.cb_categoria = ttk.Combobox(header, textvariable=self.cat_var, values=list(CATEGORIAS.keys()), state="readonly", width=15)
        self.cb_categoria.pack(side=tk.LEFT, padx=(0, 20))

        # Idade Máxima dos Dados
        ttk.Label(header, text="Atualizado há no máx:").pack(side=tk.LEFT, padx=(0, 5))
        self.idade_var = tk.StringVar(value="6")
        self.cb_idade = ttk.Combobox(header, textvariable=self.idade_var, values=["2", "6", "12", "24", "48"], state="readonly", width=5)
        self.cb_idade.pack(side=tk.LEFT, padx=(0, 5))
        ttk.Label(header, text="horas").pack(side=tk.LEFT, padx=(0, 20))

        # Botão de Busca
        self.btn_buscar = ttk.Button(header, text="BUSCAR OPORTUNIDADES", style="Accent.TButton", command=self.iniciar_busca)
        self.btn_buscar.pack(side=tk.RIGHT)

        self.lbl_status = ttk.Label(header, text="", foreground="gray")
        self.lbl_status.pack(side=tk.RIGHT, padx=15)

        # --- TABELA DE RESULTADOS ---
        frame_tabela = ttk.Frame(self.root, padding=20)
        frame_tabela.pack(fill=tk.BOTH, expand=True)

        colunas = ("item", "origem", "destino", "compra", "venda", "lucro", "media_7d", "atualizacao")
        self.tree = ttk.Treeview(frame_tabela, columns=colunas, show="headings")
        
        self.tree.heading("item", text="Item")
        self.tree.heading("origem", text="Comprar em")
        self.tree.heading("destino", text="Vender em")
        self.tree.heading("compra", text="P. Compra")
        self.tree.heading("venda", text="P. Venda")
        self.tree.heading("lucro", text="Lucro (c/ Taxa)")
        self.tree.heading("media_7d", text="Média Vendas/Dia (7d)")
        self.tree.heading("atualizacao", text="Última Atualização")

        self.tree.column("item", width=250)
        self.tree.column("origem", width=100, anchor="center")
        self.tree.column("destino", width=100, anchor="center")
        self.tree.column("compra", width=100, anchor="e")
        self.tree.column("venda", width=100, anchor="e")
        self.tree.column("lucro", width=120, anchor="e")
        self.tree.column("media_7d", width=150, anchor="center")
        self.tree.column("atualizacao", width=150, anchor="center")

        self.tree.pack(fill=tk.BOTH, expand=True)

    def gerar_lista_itens(self):
        categoria = self.cat_var.get()
        bases = CATEGORIAS.get(categoria, [])
        tiers = ["T4", "T5", "T6", "T7", "T8"]
        
        lista_itens = []
        for t in tiers:
            for b in bases:
                lista_itens.append(f"{t}{b}")
                
        # Consumíveis T4-T8 funcionam, mas artefatos e montarias não tem T4 em alguns casos, 
        # a API apenas ignora IDs inválidos, então é seguro mandar a lista completa.
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
        self.btn_buscar.config(state="disabled")
        self.tree.delete(*self.tree.get_children())
        self.lbl_status.config(text="Buscando preços...")
        
        # Roda em thread separada para não travar a interface
        threading.Thread(target=self.processar_dados, daemon=True).start()

    def processar_dados(self):
        itens = self.gerar_lista_itens()
        cidades_str = ",".join(CIDADES_SEGURAS)
        max_idade_horas = int(self.idade_var.get())
        agora = datetime.utcnow()
        
        # Quebrar em chunks para evitar erro 414 URI Too Long
        chunk_size = 100
        chunks = [itens[i:i + chunk_size] for i in range(0, len(itens), chunk_size)]
        
        oportunidades_brutas = []

        try:
            for chunk in chunks:
                ids_str = ",".join(chunk)
                url_precos = f"https://www.albion-online-data.com/api/v2/stats/prices/{ids_str}?locations={cidades_str}&qualities=1"
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
                            mapa_precos[it] = []
                        mapa_precos[it].append({
                            'cidade': p['city'],
                            'preco': p['sell_price_min'],
                            'idade': idade_horas,
                            'data_str': data_str.replace("T", " ")[:16] # Formato YYYY-MM-DD HH:MM
                        })

                for item_id, ofertas in mapa_precos.items():
                    for ori in ofertas:
                        for dest in ofertas:
                            if ori['cidade'] == dest['cidade']:
                                continue
                                
                            lucro_bruto = dest['preco'] - ori['preco']
                            lucro_liquido = (dest['preco'] * 0.935) - ori['preco']
                            
                            if lucro_liquido > 0:
                                oportunidades_brutas.append({
                                    'id': item_id,
                                    'origem': ori['cidade'],
                                    'destino': dest['cidade'],
                                    'compra': ori['preco'],
                                    'venda': dest['preco'],
                                    'lucro': lucro_liquido,
                                    'atualizacao_dest': dest['data_str']
                                })

            # Ordena pelo maior lucro para consultar histórico apenas dos melhores
            oportunidades_brutas.sort(key=lambda x: x['lucro'], reverse=True)
            top_oportunidades = oportunidades_brutas[:30] # Pega os 30 melhores para verificar volume
            
            resultados_finais = []
            self.lbl_status.config(text="Calculando médias de vendas de 7 dias...")
            
            for op in top_oportunidades:
                media_vendas = self.obter_media_vendas_7d(op['id'], op['destino'])
                
                # Ignorar itens sem venda na última semana
                if media_vendas > 0:
                    op['media_7d'] = media_vendas
                    resultados_finais.append(op)
                    
                if len(resultados_finais) >= 15:
                    break
            
            # Atualizar a interface com os resultados
            self.root.after(0, self.atualizar_tabela, resultados_finais[:15])

        except Exception as e:
            self.root.after(0, lambda: messagebox.showerror("Erro na API", f"Falha na conexão: {e}"))
            self.root.after(0, lambda: self.lbl_status.config(text="Erro na busca."))
            self.root.after(0, lambda: self.btn_buscar.config(state="normal"))

    def atualizar_tabela(self, resultados):
        for op in resultados:
            nome_limpo = op['id'].replace("_", " ")
            self.tree.insert("", tk.END, values=(
                nome_limpo,
                op['origem'],
                op['destino'],
                f"{op['compra']:,}",
                f"{op['venda']:,}",
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