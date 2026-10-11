"""Erzklinge – Build

  python build.py            baut die Website nach dist/ (GitHub Pages, PWA, Three.js lokal)
  python build.py artifact   baut zusätzlich out/erzklinge-artifact.html (Einzeldatei, Three.js vom CDN)

Keine Abhängigkeiten außer Python 3.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
OUT = ROOT / 'out'
JS_FILES = ['data.js', 'gfx-core.js', 'gfx-scenes.js', 'game.js']
CDN_THREE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/'
IMPORTS = """import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
"""
PWA_HEAD = """<meta name="description" content="Idle-Rollenspiel mit Zwergenheld, Arena, Trainingshof und Kontor.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32.png">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Erzklinge">
<style>html { padding-top: env(safe-area-inset-top, 0px); }</style>"""
MANIFEST = {
    'name': 'Erzklinge',
    'short_name': 'Erzklinge',
    'description': 'Idle-Rollenspiel mit Zwergenheld, Arena, Trainingshof und Kontor.',
    'lang': 'de',
    'start_url': './',
    'scope': './',
    'display': 'standalone',
    'orientation': 'any',
    'background_color': '#10151c',
    'theme_color': '#11161d',
    'icons': [
        {'src': 'assets/icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'assets/icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'assets/icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}


def read(name):
    return (SRC / name).read_text(encoding='utf-8')


def bundle(three_base, pwa):
    head = read('head.html').replace('__THREE_BASE__', three_base).replace('<!--PWA_HEAD-->', PWA_HEAD if pwa else '')
    js = IMPORTS + ''.join(read(f) + '\n' for f in JS_FILES)
    if pwa:
        js += read('pwa.js')
    return head + '\n' + read('body.html') + '\n<script type="module">\n' + js + '</script>\n'


def build_pages():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    page = bundle('./vendor/three/', pwa=True)
    doc = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n')
    # alles bis einschließlich </style> gehört in den <head>
    cut = page.index('</style>', page.index('<style>\n/* Layout')) + len('</style>')
    doc += page[:cut] + '\n</head>\n<body>\n' + page[cut:] + '</body>\n</html>\n'
    (DIST / 'index.html').write_text(doc, encoding='utf-8')
    shutil.copytree(ROOT / 'vendor', DIST / 'vendor')
    shutil.copytree(ROOT / 'assets', DIST / 'assets')
    (DIST / 'manifest.webmanifest').write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=2), encoding='utf-8')
    core = ['./', './index.html', './manifest.webmanifest'] + sorted(
        './' + p.relative_to(DIST).as_posix() for p in DIST.rglob('*')
        if p.is_file() and p.suffix in ('.js', '.png') and 'LICENSE' not in p.name)
    h = hashlib.sha256()
    for c in core[1:]:
        h.update((DIST / c[2:]).read_bytes())
    version = h.hexdigest()[:12]
    sw = read('sw.js').replace('__VERSION__', version).replace('__CORE__', json.dumps(core, indent=2))
    (DIST / 'sw.js').write_text(sw, encoding='utf-8')
    print(f'dist/ gebaut · Version {version} · {len(core)} Dateien im Offline-Cache')


def build_artifact():
    OUT.mkdir(exist_ok=True)
    (OUT / 'erzklinge-artifact.html').write_text(bundle(CDN_THREE, pwa=False), encoding='utf-8')
    print('out/erzklinge-artifact.html gebaut')


if __name__ == '__main__':
    build_pages()
    if 'artifact' in sys.argv[1:]:
        build_artifact()
