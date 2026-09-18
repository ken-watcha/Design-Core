"""깊은 복제 작업 N의 use_figma 코드를 만든다.
사용법: python3 scripts/figma-write/compose-clone-job.py <prefix> <N> <tokens.json> [x y]
  - <prefix>-jobs.json (build-clone-spec.py 출력)의 N번째 작업을 clone-lib.js와 합쳐 <prefix>-job<N>.js로 쓴다
  - tokens.json: {"ROOT": "<부모 섹션 id>", "T1": "...", ...} — 이전 작업 결과의 created를 여기에 합쳐 둔다
  - x y: ROOT 작업일 때 루트 프레임을 놓을 좌표
"""
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
prefix, n, tokf = sys.argv[1], int(sys.argv[2]), sys.argv[3]
pos = {'x': float(sys.argv[4]), 'y': float(sys.argv[5])} if len(sys.argv) > 5 else None
jobs = json.load(open(f'{prefix}-jobs.json')); tokens = json.load(open(tokf))
job = jobs[n]
need = sorted({x['_p'] for x in job['nodes']})
lib = open(f'{HERE}/clone-lib.js').read()
spec = json.dumps(job['nodes'], ensure_ascii=False, separators=(',', ':'))
pre = os.environ.get('PRE', '')
pend_f = os.environ.get('PENDING', f'{prefix}-pending.json')
pend = json.load(open(pend_f)) if os.path.exists(pend_f) else []
code = lib + f"\n{pre}\nconst TOKENS = {json.dumps(tokens)};\nconst PENDING = {json.dumps(pend, ensure_ascii=False, separators=(',', ':'))};\nconst SPEC = {spec};\nreturn await run(SPEC, TOKENS, {json.dumps(pos)}, PENDING);\n"
out = f'{prefix}-job{n}.js'; open(out, 'w').write(code)
print(out, len(code), 'chars', 'parents', need, 'nodes', len(job['nodes']))
