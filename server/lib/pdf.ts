import { randomUUID } from 'node:crypto'

/* ────────────────────────────────────────────────────────────────────────
   Gerador de PDF sem dependências externas.
   Usado para receitas e documentos médicos (visualização + download).
   A4 + fontes Helvetica padrão (não embutidas) + cabeçalho da clínica.
   ──────────────────────────────────────────────────────────────────────── */

export const A4_W = 595.28
export const A4_H = 841.89
export const MARGIN = 48

export interface PdfText {
  type: 'text'
  /** Texto com tags simples: <b>texto</b> para negrito, <i>texto</i> para itálico, <br> quebra. */
  value: string
  /** tamanho em pt */
  size?: number
  /** cor em hex (#RRGGBB) */
  color?: string
  /** alinhamento: left | center | right */
  align?: 'left' | 'center' | 'right'
  /** espaço extra antes (pt) */
  spaceBefore?: number
  /** espaço depois (pt) */
  spaceAfter?: number
  /** largura útil restante quando usado dentro de linhas */
  gap?: number
}

export interface PdfRect {
  type: 'rect'
  x: number
  y: number
  w: number
  h: number
  color: string
}

export type PdfBlock = PdfText | PdfRect

/* Fontes mapeadas para os recursos /F1..F4 do PDF. */
const FONT_KEYS = ['F1', 'F2', 'F3', 'F4'] as const
type FontKey = (typeof FONT_KEYS)[number]

function fontKey(bold: boolean, italic: boolean): FontKey {
  if (bold && italic) return 'F4'
  if (bold) return 'F2'
  if (italic) return 'F3'
  return 'F1'
}

/* Fatores de largura (Helvetica, por ponto) — aproximação prática. */
const WIDTHS: Record<FontKey, number> = {
  F1: 0.556,
  F2: 0.6,
  F3: 0.556,
  F4: 0.6,
}

const LINE_H = 1.3

/* ── Codificação de texto ──────────────────────────────────────────────
   As fontes Helvetica (base-14) usam WinAnsiEncoding (subset do Latin-1 /
   Windows-1252). Caracteres fora desse conjunto (—, aspas tipográficas,
   “smart quotes”, U+FFFD…) precisam ser traduzidos antes de escrever o
   PDF — senão o byte truncado vira lixo no documento. */

const WIN_ANSI_REPLACE: Record<string, string> = {
  '—': '-', // — travessão/em dash
  '–': '-', // – en dash
  '‘': "'", // ‘
  '’': "'", // ’
  '“': '"', // “
  '”': '"', // ”
  '„': '"', // „
  '…': '...', // …
  ' ': ' ', // espaço sem quebra
  '�': '?', // caractere de substituição (corrompido)
}

/** Garante que o texto caiba em WinAnsi; chars fora viram ASCII/'?'. */
function toWinAnsi(value: string): string {
  let out = ''
  for (const ch of value) {
    const cp = ch.codePointAt(0)!
    if (cp >= 0x20 && cp <= 0xff) {
      out += ch
      continue
    }
    if (ch === '\n') {
      out += ch // quebra de linha tratada pelo splitLines
      continue
    }
    out += WIN_ANSI_REPLACE[ch] ?? '?'
  }
  return out
}

/** Escapa/sanitiza texto para dentro de stream de conteúdo PDF (strings). */
export function esc(value: string): string {
  return toWinAnsi(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

/** #RRGGBB → componente numérica de cor PDF (0..1). */
export function hexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return { r: 0.91, g: 0.24, b: 0.55 }
  return {
    r: ((num >> 16) & 0xff) / 255,
    g: ((num >> 8) & 0xff) / 255,
    b: (num & 0xff) / 255,
  }
}

interface Token {
  value: string
  key: FontKey
}

/** Divide texto rico em tokens de fonte (negrito/itálico). */
function parseRich(value: string): Token[] {
  const tokens: Token[] = []
  const re = /<\/?(b|i|br)>/g
  let last = 0
  let bold = false
  let italic = false
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    if (m.index > last) tokens.push({ value: value.slice(last, m.index), key: fontKey(bold, italic) })
    if (m[1] === 'br') {
      tokens.push({ value: '\n', key: fontKey(bold, italic) })
    } else if (m[1] === 'b') {
      bold = true
    } else if (m[1] === 'i') {
      italic = true
    } else if (m[0] === '</b>') {
      bold = false
    } else if (m[0] === '</i>') {
      italic = false
    }
    last = m.index + m[0].length
  }
  if (last < value.length) tokens.push({ value: value.slice(last), key: fontKey(bold, italic) })
  return tokens
}

