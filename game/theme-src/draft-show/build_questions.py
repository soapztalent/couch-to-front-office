#!/usr/bin/env python3
"""Compile questions.dsl -> draft-questions.js (window.CTFO_DRAFT_QUESTIONS). Usage: build_questions.py DSL OUT.js"""
import json, re, sys
TRAITS = {'amb','loy','pat','col','cmp','fam','con','coa'}
CTX = {'rebuild','contend','thin','deep','chl','ncaa','euro','young','older','top','late'}
TYPES = {'++':('strong',1.4), '+':('moderate',0.7), '?':('risky',0.0), '-':('negative',-1.3)}
ELIG = {'league':{'CHL','NCAA','NCAA_BOUND','EURO'}, 'role':{'rebuild','contend','retool'}, 'pos':{'F','D','G'}, 'age':{'young','older'}}
W = re.compile(r'^([a-z]+)([+-](?:\d+\.?\d*|\.\d+))$')

def weights(s, allowed, where):
    out = {}
    for tok in s.split():
        m = W.match(tok)
        if not m or m.group(1) not in allowed:
            raise SystemExit('bad weight %r in %s' % (tok, where))
        out[m.group(1)] = round(float(m.group(2)), 2)
    return out

def parse(path):
    qs, cat, cur = [], None, None
    counts = {}
    def close():
        if cur is None: return
        if len(cur['answers']) != 4 or [a['type'] for a in cur['answers']] != ['strong','moderate','risky','negative']:
            raise SystemExit('question needs ++ + ? - answers in order: %s' % cur['q'])
        if cur['by'] == 'gm' and not cur.get('reply'):
            raise SystemExit('GM question without reply: %s' % cur['q'])
        qs.append(cur)
    for ln, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.rstrip('\n').strip()
        if not line or line.startswith('# '): continue
        if line.startswith('## '):
            close(); cur = None; cat = line[3:].strip(); continue
        tag, _, rest = line.partition(' ')
        rest = rest.strip()
        if tag in ('P','G'):
            close()
            counts[cat] = counts.get(cat, 0) + 1
            cur = {'id': '%s-%02d' % (cat, counts[cat]), 'by': 'player' if tag == 'P' else 'gm', 'cat': cat, 'q': rest, 'elig': {}, 'answers': []}
        elif tag == 'R': cur['reply'] = rest
        elif tag == '@':
            for part in rest.split():
                k, _, v = part.partition('=')
                vals = v.split(',')
                if k not in ELIG or not set(vals) <= ELIG[k]: raise SystemExit('bad elig line %d: %s' % (ln, part))
                cur['elig'][k] = vals
        elif tag in TYPES:
            bits = [b.strip() for b in rest.split('|')]
            if len(bits) < 2 or not bits[0]: raise SystemExit('bad answer line %d' % ln)
            t, base = TYPES[tag]
            cur['answers'].append({'type': t, 'base': base, 'text': bits[0],
                'traits': weights(bits[1], TRAITS, 'line %d' % ln),
                'ctx': weights(bits[2], CTX, 'line %d' % ln) if len(bits) > 2 else {}})
        else:
            raise SystemExit('unknown line %d: %s' % (ln, line))
    close()
    return qs

def main():
    qs = parse(sys.argv[1])
    texts = [q['q'].lower() for q in qs]
    if len(set(texts)) != len(texts): raise SystemExit('duplicate question text')
    if len({q['id'] for q in qs}) != len(qs): raise SystemExit('duplicate id')
    out = ['/* Couch To Front Office - draft-stage conversation pool (generated from theme-src/questions.dsl by build_questions.py).',
           '   %d questions: %d player-asks-GM, %d GM-asks-player. Each has exactly 4 answers:' % (len(qs), sum(q['by']=='player' for q in qs), sum(q['by']=='gm' for q in qs)),
           '   strong (+1.4), moderate (+0.7), risky (0, personality-dependent), negative (-1.3) base swing, plus',
           '   per-trait weights (scaled by (trait-50)/50) and context weights (rebuild/contend/thin/deep/chl/ncaa/euro/young/older/top/late). */',
           'window.CTFO_DRAFT_QUESTIONS=[']
    for i, q in enumerate(qs):
        out.append(json.dumps(q, ensure_ascii=False, separators=(',', ':')) + (',' if i < len(qs) - 1 else ''))
    out.append('];')
    open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print('wrote', sys.argv[2], len(qs), 'questions')
main()
