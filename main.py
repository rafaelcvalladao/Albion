import tkinter as tk
from tkinter import ttk
import requests
import sv_ttk
import json
import os

class AlbionWoodMaster:
    def __init__(self, root):
        self.root = root
        self.root.title("Albion Wood Master - Pro Dark v7.36")
        self.root.geometry("1200x900")
        self.config_file = "config_refino.json"
        self.loading = True
        
        # --- SIDEBAR ---
        self.sidebar = ttk.Frame(root, padding=(10, 10))
        self.sidebar.pack(side=tk.LEFT, fill=tk.Y)

        ttk.Label(self.sidebar, text="CONFIGURAÇÕES", font=("Segoe UI", 12, "bold")).pack(pady=15)
        ttk.Label(self.sidebar, text="Taxa do NPC (Prata):").pack(anchor="w")
        self.taxa_var = tk.StringVar()
        self.taxa_var.trace_add("write", lambda *args: self.auto_save_callback())
        ttk.Entry(self.sidebar, textvariable=self.taxa_var).pack(fill=tk.X, pady=5)

        ttk.Label(self.sidebar, text="NÍVEIS DE ESPEC:", font=("Segoe UI", 10, "bold")).pack(pady=15)
        self.spec_vars = {}
        t_list = [("Bétula (T4)", "t4"), ("Cedro (T5)", "t5"), ("Carvalho (T6)", "t6"), ("Ferro (T7)", "t7"), ("Abrunheiro (T8)", "t8")]
        for text, key in t_list:
            ttk.Label(self.sidebar, text=f"{text}:").pack(anchor="w")
            v = tk.StringVar()
            v.trace_add("write", lambda *args: self.auto_save_callback())
            ttk.Entry(self.sidebar, textvariable=v).pack(fill=tk.X, pady=2)
            self.spec_vars[key] = v

        ttk.Label(self.sidebar, text="ESTRATÉGIA:", font=("Segoe UI", 10, "bold")).pack(pady=15)
        self.buy_order_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(self.sidebar, text="COMPRAR VIA BUY ORDER", variable=self.buy_order_var, command=self.processar).pack(anchor="w", pady=5)
        self.foco_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(self.sidebar, text="USAR FOCO", variable=self.foco_var, command=self.processar).pack(anchor="w", pady=5)
        self.bonus_city_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(self.sidebar, text="BÔNUS FORT STERLING", variable=self.bonus_city_var, command=self.processar).pack(anchor="w", pady=5)

        self.tier_var = tk.StringVar(value="T6")
        ttk.Combobox(self.sidebar, textvariable=self.tier_var, values=["T4", "T5", "T6", "T7", "T8"], state="readonly").pack(fill=tk.X, pady=15)
        self.root.bind_all("<<ComboboxSelected>>", lambda e: self.processar())

        ttk.Button(self.sidebar, text="REFRESH PREÇOS", command=self.processar, style="Accent.TButton").pack(fill=tk.X, pady=10)
        ttk.Button(self.sidebar, text="HORÁRIOS (UTC)", command=self.abrir_janela_horarios).pack(fill=tk.X, pady=5)
        ttk.Button(self.sidebar, text="ESTRATÉGIA COMPLETA", command=self.abrir_janela_estrategia).pack(fill=tk.X, pady=5)

        # --- ÁREA DE RESULTADOS ---
        self.main_area = ttk.Frame(root, padding=(10, 10))
        self.main_area.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        self.result = tk.Text(self.main_area, font=("Consolas", 10), bg="#1c1c1c", fg="#ffffff", padx=10, pady=10, borderwidth=0)
        self.result.pack(fill=tk.BOTH, expand=True)
        self.result.tag_config("lucro", foreground="#2ecc71")
        self.result.tag_config("header", foreground="#3498db", font=("Consolas", 10, "bold"))
        self.result.tag_config("foco", foreground="#9b59b6")

        sv_ttk.set_theme("dark")
        self.carregar_dados()
        self.loading = False

    def auto_save_callback(self):
        if not self.loading: self.salvar_dados()

    def obter_volume(self, item_ids):
        try:
            url = f"https://www.albion-online-data.com/api/v2/stats/history/{','.join(item_ids)}?locations=Lymhurst,FortSterling&timescale=24"
            hist = requests.get(url).json()
            vol_map = {}
            for entry in hist:
                cid, it = entry['location'], entry['item_id']
                total_vol = sum(d['item_count'] for d in entry['data']) if entry.get('data') else 0
                vol_map[(cid, it)] = total_vol
            return vol_map
        except: return {}

    def abrir_janela_estrategia(self):
        janela = tk.Toplevel(self.root); janela.title("Análise Estratégica - Top 7 com Volume"); janela.geometry("1100x950"); janela.configure(bg="#1c1c1c")
        txt = tk.Text(janela, font=("Consolas", 10), bg="#1c1c1c", fg="#ffffff", padx=20, pady=20, borderwidth=0)
        txt.pack(fill=tk.BOTH, expand=True)
        txt.tag_config("tit", foreground="#3498db", font=("Consolas", 11, "bold"))
        txt.tag_config("pos", foreground="#2ecc71"); txt.tag_config("neg", foreground="#e74c3c")
        
        all_ids, plank_ids = [], []
        niveis = ["", "_LEVEL1@1", "_LEVEL2@2", "_LEVEL3@3", "_LEVEL4@4"]
        for t in ["T4", "T5", "T6", "T7", "T8"]:
            t_ant = f"T{int(t[1])-1}" if int(t[1]) > 4 else "T3"
            for n in niveis:
                all_ids.extend([f"{t}_WOOD{n}", f"{t}_PLANKS{n}", f"{t_ant}_PLANKS" if t_ant == "T3" else f"{t_ant}_PLANKS{n}"])
                plank_ids.append(f"{t}_PLANKS{n}")
        
        try:
            res = requests.get(f"https://www.albion-online-data.com/api/v2/stats/prices/{','.join(list(set(all_ids)))}?locations=Lymhurst,FortSterling").json()
            vol_data = self.obter_volume(list(set(plank_ids)))
            dc, dv = {}, {}
            for p in res:
                c, it, val = p['city'], p['item_id'], (p['buy_price_max'] if self.buy_order_var.get() else p['sell_price_min'])
                if val > 0: dc[(c, it)] = val
                if p['sell_price_min'] > 0: dv[(c, it)] = p['sell_price_min']

            gb_foco, gb_fama, fs_foco, fs_fama = [], [], [], []
            spec_total = sum([int(self.spec_vars[k].get() or 0)*30 for k in self.spec_vars])
            taxa_u = float(self.taxa_var.get().strip() or 800)

            for t in ["T4", "T5", "T6", "T7", "T8"]:
                t_ant = f"T{int(t[1])-1}" if int(t[1]) > 4 else "T3"
                for idx_n, n in enumerate(niveis):
                    enc = n.split("@")[0].replace("_LEVEL", ".") if n else ".0"
                    qt, fat = self.obter_parametros_tabela(t, enc); tx_f = (taxa_u / 100) * fat
                    i_t, i_p, i_a = f"{t}_WOOD{n}", f"{t}_PLANKS{n}", (f"{t_ant}_PLANKS" if t_ant == "T3" else f"{t_ant}_PLANKS{n}")

                    fs_t, fs_a, fs_p = dc.get(("Fort Sterling", i_t), 0), dc.get(("Fort Sterling", i_a), 0), dv.get(("Fort Sterling", i_p), 0)
                    ly_t, ly_a, ly_p = dc.get(("Lymhurst", i_t), 0), dc.get(("Lymhurst", i_a), 0), dv.get(("Lymhurst", i_p), 0)
                    v_fs, v_ly = vol_data.get(("Fort Sterling", i_p), 0), vol_data.get(("Lymhurst", i_p), 0)

                    rrr_foco, rrr_fama = self.calcular_rrr_manual(True, self.bonus_city_var.get()), self.calcular_rrr_manual(False, self.bonus_city_var.get())
                    f_base = {"T4":41,"T5":103,"T6":257,"T7":643,"T8":1607}.get(t,250)
                    f_real = (f_base * [1, 1.5, 2.5, 5, 10][idx_n]) * (0.5 ** (spec_total / 10000))

                    # Lógica Global: Volume da cidade com maior preço de venda
                    best_p = max(fs_p, ly_p)
                    v_gb = v_fs if fs_p >= ly_p else v_ly
                    b_t, b_a = min(fs_t or 9e9, ly_t or 9e9), min(fs_a or 9e9, ly_a or 9e9)

                    if best_p > 0 and b_t < 9e8:
                        gb_foco.append((f"{t}{enc}", (best_p - (((b_t * qt) + b_a) * (1 - rrr_foco) + tx_f)) / f_real, v_gb))
                        gb_fama.append((f"{t}{enc}", best_p - (((b_t * qt) + b_a) * (1 - rrr_fama) + tx_f), v_gb))

                    # Lógica FS Local
                    if all([fs_t, fs_a, fs_p]):
                        fs_foco.append((f"{t}{enc}", (fs_p - (((fs_t * qt) + fs_a) * (1 - rrr_foco) + tx_f)) / f_real, v_fs))
                        fs_fama.append((f"{t}{enc}", fs_p - (((fs_t * qt) + fs_a) * (1 - rrr_fama) + tx_f), v_fs))

            def exibir(titulo, lista, prata=False):
                txt.insert(tk.END, f"\n{titulo}\n", "tit")
                txt.insert(tk.END, f"{'Item':<10} | {'Lucro':<14} | {'Volume (24h)'}\n")
                txt.insert(tk.END, "-"*45 + "\n")
                lista.sort(key=lambda x: x[1], reverse=True)
                for i, (item, val, vol) in enumerate(lista[:7]):
                    v_str = f"{val:,.0f}" if prata else f"{val:.2f}"
                    txt.insert(tk.END, f"{item:<10} | {v_str:>14} | {vol:>12,d}\n", "pos" if val > 0 else "neg")

            exibir("--- GLOBAL: LUCRO COM FOCO (PRATA/FOCO) ---", gb_foco)
            exibir("--- GLOBAL: GIRO DE FAMA (LUCRO UNID.) ---", gb_fama, True)
            exibir("--- FS LOCAL: LUCRO COM FOCO (PRATA/FOCO) ---", fs_foco)
            exibir("--- FS LOCAL: GIRO DE FAMA (LUCRO UNID.) ---", fs_fama, True)

        except Exception as e: txt.insert(tk.END, f"Erro: {e}")

    def abrir_janela_horarios(self):
        janela = tk.Toplevel(self.root); janela.title("Relógio de Atualização"); janela.geometry("850x650"); janela.configure(bg="#1c1c1c")
        txt = tk.Text(janela, font=("Consolas", 10), bg="#1c1c1c", fg="#cccccc", padx=20, pady=20, borderwidth=0)
        txt.pack(fill=tk.BOTH, expand=True); txt.tag_config("cid", foreground="#3498db", font=("Consolas", 10, "bold"))
        t_sel = self.tier_var.get(); t_num = int(t_sel[1]); t_ant = f"T{t_num-1}" if t_num > 4 else "T3"
        niveis = ["", "_LEVEL1@1", "_LEVEL2@2", "_LEVEL3@3", "_LEVEL4@4"]
        ids = []
        for n in niveis: ids.extend([f"{t_sel}_WOOD{n}", f"{t_sel}_PLANKS{n}", f"{t_ant}_PLANKS" if t_ant == "T3" else f"{t_ant}_PLANKS{n}"])
        try:
            res = requests.get(f"https://www.albion-online-data.com/api/v2/stats/prices/{','.join(ids)}?locations=Lymhurst,FortSterling").json()
            check_dict = {(p['city'], p['item_id']): p['sell_price_min_date'] for p in res if p['sell_price_min_date'] and "0001" not in p['sell_price_min_date']}
            def fmt(c, it): f = check_dict.get((c, it)); return f"{f[8:10]}/{f[5:7]} {f[11:16]}" if f else "---"
            txt.insert(tk.END, f">>> ÚLTIMAS ATUALIZAÇÕES (UTC) - {t_sel}\n\n", "cid")
            for n in niveis:
                idx = niveis.index(n); enc = n.split("@")[0].replace("_LEVEL", ".") if n else ".0"
                txt.insert(tk.END, f"--- MADEIRA {t_sel}{enc} ---\n", "cid")
                txt.insert(tk.END, f"{'Cidade':<15} | {'Tronco':<12} | {'Tábua Ant.':<12} | {'Tábua (Sell)'}\n")
                i_t, i_p, i_a = ids[idx*3], ids[idx*3+1], ids[idx*3+2]
                for cid in ["Lymhurst", "Fort Sterling"]: txt.insert(tk.END, f"{cid:<15} | {fmt(cid, i_t):<12} | {fmt(cid, i_a):<12} | {fmt(cid, i_p)}\n")
                txt.insert(tk.END, "-"*70 + "\n\n")
        except: txt.insert(tk.END, "Erro ao buscar horários.")

    def salvar_dados(self):
        dados = {k: v.get() for k, v in self.spec_vars.items()}; dados["taxa_npc"] = self.taxa_var.get()
        with open(self.config_file, "w") as f: json.dump(dados, f)

    def carregar_dados(self):
        if os.path.exists(self.config_file):
            with open(self.config_file, "r") as f:
                dados = json.load(f); [self.spec_vars[k].set(dados.get(k, "0")) for k in self.spec_vars]
                self.taxa_var.set(dados.get("taxa_npc", "800"))
        else: [v.set("0") for v in self.spec_vars.values()]; self.taxa_var.set("800")

    def calcular_rrr_manual(self, f, b): return (0.539 if f else 0.367) if b else (0.435 if f else 0.152)
    def calcular_rrr(self): return self.calcular_rrr_manual(self.foco_var.get(), self.bonus_city_var.get())
    def obter_parametros_tabela(self, t, e):
        dT = {"T4": (2, 0.9375), "T5": (3, 1.875), "T6": (4, 3.75), "T7": (5, 7.5), "T8": (5, 15)}
        q, n = dT.get(t, (2, 1)); m = {".0": 1, ".1": 2, ".2": 4, ".3": 8, ".4": 16}.get(e, 1)
        return q, n * m

    def processar(self):
        t_sel = self.tier_var.get(); t_num = int(t_sel[1]); t_ant = f"T{t_num-1}" if t_num > 4 else "T3"; rrr = self.calcular_rrr()
        try: tx_u = float(self.taxa_var.get().strip() or 800)
        except: tx_u = 800.0
        use_buy = self.buy_order_var.get(); self.result.delete("1.0", tk.END)
        self.result.insert(tk.END, f">>> ESTRATÉGIA: {'BUY ORDER' if use_buy else 'SELL ORDER'} | RRR: {rrr*100:.1f}%\n\n", "header")
        niveis = ["", "_LEVEL1@1", "_LEVEL2@2", "_LEVEL3@3", "_LEVEL4@4"]
        ids, plank_ids = [], []
        for n in niveis: 
            ids.extend([f"{t_sel}_WOOD{n}", f"{t_sel}_PLANKS{n}", f"{t_ant}_PLANKS" if t_ant == "T3" else f"{t_ant}_PLANKS{n}"])
            plank_ids.append(f"{t_sel}_PLANKS{n}")
        try:
            res = requests.get(f"https://www.albion-online-data.com/api/v2/stats/prices/{','.join(ids)}?locations=Lymhurst,FortSterling").json()
            vol_map = self.obter_volume(plank_ids)
            dc = {(p['city'], p['item_id']): (p['buy_price_max'] if use_buy else p['sell_price_min']) for p in res if (p['buy_price_max'] if use_buy else p['sell_price_min']) > 0}
            dv = {(p['city'], p['item_id']): p['sell_price_min'] for p in res if p['sell_price_min'] > 0}
            for n in niveis:
                idx = niveis.index(n); enc = n.split("@")[0].replace("_LEVEL", ".") if n else ".0"
                qt, fat = self.obter_parametros_tabela(t_sel, enc); tx_f = (tx_u / 100) * fat
                i_t, i_p, i_a = ids[idx*3], ids[idx*3+1], ids[idx*3+2]
                self.result.insert(tk.END, f"--- {t_sel}{enc} (Vol: {vol_map.get(('Fort Sterling', i_p), 0):,d} un/24h FS) ---\n", "header")
                
                # CORREÇÃO APLICADA AQUI: Ordem t (tronco), a (tábua antiga), p (tábua final)
                lh, ft = [dc.get(("Lymhurst", i_t), 0), dc.get(("Lymhurst", i_a), 0), dv.get(("Lymhurst", i_p), 0)], [dc.get(("Fort Sterling", i_t), 0), dc.get(("Fort Sterling", i_a), 0), dv.get(("Fort Sterling", i_p), 0)]
                
                col_ant = "Tábua T3" if t_ant == "T3" else "Tábua Ant."
                self.result.insert(tk.END, f"{'Cidade':<15} | {'Tronco':<10} | {col_ant:<10} | {'Tábua':<10} | {'Lucro'}\n")
                def get_v(t, a, v): return v - (((t * qt) + a) * (1 - rrr) + tx_f) if all([t, a, v]) else -9e8
                l_lh, l_ft = get_v(*lh), get_v(*ft)
                m_t = min(lh[0], ft[0]) if lh[0] and ft[0] else (lh[0] or ft[0])
                m_a = min(lh[1], ft[1]) if lh[1] and ft[1] else (lh[1] or ft[1])
                m_v = max(lh[2], ft[2]) if lh[2] and ft[2] else (lh[2] or ft[2])
                
                l_ot = get_v(m_t, m_a, m_v); melhor = max(l_lh, l_ft, l_ot)
                self.result.insert(tk.END, f"Lymhurst        | {lh[0]:>10,d} | {lh[1]:>10,d} | {lh[2]:>10,d} | {l_lh:>10,.0f}\n")
                self.result.insert(tk.END, f"Fort Sterling   | {ft[0]:>10,d} | {ft[1]:>10,d} | {ft[2]:>10,d} | {l_ft:>10,.0f}\n")
                tag_ot = "lucro" if l_ot > 0 else "header"
                self.result.insert(tk.END, f"OTIMIZADO (COMPRA/VENDA): {l_ot:>36,.0f} prata\n", tag_ot)
                if l_ot > -8e8 and self.foco_var.get():
                    sp_t = sum([int(self.spec_vars[k].get() or 0)*30 for k in self.spec_vars])
                    f_g = {"T4":41,"T5":103,"T6":257,"T7":643,"T8":1607}.get(t_sel,250)*(0.5**(sp_t / 10000))
                    self.result.insert(tk.END, f" > FOCO: {f_g:.1f} un | {l_ot/f_g:.2f} Prata/Foco\n", "foco")
                self.result.insert(tk.END, "-"*75 + "\n\n")
        except Exception as e: self.result.insert(tk.END, f"Erro: {e}")

if __name__ == "__main__":
    root = tk.Tk(); app = AlbionWoodMaster(root); root.mainloop()