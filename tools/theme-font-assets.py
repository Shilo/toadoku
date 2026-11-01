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
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
REVISION = '6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec'
CACHE = ROOT / 'prototypes/theme-font-sources'
EVIDENCE = ROOT / 'prototypes/theme-font-measurements'
ASSETS = ROOT / 'src/assets/fonts'
WORDMARKS = ROOT / 'src/lib/theme/wordmarks'
SOURCES = {
    'Almendra': {
        'family': 'ToadokuPondUI',
        'license': 'b7eae5e3c3447f70caa14e0c43f5e0d953f54ee59df406f6362863bcee1a0a95',
        'faces': [
            ('Almendra-Regular.ttf', 'Almendra-UI-Regular.woff2', 400, 'Regular',
             'b127a6121209353b53da9ce73bf9d350f74190d8384c28ede179e4fb9440f946'),
            ('Almendra-Bold.ttf', 'Almendra-UI-Bold.woff2', 700, 'Bold',
             '5895ef04d0d56c60083ec302e72db99b952b044ab2b440ee12283649b5edc971'),
        ],
    },
    'GermaniaOne': {
        'family': 'ToadokuCauldronUI',
        'license': 'b7574cd4c76770e5e3915d16bd93f09663bd77cb041a4ec09d824c52b540529a',
        'faces': [
            ('GermaniaOne-Regular.ttf', 'GermaniaOne-UI.woff2', 400, 'Regular',
             '3ee3d56584bab8c9e3f59cc3360aa8a36e219dcf0a9f3c8928e3da5a19277e3f'),
        ],
    },
}
TITLE_SOURCES = {
    'pond': ('Chewy', '7cf75ea288f82fd20badea8ab4da7a656a96a7277c170811e813b3d3d6294147'),
    'cauldron': ('Creepster', '402aeb734586c74aecd3dbdc454589b1fb12e2e1c71f782fd019ae68066d9f44'),
}
TEXT = 'Toadoku'
REQUIRED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÄÖÜäöüẞßÑñÁÉÍÓÚáéíóúÜü¿¡€'
SYSTEM_FALLBACK = {'ẞ'}
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


def ui_face(name: str, family: str, filename: str, output_file: str, weight: int, style: str, expected: str) -> dict:
    data = source(name, filename, expected)
    font = TTFont(io.BytesIO(data), recalcTimestamp=False)
    if 'fvar' in font or font['OS/2'].usWeightClass != weight:
        raise ValueError(f'{name}/{style} must retain its genuine static weight {weight}')
    if bool(font['OS/2'].fsSelection & 32) != (style == 'Bold'):
        raise ValueError(f'{name}/{style} source style metadata does not match its face')
    # Preserve source-supported copy glyphs, Latin-1, combining marks and
    # punctuation. NFD support is checked by actual shaping, not cmap alone.
    ranges = [(0x20, 0xFF), (0x300, 0x36F), (0x2000, 0x206F)]
    copy = ''.join(path.read_text(encoding='utf8') for path in sorted((ROOT / 'src').rglob('*'))
                   if path.suffix in ['.ts', '.svelte'])
    requested = {value for low, high in ranges for value in range(low, high + 1)} | {0x1E9E, 0x20AC} | {ord(char) for char in copy}
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.glyph_names = True
    options.layout_features += ['tnum', 'lnum', 'pnum', 'onum', 'zero']
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=requested)
    supported_copy = requested & set(font.getBestCmap())
    subsetter.subset(font)
    if supported_copy - set(font.getBestCmap()):
        raise ValueError(f'{name}/{style} dropped a source-supported requested glyph')
    rename_ui_face(font, family, style)
    missing = sorted({character for character in REQUIRED if character not in SYSTEM_FALLBACK
                      and ord(character) not in font.getBestCmap()})
    if missing:
        raise ValueError(f'{name}/{style} is missing required EN/DE/ES characters: {missing}')
    output = woff2(font)
    emit(ASSETS / output_file, output)
    return {'source': sizes(data), 'output': sizes(output), 'family': family,
            'file': output_file, 'weight': weight, 'style': style, 'axes': [],
            'mappedCodepoints': len(font.getBestCmap()), 'requiredLanguageCharacters': REQUIRED,
            'systemFallbackCharacters': sorted(SYSTEM_FALLBACK),
            'supportedRequestedGlyphsPreserved': len(supported_copy)}


def rename_ui_face(font: TTFont, family: str, style: str) -> None:
    """One family, honest separate faces, and no upstream reserved family name."""
    values = {1: family, 2: style, 3: f'Toadoku-2026-{family}-{style}',
              4: f'{family} {style}', 6: f'{family}-{style}',
              16: family, 17: style, 21: family, 22: style, 25: family}
    for name in font['name'].names:
        if name.nameID in values:
            font['name'].setName(values[name.nameID], name.nameID, name.platformID, name.platEncID, name.langID)


