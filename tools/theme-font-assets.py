"""Rebuild the licensed UI subsets and baked wordmarks. No production runtime dependency.

Use Python 3.13 with fonttools[woff]==4.60.1, brotli==1.1.0,
uharfbuzz==0.52.0 and pillow==11.3.0 in an ignored virtual environment.
Run from the repository root. Downloads are pinned and verified; measurements
and intermediate source fonts remain under ignored prototypes/.
"""
from __future__ import annotations

import gzip
import argparse
import hashlib
import io
import json
import math
import unicodedata
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

import brotli
import uharfbuzz as hb
from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import DecomposingRecordingPen, RecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
REVISION = '6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec'
CACHE = ROOT / 'prototypes/theme-font-sources'
EVIDENCE = ROOT / 'prototypes/theme-font-measurements'
ASSETS = ROOT / 'src/assets/fonts'
WORDMARKS = ROOT / 'src/lib/theme/wordmarks'
SOURCES = {
    'Baloo2': ('ToadokuPondUI', 'Baloo2[wght].ttf',
               'd47a6852548059b1db49a1319d06d499d546c3fa2237cf9eee9c43c8abb025c2',
               'ad09b05dc8bc678c9daf7c4c5f7ef1f55e5726127f4330b2e98e40b9dffcb860', {}),
    'Fraunces': ('ToadokuCauldronUI', 'Fraunces[SOFT,WONK,opsz,wght].ttf',
                 '177ff6c0f14e5550a3c624247cd1189611d4eb65d000b14944c63d967958abbb',
                 'bdf4c22802eaf804f998195871c6b8938aac2ac14b2d78a8bd66a6f1eced833b',
                 {'opsz': 9, 'SOFT': 50, 'WONK': 0}),
}
TITLE_SOURCES = {
    'pond': ('Chewy', '7cf75ea288f82fd20badea8ab4da7a656a96a7277c170811e813b3d3d6294147'),
    'cauldron': ('Creepster', '402aeb734586c74aecd3dbdc454589b1fb12e2e1c71f782fd019ae68066d9f44'),
}
TEXT = 'Toadoku'
REQUIRED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÄÖÜäöüẞßÑñÁÉÍÓÚáéíóúÜü¿¡€'
CHECK = False


def emit(path: Path, data: bytes) -> None:
    if CHECK:
        if not path.exists() or path.read_bytes() != data:
            raise ValueError(f'Generated asset differs: {path}')
    else:
        path.write_bytes(data)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sizes(data: bytes) -> dict:
    return {'raw': len(data), 'gzip': len(gzip.compress(data, compresslevel=9, mtime=0)),
            'brotli': len(brotli.compress(data, quality=11)), 'sha256': sha(data)}


def source(name: str, filename: str, expected: str) -> bytes:
    target = CACHE / f'{name}-{filename}'
    if not target.exists():
        url = f'https://raw.githubusercontent.com/google/fonts/{REVISION}/ofl/{name.lower()}/{quote(filename)}'
        target.write_bytes(urlopen(url, timeout=30).read())
    data = target.read_bytes()
    if sha(data) != expected:
        raise ValueError(f'Unexpected pinned source bytes: {target}')
    return data


def original_font(name: str, expected: str) -> Path:
    filenames = {'Chewy': 'apache/chewy/Chewy-Regular.ttf',
                 'Creepster': 'ofl/creepster/Creepster-Regular.ttf',
                 'Outfit': 'ofl/outfit/Outfit[wght].ttf'}
    revision = '50f8ff96f9de584858108a44a7b3dd4065dce11f' if name == 'Creepster' else REVISION
    target = CACHE / f'{name}-original.ttf'
    current = ASSETS / (f'{name}-Regular.ttf' if name != 'Outfit' else 'Outfit.ttf')
    if not target.exists():
        if current.exists():
            target.write_bytes(current.read_bytes())
        else:
            url = f'https://raw.githubusercontent.com/google/fonts/{revision}/{quote(filenames[name])}'
            target.write_bytes(urlopen(url, timeout=30).read())
    if sha(target.read_bytes()) != expected:
        raise ValueError(f'Unexpected original font bytes: {target}')
    return target


