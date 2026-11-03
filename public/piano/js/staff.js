// Draws notes on a treble / bass / grand staff as inline SVG (whole notes, no stems – clean for reading practice).
import { NAMES, pc, octave } from './util.js'

const LETTER = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }
const HALF = 6 // px per staff step (line gap = 2 steps)
const T = 100 // y of treble bottom line (E4)
const TREBLE_BOTTOM = 30 // diatonic step of E4
const BASS_BOTTOM = 18 // G2
const BASS_Y = T + 72 // y of bass bottom line (bass top line is 4 steps under treble bottom)

function diatonic(m) {
  const n = NAMES[pc(m)]
  return { step: octave(m) * 7 + LETTER[n[0]], sharp: n.length > 1 }
}

export function renderStaff(notes, clef = 'treble') {
  notes = [].concat(notes)
  const yTreble = (s) => T - (s - TREBLE_BOTTOM) * HALF
  const yBass = (s) => BASS_Y - (s - BASS_BOTTOM) * HALF
  const staves = []
  if (clef === 'treble' || clef === 'grand') staves.push({ bottom: TREBLE_BOTTOM, y: yTreble, y0: T, label: 'G' })
  if (clef === 'bass' || clef === 'grand') staves.push({ bottom: BASS_BOTTOM, y: yBass, y0: BASS_Y, label: 'F' })
  const top = (staves[0].y0 - 8 * HALF) - 8 * HALF
  const bottom = staves[staves.length - 1].y0 + 8 * HALF
  let svg = `<svg class="staff" viewBox="0 ${top} 220 ${bottom - top}" role="img" aria-label="Music staff">`
  for (const st of staves) {
    for (let i = 0; i < 5; i++) {
      const y = st.y0 - i * 2 * HALF
      svg += `<line x1="10" x2="210" y1="${y}" y2="${y}" stroke="currentColor" stroke-width="1.4" opacity=".75"/>`
    }
    // simple letter clefs: the G clef curls round the G line, the F clef sits on the F line
    const cy = st.label === 'G' ? st.y0 - 3 * HALF : st.y0 - 6 * HALF
    svg += `<text x="22" y="${cy + 14}" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="40" fill="currentColor" opacity=".9" text-anchor="middle">${st.label}</text>`
  }
  svg += `<line x1="10" x2="10" y1="${staves[0].y0 - 8 * HALF}" y2="${staves[staves.length - 1].y0}" stroke="currentColor" stroke-width="1.4" opacity=".75"/>`
  notes.forEach((m, i) => {
    const { step, sharp } = diatonic(m)
    let st = staves[0]
    if (clef === 'grand') st = step >= 28 ? staves[0] : staves[1]
    const y = st.y(step)
    const x = 130 + (notes.length > 1 ? (i % 2) * 18 : 0)
    // ledger lines (lines sit on even offsets from the bottom line)
    if (step < st.bottom) for (let s = st.bottom - 2; s >= step; s -= 2) svg += ledger(st.y(s), x)
    if (step > st.bottom + 8) for (let s = st.bottom + 10; s <= step; s += 2) svg += ledger(st.y(s), x)
    if (sharp) svg += `<text x="${x - 24}" y="${y + 7}" font-size="22" fill="currentColor" font-family="serif">♯</text>`
    svg += `<ellipse cx="${x}" cy="${y}" rx="9" ry="6.2" transform="rotate(-18 ${x} ${y})" fill="none" stroke="currentColor" stroke-width="2.6"/>`
  })
  return svg + '</svg>'
}
const ledger = (y, x) => `<line x1="${x - 17}" x2="${x + 17}" y1="${y}" y2="${y}" stroke="currentColor" stroke-width="1.6"/>`
