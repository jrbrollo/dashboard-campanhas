import csv
import re
import pandas as pd

def get_column_value(row, names):
    for name in names:
        if name in row:
            return row[name]
    return ''

def parse_float_value(value):
    if not value or str(value).strip() == '' or ';' in str(value):
        return 0
    # Substituir R$ e espaços, depois ponto por vírgula para parseFloat (que espera ponto)
    cleaned_value = str(value).replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
    try:
        return float(cleaned_value)
    except ValueError:
        return 0

def analyze_adset_sales(file_path):
    adset_sales_data = {}
    all_leads = []

    try:
        # Tentativa de ler com diferentes encodings
        for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
            try:
                df = pd.read_csv(file_path, sep=';', encoding=encoding)
                # Remover colunas totalmente vazias
                df = df.dropna(axis=1, how='all')
                # Remover linhas totalmente vazias
                df = df.dropna(axis=0, how='all')
                # Converter para lista de dicionários para facilitar o acesso
                all_leads = df.to_dict(orient='records')
                print(f"CSV lido com sucesso usando encoding: {encoding}")
                break
            except UnicodeDecodeError:
                print(f"Erro de decodificação com {encoding}, tentando outro...")
                continue
        
        if not all_leads:
            print("Não foi possível ler o arquivo CSV com os encodings tentados.")
            return {}

    except Exception as e:
        print(f"Erro ao ler o arquivo CSV: {e}")
        return {}

    adset_col = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    sales_planejamento_col = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    sales_seguros_col = ['venda_seguros']
    sales_credito_col = ['venda_credito']

    # Coletar todos os adsets únicos
    adsets = sorted(list(set(get_column_value(lead, adset_col) for lead in all_leads if get_column_value(lead, adset_col))))

    for adset in adsets:
        leads_in_adset = [lead for lead in all_leads if get_column_value(lead, adset_col) == adset]
        total_leads = len(leads_in_adset)

        def get_sales_and_revenue(leads_list, sales_cols):
            count = 0
            revenue = 0
            for row in leads_list:
                val = parse_float_value(get_column_value(row, sales_cols))
                if val > 0:
                    count += 1
                    revenue += val
            return {'count': count, 'revenue': revenue}

        planejamento_data = get_sales_and_revenue(leads_in_adset, sales_planejamento_col)
        seguros_data = get_sales_and_revenue(leads_in_adset, sales_seguros_col)
        credito_data = get_sales_and_revenue(leads_in_adset, sales_credito_col)

        total_sales = planejamento_data['count'] + seguros_data['count'] + credito_data['count']
        total_revenue = planejamento_data['revenue'] + seguros_data['revenue'] + credito_data['revenue']
        avg_ticket = total_sales > 0 and total_revenue / total_sales or 0
        conversion_rate = total_leads > 0 and (total_sales / total_leads) * 100 or 0

        adset_sales_data[adset] = {
            'totalLeads': total_leads,
            'totalSales': total_sales,
            'totalRevenue': total_revenue,
            'avgTicket': avg_ticket,
            'conversionRate': conversion_rate,
            'salesPlanejamento': planejamento_data['count'],
            'revenuePlanejamento': planejamento_data['revenue'],
            'salesSeguros': seguros_data['count'],
            'revenueSeguros': seguros_data['revenue'],
            'salesCredito': credito_data['count'],
            'revenueCredito': credito_data['revenue'],
        }
    return adset_sales_data

file_path = 'Atualizada leads e vendas ate 17.09 v2.csv'
result = analyze_adset_sales(file_path)

for adset, data in result.items():
    print(f"\nConjunto: {adset}")
    print(f"  Leads: {data['totalLeads']}")
    print(f"  Vendas Totais: {data['totalSales']}")
    print(f"  Faturamento Total: R$ {data['totalRevenue']:.2f}")
    print(f"  Vendas Planejamento: {data['salesPlanejamento']} (R$ {data['revenuePlanejamento']:.2f})")
    print(f"  Vendas Seguros: {data['salesSeguros']} (R$ {data['revenueSeguros']:.2f})")
    print(f"  Vendas Crédito: {data['salesCredito']} (R$ {data['revenueCredito']:.2f})")
    print(f"  Taxa Conversão: {data['conversionRate']:.2f}%")