def woff2(font: TTFont) -> bytes:
    output = io.BytesIO()
    font.flavor = 'woff2'
    font.recalcTimestamp = False
    font.save(output)
    return output.getvalue()


def rename(font: TTFont, family: str) -> None:
    values = {1: family, 2: 'Regular', 3: f'Toadoku-2026-{family}', 4: family,
              6: family, 16: family, 17: 'Regular', 21: family, 22: 'Regular', 25: family}
    for name in font['name'].names:
        if name.nameID in values:
            font['name'].setName(values[name.nameID], name.nameID, name.platformID, name.platEncID, name.langID)


def ui_font(name: str, family: str, filename: str, expected: str, license_hash: str, fixed_axes: dict) -> dict:
    data = source(name, filename, expected)
    license_data = source(name, 'OFL.txt', license_hash)
    font = TTFont(io.BytesIO(data), recalcTimestamp=False)
    # The three supported alphabets fit Latin-1 plus capital sharp S. Preserve
    # combining marks/NFD, punctuation and every presently authored copy symbol.
    # Unsupported symbols retain normal CSS system-font fallback.
    ranges = [(0x20, 0xFF), (0x300, 0x36F), (0x2000, 0x206F)]
    copy = ''.join(path.read_text(encoding='utf8') for path in sorted((ROOT / 'src').rglob('*'))
                   if path.suffix in ['.ts', '.svelte'])
    requested = {value for low, high in ranges for value in range(low, high + 1)} | {0x1E9E, 0x20AC} | {ord(char) for char in copy}
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.layout_features += ['tnum', 'lnum', 'pnum', 'onum', 'zero']
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=requested)
    subsetter.subset(font)
    source_axes = {axis.axisTag: axis for axis in font['fvar'].axes}
    for tag, value in fixed_axes.items():
        if tag not in source_axes or not source_axes[tag].minValue <= value <= source_axes[tag].maxValue:
            raise ValueError(f'{name} invalid fixed axis: {tag}={value}')
    font = instantiateVariableFont(font, {'wght': (400, 700), **fixed_axes}, inplace=True)
    if [(axis.axisTag, axis.minValue, axis.maxValue) for axis in font['fvar'].axes] != [('wght', 400, 700)]:
        raise ValueError(f'{name} must expose only the reviewed 400-700 weight axis')
    rename(font, family)
    missing = sorted({character for character in REQUIRED + unicodedata.normalize('NFD', REQUIRED)
                      if ord(character) not in font.getBestCmap()})
    if missing:
        raise ValueError(f'{name} is missing required EN/DE/ES characters: {missing}')
    weight_outlines = []
    for weight in [400, 500, 600, 700]:
        glyphs = font.getGlyphSet(location={'wght': weight})
        pen = RecordingPen()
        glyphs[font.getBestCmap()[ord('a')]].draw(pen)
        weight_outlines.append(repr(pen.value))
    if len(set(weight_outlines)) != 4:
        raise ValueError(f'{name} must retain genuine outlines for all four used weights')
    output = woff2(font)
    emit(ASSETS / f'{name}-UI.woff2', output)
    emit(ASSETS / f'{name}-OFL.txt', license_data)
    return {'source': sizes(data), 'output': sizes(output), 'family': family,
            'weight': [font['fvar'].axes[0].minValue, font['fvar'].axes[0].maxValue],
            'mappedCodepoints': len(font.getBestCmap()), 'requiredLanguageCharacters': REQUIRED,
            'fixedAxes': fixed_axes, 'realWeightOutlineChecks': [400, 500, 600, 700]}


def number(value: float) -> str:
    return str(int(value)) if value == int(value) else f'{value:.1f}'.rstrip('0').rstrip('.')