def ui_font(name: str, profile: dict) -> dict:
    license_data = source(name, 'OFL.txt', profile['license'])
    faces = [ui_face(name, profile['family'], *face) for face in profile['faces']]
    emit(ASSETS / f'{name}-OFL.txt', license_data)
    if len(faces) == 2:
        contours = []
        for face in faces:
            font = TTFont(ASSETS / face['file'], recalcTimestamp=False)
            pen = RecordingPen()
            font.getGlyphSet()[font.getBestCmap()[ord('a')]].draw(pen)
            contours.append(pen.value)
        if contours[0] == contours[1]:
            raise ValueError(f'{name} regular/bold must retain distinct genuine outlines')
    return {'family': profile['family'], 'licenseSha256': sha(license_data), 'faces': faces}


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


def verify_ui_shaping(name: str, profile: dict) -> list:
    """Exact static-face shaping, contours and hint programs for the bounded set."""
    corpus = REQUIRED.replace('ẞ', '') + ' Quick Play Progression Einstellungen Zurück Metamorphose Tautropfen Progresión Español ¿Continuar? ¡Sí! 1.234,56 € 123456789 1 2 3 4 5 6 7 8 9 ! '
    result = []
    for filename, output_file, weight, style, expected in profile['faces']:
        original = TTFont(io.BytesIO(source(name, filename, expected)), recalcTimestamp=False)
        derived = TTFont(ASSETS / output_file, recalcTimestamp=False)
        if 'fvar' in derived or derived['OS/2'].usWeightClass != weight:
            raise ValueError(f'{name}/{style} static weight metadata changed')
        if original['OS/2'].fsSelection != derived['OS/2'].fsSelection:
            raise ValueError(f'{name}/{style} style flags changed')
        expected_names = {1: profile['family'], 2: style,
                          3: f"Toadoku-2026-{profile['family']}-{style}",
                          4: f"{profile['family']} {style}", 6: f"{profile['family']}-{style}"}
        for key, value in expected_names.items():
            if derived['name'].getDebugName(key) != value:
                raise ValueError(f'{name}/{style} family/style name {key} changed')
        def shaping(font: TTFont, text: str) -> list:
            font.flavor = None
            stream = io.BytesIO()
            font.save(stream)
            face = hb.Font(hb.Face(stream.getvalue()))
            buffer = hb.Buffer()
            buffer.add_str(text)
            buffer.guess_segment_properties()
            hb.shape(face, buffer, {'kern': True, 'liga': True})
            order = font.getGlyphOrder()
            return [(order[i.codepoint], p.x_advance, p.y_advance, p.x_offset, p.y_offset)
                    for i, p in zip(buffer.glyph_infos, buffer.glyph_positions)]
        normal = shaping(derived, corpus)
        decomposed = shaping(derived, unicodedata.normalize('NFD', corpus))
        for text, after in [(corpus, normal), (unicodedata.normalize('NFD', corpus), decomposed)]:
            if any(glyph[0] == '.notdef' for glyph in after):
                raise ValueError(f'{name}/{style} has an unsupported shaped language character')
            if shaping(original, text) != after:
                raise ValueError(f'{name}/{style} shaped glyph identity/position changed')
        if normal != decomposed:
            raise ValueError(f'{name}/{style} NFC/NFD shaping differs')
        for char in SYSTEM_FALLBACK:
            if ord(char) not in original.getBestCmap() and ord(char) in derived.getBestCmap():
                raise ValueError(f'{name}/{style} must not invent a fallback glyph')
        old_glyphs, new_glyphs = original.getGlyphSet(), derived.getGlyphSet()
        checked = 0
        for glyph in derived.getGlyphOrder():
            if glyph == '.notdef':
                continue
            before, after = DecomposingRecordingPen(old_glyphs), DecomposingRecordingPen(new_glyphs)
            old_glyphs[glyph].draw(before)
            new_glyphs[glyph].draw(after)
            if before.value != after.value or old_glyphs[glyph].width != new_glyphs[glyph].width:
                raise ValueError(f'{name}/{style} outline/advance changed: {glyph}')
            old_program = getattr(original['glyf'][glyph], 'program', None)
            new_program = getattr(derived['glyf'][glyph], 'program', None)
            if (old_program.getBytecode() if old_program else b'') != (new_program.getBytecode() if new_program else b''):
                raise ValueError(f'{name}/{style} glyph hinting changed: {glyph}')
            checked += 1
        result.append({'file': output_file, 'weight': weight, 'style': style, 'axes': [],
                       'forms': ['NFC', 'NFD'], 'missingShapedGlyphs': 0,
                       'exactSourceShapedGlyphNamesAndPositions': True, 'exactNfcNfdShaping': True,
                       'exactOutlineAdvanceHintProgramGlyphs': checked,
                       'systemFallbackCharacters': sorted(SYSTEM_FALLBACK),
                       'numeralAndNineNoteCorpus': '0123456789 123456789 1 2 3 4 5 6 7 8 9 !'})
    return result


def main() -> None:
    for folder in [CACHE, EVIDENCE, ASSETS, WORDMARKS]:
        folder.mkdir(parents=True, exist_ok=True)
    ui = {name: ui_font(name, profile) for name, profile in SOURCES.items()}
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
              'uiFonts': ui, 'uiShaping': {name: verify_ui_shaping(name, profile) for name, profile in SOURCES.items()},
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