function textWidth(value: string, key: FontKey, size: number): number {
  let w = 0
  for (const ch of value) {
    if (ch === '\n') continue
    w += (WIDTHS[key] ?? 0.556) * size
  }
  return w
}

function splitLines(value: string, size: number, maxWidth: number): Token[][] {
  const out: Token[][] = []
  let line: Token[] = []
  let lineWidth = 0

  const flush = () => {
    if (line.length > 0) {
      out.push(line)
      line = []
      lineWidth = 0
    }
  }

  const tokens = parseRich(value)
  for (const tok of tokens) {
    // Sanitiza antes de medir/quebrar: o que for medido é o que será
    // renderizado (esc() aplica a mesma transformação).
    tok.value = toWinAnsi(tok.value)
    const parts = tok.value.split('\n')
    for (let p = 0; p < parts.length; p++) {
      const part = parts[p]
      if (part === '') {
        if (p < parts.length - 1) {
          flush()
          out.push([]) // linha vazia (parágrafo)
        }
        continue
      }
      const words = part.split(' ')
      for (let w = 0; w < words.length; w++) {
        const word = words[w]
        const space = w < words.length - 1 ? ' ' : ''
        const wordW = textWidth(word + space, tok.key, size)
        if (lineWidth + wordW > maxWidth && lineWidth > 0) flush()
        if (word === '') continue
        line.push({ value: word + space, key: tok.key })
        lineWidth += wordW
      }
      if (p < parts.length - 1) {
        flush()
        out.push([])
      }
    }
  }
  flush()
  return out.length > 0 ? out : [[]]
}

/* ── Escritor de objetos PDF ─────────────────────────────────────────── */

class PdfWriter {
  private objects: string[] = []
  private buffer: string

  constructor() {
    this.buffer = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  }

  /** Registra um objeto e retorna seu número (1-based). */
  addDict(stream: string): number {
    this.objects.push(stream)
    return this.objects.length
  }