def wordmark(theme: str, name: str, expected: str) -> dict:
    source_path = original_font(name, expected)
    data = source_path.read_bytes()
    if sha(data) != expected:
        raise ValueError(f'Unexpected original title font bytes: {source_path}')
    font = TTFont(io.BytesIO(data), recalcTimestamp=False)
    glyphs, order = font.getGlyphSet(), font.getGlyphOrder()
    shaped = hb.Font(hb.Face(data))
    buffer = hb.Buffer()
    buffer.add_str(TEXT)
    buffer.guess_segment_properties()
    hb.shape(shaped, buffer, {'kern': True, 'liga': True})
    pen, bounds = SVGPathPen(glyphs, ntos=number), BoundsPen(glyphs)
    x = y = 0
    for info, position in zip(buffer.glyph_infos, buffer.glyph_positions):
        transform = (1, 0, 0, -1, x + position.x_offset, -(y + position.y_offset))
        glyph = glyphs[order[info.codepoint]]
        glyph.draw(TransformPen(pen, transform))
        glyph.draw(TransformPen(bounds, transform))
        x += position.x_advance
        y += position.y_advance
    xmin, ymin, xmax, ymax = bounds.bounds
    upem = font['head'].unitsPerEm
    left = min(0, xmin)
    width = max(x, xmax) - left
    top = (ymin + ymax - upem) / 2
    view_box = ' '.join(number(n) for n in [left, top, width, upem])
    path = pen.getCommands()
    metric = {'path': path, 'viewBox': view_box, 'width': round(width, 3), 'height': upem,
              'advanceWidth': x, 'unitsPerEm': upem, 'ascent': font['hhea'].ascent,
              'descent': font['hhea'].descent, 'bounds': [round(n, 3) for n in bounds.bounds]}
    module = ('// Generated by tools/theme-font-assets.py from licensed ' + name + ' outlines.\n'
              '// Keep provenance and license notices in docs/production-assets.md.\n'
              'export const wordmark = ' + json.dumps(metric, separators=(',', ':')) + ' as const;\n')
    emit(WORDMARKS / f'{theme}.ts', module.encode())
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}"><path fill="currentColor" d="{path}"/></svg>'.encode()
    (EVIDENCE / f'{theme}-outlined.svg').write_bytes(svg)
    full_woff = woff2(TTFont(io.BytesIO(data), recalcTimestamp=False))
    (EVIDENCE / f'{theme}-full.woff2').write_bytes(full_woff)
    word_font = TTFont(io.BytesIO(data), recalcTimestamp=False)
    options = subset.Options()
    options.recalc_timestamp = False
    sub = subset.Subsetter(options=options)
    sub.populate(text=TEXT)
    sub.subset(word_font)
    # Word-only fonts are measured evidence, never distributed production fonts.
    text_woff = woff2(word_font)
    (EVIDENCE / f'{theme}-word-only.woff2').write_bytes(text_woff)
    pngs = {}
    for dpr in [1, 3]:
        em = 55.38 * dpr
        image = Image.new('RGBA', (math.ceil(width / upem * em), math.ceil(em)))
        draw = ImageDraw.Draw(image)
        raster_font = ImageFont.truetype(str(source_path), round(em))
        box = draw.textbbox((0, 0), TEXT, font=raster_font, anchor='ls')
        baseline = (image.height - box[1] - box[3]) / 2
        draw.text((-box[0], baseline), TEXT, font=raster_font, anchor='ls', fill='#FFF5D9')
        result = io.BytesIO()
        image.save(result, format='PNG', optimize=True)
        png = result.getvalue()
        (EVIDENCE / f'{theme}-{dpr}x.png').write_bytes(png)
        pngs[f'png{dpr}x'] = sizes(png)
    return {'text': TEXT, 'originalTtf': sizes(data), 'fullWoff2': sizes(full_woff),
            'wordOnlyWoff2': sizes(text_woff), 'outlinedSvg': sizes(svg),
            'typescriptModule': sizes(module.encode()), **pngs, 'metrics': {k: v for k, v in metric.items() if k != 'path'}}


