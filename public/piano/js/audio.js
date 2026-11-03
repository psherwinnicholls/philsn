// A small Web Audio synth with a handful of sounds + reverb/echo.
import { settings, mtof, clamp } from './util.js'

const PRESETS = {
  piano: { label: 'Grand piano', parts: [{ t: 'triangle', r: 1, g: 1 }, { t: 'sine', r: 2, g: 0.5 }, { t: 'sine', r: 3, g: 0.22 }, { t: 'sine', r: 4, g: 0.12 }, { t: 'sine', r: 6, g: 0.05 }], a: 0.004, d: 1.3, s: 0.04, r: 0.35, cutoff: 3200, level: 1 },
  epiano: { label: 'Electric piano', parts: [{ t: 'sine', r: 1, g: 1, fm: { ratio: 1, index: 1.6 } }, { t: 'sine', r: 2, g: 0.15 }], a: 0.004, d: 1.6, s: 0.1, r: 0.4, cutoff: 6000, level: 0.9 },
  organ: { label: 'Organ', parts: [1, 2, 3, 4, 6, 8].map((r, i) => ({ t: 'sine', r, g: [1, 0.8, 0.6, 0.4, 0.3, 0.2][i] })), a: 0.01, d: 0, s: 1, r: 0.06, cutoff: 9000, level: 0.35 },
  strings: { label: 'Strings', parts: [{ t: 'sawtooth', r: 1, g: 0.5, detune: -9 }, { t: 'sawtooth', r: 1, g: 0.5, detune: 9 }], a: 0.35, d: 0, s: 1, r: 0.5, cutoff: 2200, level: 0.45 },
  bell: { label: 'Bells', parts: [{ t: 'sine', r: 1, g: 1 }, { t: 'sine', r: 2.76, g: 0.5 }, { t: 'sine', r: 5.4, g: 0.3 }, { t: 'sine', r: 8.93, g: 0.15 }], a: 0.002, d: 1.8, s: 0, r: 1.2, cutoff: 12000, level: 0.8 },
  pluck: { label: 'Harp pluck', parts: [{ t: 'sawtooth', r: 1, g: 1 }, { t: 'square', r: 2, g: 0.2 }], a: 0.002, d: 0.25, s: 0, r: 0.12, cutoff: 2600, level: 0.6 },
  chip: { label: 'Chiptune', parts: [{ t: 'square', r: 1, g: 1 }], a: 0.005, d: 0.12, s: 0.6, r: 0.04, cutoff: 8000, level: 0.35 },
  synth: { label: 'Synth (pick a wave)', parts: () => [{ t: settings.wave, r: 1, g: 1, detune: -6 }, { t: settings.wave, r: 1, g: 1, detune: 6 }], a: 0.01, d: 0.5, s: 0.7, r: 0.15, cutoff: 5000, level: 0.35 },
}
export const PRESET_LIST = Object.entries(PRESETS).map(([id, p]) => ({ id, label: p.label }))

let ctx, master, bus, revSend, delSend
const voices = new Map() // note -> [voice]
let sustainOn = false
const sustained = new Set()

function makeImpulse(c) {
  const len = c.sampleRate * 2.2
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5)
  }
  return buf
}

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC({ latencyHint: 'interactive' })
    const comp = ctx.createDynamicsCompressor()
    master = ctx.createGain()
    master.connect(comp); comp.connect(ctx.destination)
    bus = ctx.createGain(); bus.connect(master)
    const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx)
    revSend = ctx.createGain(); bus.connect(revSend); revSend.connect(conv); conv.connect(master)
    const delay = ctx.createDelay(1.5); delay.delayTime.value = 0.32
    const fb = ctx.createGain(); fb.gain.value = 0.38
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500
    delSend = ctx.createGain(); bus.connect(delSend); delSend.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master)
    applyFx()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function applyFx() {
  if (!ctx) return
  master.gain.value = settings.volume
  revSend.gain.value = settings.reverb * 0.9
  delSend.gain.value = settings.echo * 0.7
}

function killVoice(v, t) {
  try { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.02) } catch {}
  v.oscs.forEach((o) => { try { o.stop(t + 0.15) } catch {} })
}

