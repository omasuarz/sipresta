"""Genera docs/index.html (versión GitHub Pages + Firebase) a partir del index.html de Claude.
Uso: python3 build.py ruta/al/index-claude.html
"""
import sys, os, re
FB = '10.14.1'
src = sys.argv[1] if len(sys.argv) > 1 else 'src/index-claude.html'
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (old[:70], c)
    s = s.replace(old, new)

s = re.sub(r'<title>[^<]*</title>', '<title>SIPRESTA · Taller de Herramientas</title>', s, count=1)
s = s.replace('<meta name="claude:viewport-fit-sides" content="cover">',
              '<meta name="theme-color" content="#141301"><meta name="apple-mobile-web-app-capable" content="yes">'
              '<meta name="apple-mobile-web-app-title" content="SIPRESTA"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="icon" href="icono.svg" type="image/svg+xml">')

# Pantalla de ingreso
rep("""if(S.status==='sin-sesion')return `<div class="note warn"><b>Inicia sesión para usar el sistema.</b><br>Necesitas ingresar con tu cuenta institucional para reservar herramientas.</div>`;""",
    """if(S.status==='sin-sesion')return `<div class="note"><b>Inicia sesión para usar el sistema.</b><br>Entra con tu cuenta @utalca.cl, @alumnos.utalca.cl o Gmail.<div class="actions" style="justify-content:flex-start;margin-top:14px"><button class="btn primary" type="button" data-login>Entrar con Google</button></div></div>`;""")
# Botón para cerrar sesión (escritorio); en celular se cierra tocando el avatar
rep("""${ok?`<div class="who">""", """${ok?'<button class="side-btn salir" type="button" data-logout>Cerrar sesión</button>':''}${ok?`<div class="who">""")
j = s.index('</style>', s.index('Pulido visual'))
s = s[:j] + '@media(max-width:860px){.side-btn.salir{display:none}}\n.who .av{cursor:pointer}\n' + s[j:]

# Firebase + adaptador antes del código de la app
cfg = open(os.path.join(here, 'firebase-config.js'), encoding='utf8').read()
ad = open(os.path.join(here, 'src', 'adaptador.js'), encoding='utf8').read()
inj = (''.join(f'<script src="https://www.gstatic.com/firebasejs/{FB}/firebase-{m}-compat.js"></script>\n' for m in ('app', 'auth', 'firestore'))
       + '<script>\n' + cfg + '\n</script>\n<script>\n' + ad + '\n</script>\n')
i = s.index("<script>\n(function(){\n'use strict';")
s = s[:i] + inj + s[i:]

os.makedirs(os.path.join(here, 'docs'), exist_ok=True)
open(os.path.join(here, 'docs', 'index.html'), 'w', encoding='utf8').write(s)
print('docs/index.html', len(s))