def verify_solving(original: TTFont, derived: TTFont) -> None:
    """The frequently scanned puzzle glyphs must retain their exact geometry."""
    for weight in [100, 400, 500, 600, 700, 900]:
        old = original.getGlyphSet(location={'wght': weight})
        new = derived.getGlyphSet(location={'wght': weight})
        for char in ' 0123456789!':
            old_name, new_name = original.getBestCmap()[ord(char)], derived.getBestCmap()[ord(char)]
            before, after = RecordingPen(), RecordingPen()
            old[old_name].draw(before)
            new[new_name].draw(after)
            if before.value != after.value or old[old_name].width != new[new_name].width:
                raise ValueError(f'Solving outline/advance changed: {char!r} weight {weight}')
            old_program = getattr(original['glyf'][old_name], 'program', None)
            new_program = getattr(derived['glyf'][new_name], 'program', None)
            if (old_program.getBytecode() if old_program else b'') != (new_program.getBytecode() if new_program else b''):
                raise ValueError(f'Solving glyph hinting changed: {char!r}')


def verify_ui_shaping(name: str, family: str, filename: str, expected: str, license_hash: str, fixed_axes: dict) -> dict:
    """NFC/NFD language coverage plus default kerning/mark shaping at used weights."""
    original = TTFont(io.BytesIO(source(name, filename, expected)), recalcTimestamp=False)
    derived = TTFont(ASSETS / f'{name}-UI.woff2', recalcTimestamp=False)
    def shaping(font: TTFont, weight: int, text: str, pins: dict) -> list:
        font.flavor = None
        stream = io.BytesIO()
        font.save(stream)
        face = hb.Font(hb.Face(stream.getvalue()))
        face.set_variations({'wght': weight, **pins})
        buffer = hb.Buffer()
        buffer.add_str(text)
        buffer.guess_segment_properties()
        hb.shape(face, buffer, {'kern': True, 'liga': True})
        return [(p.x_advance, p.y_advance, p.x_offset, p.y_offset) for p in buffer.glyph_positions]
    corpus = REQUIRED + ' Quick Play Progression Einstellungen Zurück Metamorphose Tautropfen Progresión Español ¿Continuar? ¡Sí! 1.234,56 € '
    maximum = 0
    for text in [corpus, unicodedata.normalize('NFD', corpus)]:
        if {ord(char) for char in text} - set(derived.getBestCmap()):
            raise ValueError(f'{name} shaping corpus contains missing glyphs')
        for weight in [400, 500, 600, 700]:
            before, after = shaping(original, weight, text, fixed_axes), shaping(derived, weight, text, {})
            if len(before) != len(after):
                raise ValueError(f'{name} shaped glyph count changed')
            maximum = max(maximum, max(abs(a - b) for p, q in zip(before, after) for a, b in zip(p, q)))
    # Restricting a variable axis normalizes intermediate coordinates. The
    # observed two-unit bound is under 0.05px per glyph at the 22px UI cap.
    if maximum > 2:
        raise ValueError(f'{name} shaping normalization exceeds the reviewed bound: {maximum}')
    return {'maximumPositionRoundingUnits': maximum, 'unitsPerEm': derived['head'].unitsPerEm,
            'forms': ['NFC', 'NFD'], 'weights': [400, 500, 600, 700], 'fixedAxes': fixed_axes}


