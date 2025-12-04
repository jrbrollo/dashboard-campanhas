import csv

file_path = r'c:\Users\User\Dashboard Campanhas\dashboard-online\Atualizada leads e vendas ate 04.12 v3.csv'

try:
    with open(file_path, 'r', encoding='latin-1') as f:
        # Force delimiter
        delimiter = ';'
        reader = csv.reader(f, delimiter=delimiter)
        header = next(reader)
        
        print(f"Delimiter used: {delimiter}")
        # header = next(reader)
        
        # print(f"Delimiter detected: {dialect.delimiter}")
        print("-" * 30)
        for i, col in enumerate(header):
            print(f"Index {i} (Column {chr(65+i) if i < 26 else '?' }): {col}")
            
except Exception as e:
    print(f"Error: {e}")