function release(v) {
  if (v.released) return
  v.released = true
  const t = ctx.currentTime
  const p = PRESETS[v.preset]
  const r = clamp(p.r + settings.release, 0.02, 4)
  try {
    v.g.gain.cancelScheduledValues(t)
    v.g.gain.setValueAtTime(v.g.gain.value, t)
    v.g.gain.setTargetAtTime(0, t, r / 4)
  } catch {}
  v.oscs.forEach((o) => { try { o.stop(t + r * 1.4 + 0.1) } catch {} })
}

export const synth = {
  unlock() { ensure() },
  get ready() { return !!ctx },
  noteOn(note, vel = 96) {
    const c = ensure()
    if (!c) return
    note = clamp(note + 12 * settings.octave, 0, 127)
    const p = PRESETS[settings.preset] || PRESETS.piano
    const t = c.currentTime
    const freq = mtof(note)
    const v127 = clamp(vel, 1, 127) / 127
    const peak = Math.pow(v127, 1.4) * 0.4 * p.level
    const g = c.createGain(); g.gain.value = 0
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.7
    const bright = Math.pow(2, (settings.bright - 0.5) * 4)
    f.frequency.value = clamp(p.cutoff * bright * (0.5 + v127) * Math.pow(2, (note - 60) / 24), 200, 18000)
    f.connect(g); g.connect(bus)
    const oscs = []
    const parts = typeof p.parts === 'function' ? p.parts() : p.parts
    for (const part of parts) {
      const o = c.createOscillator(); o.type = part.t; o.frequency.value = freq * part.r
      if (part.detune) o.detune.value = part.detune
      const pg = c.createGain(); pg.gain.value = part.g / Math.sqrt(parts.length)
      if (part.fm) {
        const m = c.createOscillator(); m.type = 'sine'; m.frequency.value = freq * part.fm.ratio
        const mg = c.createGain(); const depth = part.fm.index * freq * part.fm.ratio
        mg.gain.setValueAtTime(depth * v127 * 1.5, t); mg.gain.setTargetAtTime(depth * 0.1, t, 0.35)
        m.connect(mg); mg.connect(o.frequency); m.start(t); oscs.push(m)
      }
      o.connect(pg); pg.connect(f); o.start(t); oscs.push(o)
    }
    const a = clamp(p.a + settings.attack, 0.003, 3)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + a)
    if (p.s < 1) g.gain.setTargetAtTime(peak * p.s, t + a, Math.max(0.02, p.d * Math.pow(2, -(note - 60) / 36)) / 2)
    const v = { note, g, oscs, preset: settings.preset, released: false }
    const list = voices.get(note) || []
    list.push(v); voices.set(note, list)
    sustained.delete(note)
    if (voices.size > 28) { // keep polyphony sane
      const oldest = voices.keys().next().value
      voices.get(oldest)?.forEach((x) => killVoice(x, t)); voices.delete(oldest)
    }
    const stopAt = 12
    setTimeout(() => { // free memory for voices that decayed away
      const l = voices.get(note); if (!l) return
      const i = l.indexOf(v); if (i >= 0) l.splice(i, 1); if (!l.length) voices.delete(note)
    }, (stopAt + 4) * 1000)
  },
  noteOff(note) {
    if (!ctx) return
    note = clamp(note + 12 * settings.octave, 0, 127)
    if (sustainOn) { sustained.add(note); return }
    const list = voices.get(note); if (!list) return
    const v = list.find((x) => !x.released)
    if (v) release(v)
  },
  sustain(on) {
    sustainOn = on
    if (!on) { for (const n of sustained) voices.get(n)?.forEach(release); sustained.clear() }
  },
  allOff() {
    if (!ctx) return
    sustainOn = false; sustained.clear()
    for (const list of voices.values()) list.forEach(release)
  },
  click(accent = false) {
    const c = ensure(); if (!c) return
    const t = c.currentTime
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = accent ? 1600 : 1100
    const g = c.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.06)
  },
  /** Cheerful feedback blip */
  ding(good = true) {
    const c = ensure(); if (!c) return
    const t = c.currentTime
    ;(good ? [880, 1320] : [196]).forEach((f, i) => {
      const o = c.createOscillator(); o.type = good ? 'sine' : 'triangle'; o.frequency.value = f
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.07); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.07 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.25)
      o.connect(g); g.connect(master); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.3)
    })
  },
}
