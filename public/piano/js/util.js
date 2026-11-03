// Shared helpers: note maths, settings, tiny event emitter, chord/scale tables.

export const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
export const ROOT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const BLACK = new Set([1, 3, 6, 8, 10])

export const pc = (m) => ((m % 12) + 12) % 12
export const isBlack = (m) => BLACK.has(pc(m))
export const octave = (m) => Math.floor(m / 12) - 1
export const noteName = (m, withOct = true) => NAMES[pc(m)] + (withOct ? octave(m) : '')
/** Friendly name: "G" or "F♯/G♭" (black keys have two names) */
export function prettyName(m, withOct = false) {
  const o = withOct ? octave(m) : ''
  return isBlack(m) ? `${NAMES[pc(m)][0]}♯/${FLATS[pc(m)].replace('b', '♭')}${o}` : `${NAMES[pc(m)]}${o}`
}
const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
export function parseNote(s) {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(s)
  if (!m) return null
  return (parseInt(m[3], 10) + 1) * 12 + BASE[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
export const $ = (root, sel) => root.querySelector(sel)
export const $$ = (root, sel) => [...root.querySelectorAll(sel)]

export class Emitter {
  constructor() { this.l = {} }
  on(type, fn) { (this.l[type] ||= new Set()).add(fn); return () => this.l[type].delete(fn) }
  emit(type, data) { this.l[type]?.forEach((f) => f(data)) }
}

export const store = {
  get(key, def) {
    try { const v = localStorage.getItem('ivory:' + key); return v == null ? def : JSON.parse(v) } catch { return def }
  },
  set(key, val) { try { localStorage.setItem('ivory:' + key, JSON.stringify(val)) } catch { /* private mode etc. */ } },
}

export const settings = Object.assign(
  {
    appSound: 'auto', // where app-generated sound goes: auto | piano | device | both
    thru: false, // also play piano key presses through this device's speaker
    labels: true,
    timingOffset: 0, // ms, to compensate input latency
    volume: 0.8, preset: 'piano', wave: 'sawtooth',
    attack: 0, release: 0, bright: 0.5, reverb: 0.2, echo: 0, octave: 0,
    midiOut: null,
  },
  store.get('settings', {}),
)
export const settingsBus = new Emitter()
export function saveSettings() { store.set('settings', settings); settingsBus.emit('change', settings) }

export const CHORDS = {
  major: { label: 'major', iv: [0, 4, 7] },
  minor: { label: 'minor', iv: [0, 3, 7] },
  dim: { label: 'diminished', iv: [0, 3, 6] },
  aug: { label: 'augmented', iv: [0, 4, 8] },
  sus2: { label: 'sus2', iv: [0, 2, 7] },
  sus4: { label: 'sus4', iv: [0, 5, 7] },
  7: { label: 'dominant 7th', iv: [0, 4, 7, 10] },
  maj7: { label: 'major 7th', iv: [0, 4, 7, 11] },
  m7: { label: 'minor 7th', iv: [0, 3, 7, 10] },
  6: { label: 'major 6th', iv: [0, 4, 7, 9] },
}
export const SCALES = {
  major: { label: 'Major', iv: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: 'Natural minor', iv: [0, 2, 3, 5, 7, 8, 10] },
  harmonic: { label: 'Harmonic minor', iv: [0, 2, 3, 5, 7, 8, 11] },
  pentatonic: { label: 'Major pentatonic', iv: [0, 2, 4, 7, 9] },
  minpent: { label: 'Minor pentatonic', iv: [0, 3, 5, 7, 10] },
  blues: { label: 'Blues', iv: [0, 3, 5, 6, 7, 10] },
  dorian: { label: 'Dorian', iv: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { label: 'Mixolydian', iv: [0, 2, 4, 5, 7, 9, 10] },
  chromatic: { label: 'Chromatic', iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
}
const INTERVALS = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th']

/** Name whatever is being held, e.g. "C major", "A minor / C" (inversion) or "C + major 3rd". */
export function chordName(notes) {
  if (notes.length < 2) return null
  const sorted = [...notes].sort((a, b) => a - b)
  const bass = pc(sorted[0])
  const set = [...new Set(sorted.map(pc))]
  if (set.length === 1) return 'Octave'
  if (set.length === 2) {
    const other = set.find((p) => p !== bass)
    return `${ROOT_NAMES[bass]} + ${INTERVALS[(other - bass + 12) % 12]}`
  }
  const roots = [bass, ...set.filter((p) => p !== bass)]
  for (const r of roots) {
    const key = set.map((p) => (p - r + 12) % 12).sort((a, b) => a - b).join(',')
    for (const t of Object.values(CHORDS)) {
      if (t.iv.join(',') === key) return `${ROOT_NAMES[r]} ${t.label}` + (r !== bass ? ` / ${ROOT_NAMES[bass]}` : '')
    }
  }
  return null
}

/** Keyboard range (white-key aligned, at least two octaves) that covers lo..hi */
export function kbRange(lo, hi) {
  const low = Math.floor(lo / 12) * 12
  let high = Math.ceil(hi / 12) * 12
  if (high - low < 24) high = low + 24
  return [low, high]
}
