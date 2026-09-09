#!/usr/bin/env python3
"""Figma MCP get_metadata 결과(XML, 또는 파일로 저장된 tool-result JSON)를 깊이 제한으로 추려 출력.

큰 페이지의 get_metadata 결과는 파일로 저장되는데(13만 자 이상), 이 스크립트로
섹션·프레임 골격만 뽑아 보면 된다.

사용법:
  python3 scripts/outline.py <파일> [최대깊이=3] [--types=canvas,section,frame]
예:
  python3 scripts/outline.py /path/to/get_metadata-result.txt 3 --types=canvas,section,frame
"""
import sys, json, re, xml.etree.ElementTree as ET

if len(sys.argv) < 2:
    print(__doc__); sys.exit(1)
path = sys.argv[1]
maxd = 3
types = None
for a in sys.argv[2:]:
    if a.isdigit(): maxd = int(a)
    elif a.startswith('--types='): types = set(a[8:].split(','))
raw = open(path, encoding='utf-8').read()
if raw.lstrip().startswith('['):  # MCP tool-result JSON 배열
    raw = ''.join(x.get('text', '') for x in json.loads(raw))
m = re.search(r'<canvas.*</canvas>', raw, re.S)
root = ET.fromstring(m.group(0) if m else raw)

def walk(el, d=0):
    if d > maxd: return
    if types is None or el.tag in types or d == 0:
        a = el.attrib
        print('  ' * d + f"[{el.tag}] {a.get('id')} · {a.get('name')} · {a.get('width')}x{a.get('height')} @({a.get('x')},{a.get('y')})")
    for c in el: walk(c, d + 1)
walk(root)