  build(): Buffer {
    const xrefStart = Buffer.byteLength(this.buffer, 'latin1')
    const entries: string[] = ['0000000000 65535 f ']
    for (let i = 0; i < this.objects.length; i++) {
      const offset = Buffer.byteLength(this.buffer, 'latin1')
      entries.push(String(offset).padStart(10, '0') + ' 00000 n ')
      this.buffer += `${i + 1} 0 obj\n${this.objects[i]}\nendobj\n`
    }
    this.buffer += `xref\n0 ${this.objects.length + 1}\n${entries.join('\n')}\n`
    this.buffer += `trailer\n<< /Size ${this.objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
    return Buffer.from(this.buffer, 'latin1')
  }
}

/* ── Renderização ────────────────────────────────────────────────────── */

function buildStream(blocks: PdfBlock[], header: { title: string; subtitle?: string }): string {
  const cmds: string[] = []
  const bandH = 96

  /* Faixa do cabeçalho — magenta + linha turquesa */
  cmds.push(`${hexColor('#E83E8C').r} ${hexColor('#E83E8C').g} ${hexColor('#E83E8C').b} rg`)
  cmds.push(`0 ${A4_H - bandH} ${A4_W} ${bandH} re f`)
  cmds.push(`${hexColor('#19B7C8').r} ${hexColor('#19B7C8').g} ${hexColor('#19B7C8').b} rg`)
  cmds.push(`0 ${A4_H - bandH - 6} ${A4_W} 6 re f`)

  const white = '1 1 1 rg'

  // Nome da clínica
  cmds.push('/F2 17 Tf')
  cmds.push(white)
  cmds.push(`BT ${MARGIN} ${A4_H - 50} Td (${esc('Clínica Veterinária Dr.ª Cássia Carvalho')}) Tj ET`)
  cmds.push('/F1 9.5 Tf')
  cmds.push(`BT ${MARGIN} ${A4_H - 66} Td (${esc('Guariba-SP — R. Bonfim, 1015 — Vila Garavello')}) Tj ET`)
  cmds.push(`BT ${MARGIN} ${A4_H - 80} Td (${esc('Atendimento 24 horas — (16) 99781-7140')}) Tj ET`)

  // Título da seção (direita)
  cmds.push('/F2 13 Tf')
  const titleWidth = textWidth(toWinAnsi(header.title), 'F2', 13)
  cmds.push(`BT ${A4_W - MARGIN - titleWidth} ${A4_H - 58} Td (${esc(header.title)}) Tj ET`)
  if (header.subtitle) {
    cmds.push('/F1 9 Tf')
    const subWidth = textWidth(toWinAnsi(header.subtitle), 'F1', 9)
    cmds.push(`BT ${A4_W - MARGIN - subWidth} ${A4_H - 72} Td (${esc(header.subtitle)}) Tj ET`)
  }

  let y = A4_H - bandH - MARGIN

  for (const block of blocks) {
    if (block.type === 'rect') {
      const c = hexColor(block.color)
      cmds.push(`${c.r} ${c.g} ${c.b} rg`)
      cmds.push(`${block.x} ${y - block.h} ${block.w} ${block.h} re f`)
      continue
    }

    const size = block.size ?? 10.5
    const align = block.align ?? 'left'
    const color = hexColor(block.color ?? '#17202A')
    const spaceBefore = block.spaceBefore ?? 0
    const spaceAfter = block.spaceAfter ?? 0
    const gap = block.gap ?? 0
    const maxWidth = A4_W - MARGIN * 2 - gap

    if (block.value.trim() === '') {
      y -= spaceBefore + spaceAfter + size * LINE_H
      continue
    }

    y -= spaceBefore
    const lines = splitLines(block.value, size, maxWidth)
    for (const line of lines) {
      if (line.length === 0) {
        y -= size * LINE_H
        continue
      }
      const lineWidth = line.reduce((acc, t) => acc + textWidth(t.value, t.key, size), 0)
      let x = MARGIN
      if (align === 'center') x = MARGIN + (maxWidth - lineWidth) / 2
      if (align === 'right') x = MARGIN + maxWidth - lineWidth

      cmds.push(`${color.r} ${color.g} ${color.b} rg`)
      cmds.push('BT')
      for (const tok of line) {
        cmds.push(`/${tok.key} ${size} Tf`)
        // Tm define a posição em coordenadas absolutas da página (origem no
        // canto inferior-esquerdo). Diferente de Td, que é relativo ao ponto
        // de texto atual — com Td os offsets de cada token se acumulavam,
        // empilhando/sobrepondo o texto e quebrando a leitura no viewer.
        cmds.push(`${1} 0 0 ${1} ${x} ${y} Tm (${esc(tok.value)}) Tj`)
        x += textWidth(tok.value, tok.key, size)
      }
      cmds.push('ET')
      y -= size * LINE_H
    }
    y -= spaceAfter

    if (y < MARGIN) break // fim da página (sem paginação automática nesta versão)
  }

  return cmds.join('\n')
}

export interface PdfOptions {
  title: string
  subtitle?: string
}

/**
 * Gera um PDF válido (A4) com o cabeçalho da clínica e os blocos fornecidos.
 * Retorna um Buffer pronto para res.send / arquivo.
 */
export function renderPdf(blocks: PdfBlock[], options: PdfOptions): Buffer {
  const w = new PdfWriter()
  const contentStream = buildStream(blocks, { title: options.title, subtitle: options.subtitle })

  w.addDict(`<< /Type /Catalog /Pages 2 0 R >>`) // 1
  w.addDict(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`) // 2
  w.addDict(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] ` +
      `/Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R >> >> ` +
      `/Contents 8 0 R >>`,
  ) // 3
  // WinAnsiEncoding → acentos pt-BR (á, ã, ç, ª…) renderizam corretamente
  // nas fontes base-14 Helvetica.
  w.addDict(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`) // 4 (F1)
  w.addDict(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`) // 5 (F2)
  w.addDict(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>`) // 6 (F3)
  w.addDict(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>`) // 7 (F4)
  w.addDict(`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`) // 8

  return w.build()
}

/** Número de documento para rodapé/identificação. */
export function docNumber(): string {
  return `DOC-${randomUUID().slice(0, 8).toUpperCase()}`
}
