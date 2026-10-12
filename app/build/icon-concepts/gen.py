# -*- coding: utf-8 -*-
import math
C=512
def pt(r,deg): a=math.radians(deg); return (C+r*math.cos(a), C+r*math.sin(a))
def arc(r,a0,a1):
    # clockwise on screen from a0 to a1 (degrees increasing)
    x0,y0=pt(r,a0); x1,y1=pt(r,a1); large=1 if (a1-a0)%360>180 else 0
    return f"M{x0:.1f},{y0:.1f} A{r},{r} 0 {large} 1 {x1:.1f},{y1:.1f}"
def head(r,a,size,color):
    # arrowhead at angle a, pointing clockwise (direction of increasing angle)
    x,y=pt(r,a); t=math.radians(a); tx,ty=-math.sin(t),math.cos(t); nx,ny=math.cos(t),math.sin(t)
    tip=(x+tx*size*1.05,y+ty*size*1.05); b1=(x+nx*size*0.95-tx*size*0.15,y+ny*size*0.95-ty*size*0.15); b2=(x-nx*size*0.95-tx*size*0.15,y-ny*size*0.95-ty*size*0.15)
    return f'<path d="M{tip[0]:.1f},{tip[1]:.1f} L{b1[0]:.1f},{b1[1]:.1f} L{b2[0]:.1f},{b2[1]:.1f} Z" fill="{color}" stroke="{color}" stroke-width="10" stroke-linejoin="round"/>'
BG='''<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4B86"/><stop offset="1" stop-color="#F0044F"/></linearGradient>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect x="100" y="100" width="824" height="824" rx="185" fill="url(#g)"/><rect x="100" y="100" width="824" height="824" rx="185" fill="url(#s)"/>'''
def svg(body): return f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">{BG}{body}</svg>'
W="#FFFFFF"
# A: C 루프 — Core의 C가 스스로 도는 고리(자동 업데이트), 가운데 코어
a=f'<path d="{arc(232,48,318)}" fill="none" stroke="{W}" stroke-width="92" stroke-linecap="round"/>'+head(232,318,92,W)+f'<circle cx="{C}" cy="{C}" r="74" fill="{W}"/>'
# B: 파일 + 자동 — 접힌 모서리 문서 안에 순환 화살표
doc='<path d="M348,262 h236 l108,108 v352 a40,40 0 0 1 -40,40 h-304 a40,40 0 0 1 -40,-40 v-420 a40,40 0 0 1 40,-40 z" fill="#fff"/><path d="M584,262 v68 a40,40 0 0 0 40,40 h68 z" fill="#FFC2D6"/>'
cy=566
def arcc(r,a0,a1,cx,cy):
    x0=cx+r*math.cos(math.radians(a0));y0=cy+r*math.sin(math.radians(a0));x1=cx+r*math.cos(math.radians(a1));y1=cy+r*math.sin(math.radians(a1))
    return f"M{x0:.1f},{y0:.1f} A{r},{r} 0 0 1 {x1:.1f},{y1:.1f}"
def headc(r,a,size,cx,cy,color):
    t=math.radians(a);x=cx+r*math.cos(t);y=cy+r*math.sin(t);tx,ty=-math.sin(t),math.cos(t);nx,ny=math.cos(t),math.sin(t)
    tip=(x+tx*size,y+ty*size);b1=(x+nx*size*.9,y+ny*size*.9);b2=(x-nx*size*.9,y-ny*size*.9)
    return f'<path d="M{tip[0]:.1f},{tip[1]:.1f} L{b1[0]:.1f},{b1[1]:.1f} L{b2[0]:.1f},{b2[1]:.1f} Z" fill="{color}"/>'
P="#F0044F"
b=doc+f'<path d="{arcc(104,200,330,512,cy)}" fill="none" stroke="{P}" stroke-width="40" stroke-linecap="round"/>'+headc(104,330,40,512,cy,P)+f'<path d="{arcc(104,20,150,512,cy)}" fill="none" stroke="{P}" stroke-width="40" stroke-linecap="round"/>'+headc(104,150,40,512,cy,P)
# C: 코어 결 — 겹겹이 쌓인 Core(나이테)가 바깥부터 갱신되는 고리
c=(f'<path d="{arc(258,-60,250)}" fill="none" stroke="{W}" stroke-width="58" stroke-linecap="round"/>'+head(258,250,62,W)+
   f'<circle cx="{C}" cy="{C}" r="168" fill="none" stroke="{W}" stroke-opacity=".55" stroke-width="44"/>'+
   f'<circle cx="{C}" cy="{C}" r="90" fill="none" stroke="{W}" stroke-opacity=".3" stroke-width="36"/>'+f'<circle cx="{C}" cy="{C}" r="40" fill="{W}"/>')
for n,body in (('A',a),('B',b),('C',c)): open(f'icon-{n}.svg','w').write(svg(body))
