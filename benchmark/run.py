"""Запускать из корня после установки зависимостей и сборки проектов."""
import argparse
import csv
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description='Сравнение ORM и прямого SQL в четырёх языках.', add_help=False)
options = parser.add_argument_group('Параметры')
options.add_argument('-h', '--help', action='help', help='Показать справку и выйти.')
options.add_argument('--node', default=shutil.which('node'), metavar='ПУТЬ', help='Путь к Node.js для проекта TypeScript.')
options.add_argument('--go-binary', default=str(root/'benchmark'/'go-demo'), metavar='ПУТЬ', help='Путь к собранной программе Go.')
args = parser.parse_args()
os.chdir(root)
subprocess.run([sys.executable, 'benchmark/seed.py'], check=True)
env = dict(os.environ, ORM_DB_PATH=str(root/'benchmark'/'library.db'))
commands = {
 'python':[sys.executable, 'projects/python/main.py','bench'],
 'csharp':['dotnet', 'projects/csharp/bin/Release/net10.0/LibraryDemo.dll','bench'],
 'go':[args.go_binary, 'bench'],
 'typescript':[args.node, 'projects/typescript/dist/main.js','bench'],
}
for name,command in commands.items():
 result = subprocess.run(command, env=env, text=True, capture_output=True, check=True)
 data = json.loads(result.stdout)
 (root/'benchmark'/f'{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
 print(f'{name}: готово')
portable_commands = {name: list(command) for name, command in commands.items()}
portable_commands['python'][0] = '.venv/Scripts/python.exe' if os.name == 'nt' else '.venv/bin/python'
portable_commands['typescript'][0] = 'node'
portable_commands['go'][0] = 'benchmark/go-demo.exe' if os.name == 'nt' else 'benchmark/go-demo'
hardware = dict(architecture=platform.machine())
if platform.system() == 'Darwin':
 try:
  hardware['chip'] = subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string'], text=True).strip()
 except (OSError, subprocess.CalledProcessError):
  pass
metadata = dict(utc=datetime.now(timezone.utc).isoformat(), system=platform.platform(),
 python=sys.version, node=subprocess.check_output([args.node,'--version'],text=True).strip(),
 dotnet=subprocess.check_output(['dotnet','--version'],text=True).strip(),
 go=subprocess.check_output(['go','version'],text=True).strip(),
 commands=portable_commands, command_paths='portable', hardware=hardware)
(root/'benchmark'/'environment.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
rows=[]
for name in commands:
 data=json.loads((root/'benchmark'/f'{name}.json').read_text())
 for result in data['results']:
  rows.append(dict(language=data['language'],orm=data['orm'],sqlite=data['sqlite'],
      **{k:v for k,v in result.items() if k!='samples_us'}))
with open(root/'benchmark'/'summary.csv','w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');writer.writeheader();writer.writerows(rows)
print('Результаты: benchmark/summary.csv')