def verify_fixed_axis_outlines(name: str, family: str, filename: str, expected: str, license_hash: str, fixed_axes: dict) -> dict:
    """Prove the baked axes retain sampled source shapes, not just advance widths."""
    original = TTFont(io.BytesIO(source(name, filename, expected)), recalcTimestamp=False)
    derived = TTFont(ASSETS / f'{name}-UI.woff2', recalcTimestamp=False)
    text = REQUIRED + ' Quick Play Progression Einstellungen Zurück Progresión Español '
    def contours(font: TTFont, location: dict) -> list:
        font.flavor = None
        stream = io.BytesIO()
        font.save(stream)
        face = hb.Font(hb.Face(stream.getvalue()))
        face.set_variations(location)
        buffer = hb.Buffer()
        buffer.add_str(text)
        buffer.guess_segment_properties()
        hb.shape(face, buffer, {'kern': True, 'liga': True})
        glyphs, order = font.getGlyphSet(location=location), font.getGlyphOrder()
        result = []
        for info in buffer.glyph_infos:
            pen = DecomposingRecordingPen(glyphs)
            glyphs[order[info.codepoint]].draw(pen)
            result.append(pen.value)
        return result
    maximum = 0
    for weight in [400, 500, 600, 700]:
        before = contours(original, {'wght': weight, **fixed_axes})
        after = contours(derived, {'wght': weight})
        if len(before) != len(after):
            raise ValueError(f'{name} pinned-axis shaped count changed')
        for left, right in zip(before, after):
            if len(left) != len(right):
                raise ValueError(f'{name} pinned-axis contour topology changed')
            for (operation, points), (new_operation, new_points) in zip(left, right):
                if operation != new_operation or len(points) != len(new_points):
                    raise ValueError(f'{name} pinned-axis contour topology changed')
                for point, new_point in zip(points, new_points):
                    if (point is None) != (new_point is None):
                        raise ValueError(f'{name} pinned-axis contour endpoint changed')
                    if point is not None:
                        maximum = max(maximum, max(abs(a - b) for a, b in zip(point, new_point)))
    if maximum > 3:
        raise ValueError(f'{name} pinned-axis contour rounding exceeds the reviewed bound: {maximum}')
    return {'fixedAxes': fixed_axes, 'weights': [400, 500, 600, 700],
            'maximumCoordinateRoundingUnits': maximum, 'unitsPerEm': derived['head'].unitsPerEm,
            'matchingSampledContourTopology': True}


def main() -> None:
    for folder in [CACHE, EVIDENCE, ASSETS, WORDMARKS]:
        folder.mkdir(parents=True, exist_ok=True)
    ui = {name: ui_font(name, *parameters) for name, parameters in SOURCES.items()}
    titles = {theme: wordmark(theme, *parameters) for theme, parameters in TITLE_SOURCES.items()}
    outfit_source = original_font('Outfit', 'fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade').read_bytes()
    outfit_full = woff2(TTFont(io.BytesIO(outfit_source), recalcTimestamp=False))
    outfit_font = TTFont(io.BytesIO(outfit_source), recalcTimestamp=False)
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.layout_features += ['tnum', 'lnum', 'pnum', 'onum', 'zero']
    options.recalc_timestamp = False
    solving_subset = subset.Subsetter(options=options)
    solving_subset.populate(text=' 0123456789!')
    solving_subset.subset(outfit_font)
    rename(outfit_font, 'ToadokuSolving')
    verify_solving(TTFont(io.BytesIO(outfit_source), recalcTimestamp=False), outfit_font)
    outfit = woff2(outfit_font)
    emit(ASSETS / 'Outfit-Solving.woff2', outfit)
    report = {'sourceRevision': REVISION, 'toolVersions': {'fonttools': '4.60.1', 'brotli': '1.1.0', 'uharfbuzz': '0.52.0', 'pillow': '11.3.0'},
              'uiFonts': ui, 'uiShaping': {name: verify_ui_shaping(name, *parameters) for name, parameters in SOURCES.items()},
              'fixedAxisOutlineProof': {name: verify_fixed_axis_outlines(name, *parameters)
                                        for name, parameters in SOURCES.items() if parameters[-1]},
              'wordmarks': titles, 'outfit': {'originalTtf': sizes(outfit_source), 'fullWoff2': sizes(outfit_full),
                'solvingWoff2': sizes(outfit), 'family': 'ToadokuSolving', 'characters': ' 0123456789!',
                'outlineAdvanceHintingParityWeights': [100, 400, 500, 600, 700, 900]}}
    (EVIDENCE / 'measurements.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Regenerate in memory and verify tracked production bytes.')
    CHECK = parser.parse_args().check
    main()
