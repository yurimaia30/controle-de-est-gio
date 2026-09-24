import json, pathlib, openpyxl
root=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((root/'private/importacao-planilhas.json').read_text(encoding='utf8'))
w=openpyxl.load_workbook(root/'Planilha de Estágio - Radiologia.xlsx',data_only=True)
fields={f['id']:f for f in data['fields']}
assert len(data['students'])==89
assert 'MEDSAUDE' not in fields
for name in ['IOT','SESI']:
    expected=[]
    for row in w[name].values:
        if row[0]!=name or not isinstance(row[2],(int,float)):continue
        for i in range(5):
            v=str(row[i+3]).strip() if row[i+3] is not None else ''
            expected.append((int(row[2]),i+1,v))
    actual=[(s['vaga'],s['dias'][0],'X' if s['bloqueada'] else s['aluno']) for s in fields[name]['slots']]
    assert actual==expected
assert [s['vaga'] for s in fields['UPA-G1']['slots'] if not s['aluno']]==[3,4]
assert fields['UPA-G4']['slots'][0]['inicio']=='2026-08-30'
assert fields['UPA-G4']['slots'][2]['aluno']=='Frank Bruno'
assert fields['UPA-MANHA']['slots']==[]
assert fields['UPA-MANHA']['preceptor']=='Artur Nogueira'
for f in fields.values():
    for s in f['slots']:
        if f['id'].startswith('UPA-G') and s['aluno'] not in ['Brenda Kely','Antonio Vieira','Jackson - RAD19','Ellen Eduarda']:
            assert s['inicio']==s['fim']==''
assert len(data['waitlist'])==13
print('89 alunos, vagas célula a célula IOT/SESI, UPA, datas ausentes e lista de espera: OK')
