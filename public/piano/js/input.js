// One place where every note (piano, touchscreen, computer keyboard) comes in,
// and where we decide whether it sounds on the piano, this device, or both.
import { Emitter, settings } from './util.js'
import { midi } from './midi.js'
import { synth } from './audio.js'

export const input = new Emitter() // 'noteon' {note,vel,time,source} | 'noteoff' {note,source}
export const held = new Map() // note -> source
let harmony = [0]
export const setHarmony = (offsets) => { harmony = offsets && offsets.length ? offsets : [0] }
const active = new Map() // "source:note" -> [{dest, n}]

function dests() {
  const has = midi.hasOutput
  switch (settings.appSound) {
    case 'device': return { piano: false, dev: true }
    case 'piano': return has ? { piano: true, dev: false } : { piano: false, dev: true }
    case 'both': return { piano: has, dev: true }
    default: return has ? { piano: true, dev: false } : { piano: false, dev: true }
  }
}

function start(n, vel, native) {
  const out = []
  if (native) { // the piano already sounds its own key presses
    if (settings.thru) { synth.noteOn(n, vel); out.push('dev') }
    return out
  }
  const d = dests()
  if (d.piano) { midi.sendOn(n, vel); out.push('piano') }
  if (d.dev) { synth.noteOn(n, vel); out.push('dev') }
  return out
}

export function noteOn(note, vel = 96, source = 'screen', time = performance.now()) {
  if (held.has(note) && source !== 'midi') return
  held.set(note, source)
  const targets = []
  for (const o of harmony) {
    const n = note + o
    if (n < 0 || n > 127) continue
    start(n, vel, source === 'midi' && o === 0).forEach((d) => targets.push({ d, n }))
  }
  active.set(source + ':' + note, targets)
  input.emit('noteon', { note, vel, time, source })
}

export function noteOff(note, source = 'screen') {
  held.delete(note)
  const key = source + ':' + note
  const targets = active.get(key)
  active.delete(key)
  targets?.forEach(({ d, n }) => (d === 'piano' ? midi.sendOff(n) : synth.noteOff(n)))
  input.emit('noteoff', { note, source })
}

export function releaseAll() {
  for (const [note, source] of [...held]) noteOff(note, source)
  synth.allOff()
}

/** Notes the *app* wants to play (demos, ear training, hints) */
export function appPlay(note, durMs = 600, vel = 90) {
  const d = dests()
  if (d.piano) midi.sendOn(note, vel)
  if (d.dev) synth.noteOn(note, vel)
  setTimeout(() => { if (d.piano) midi.sendOff(note); if (d.dev) synth.noteOff(note) }, durMs)
}

midi.on('noteon', (e) => noteOn(e.note, e.vel, 'midi', e.time))
midi.on('noteoff', (e) => noteOff(e.note, 'midi'))
midi.on('sustain', (e) => { if (settings.thru) synth.sustain(e.on) })

// Browsers only allow audio after a gesture
const unlock = () => synth.unlock()
window.addEventListener('pointerdown', unlock, { once: true })
window.addEventListener('keydown', unlock, { once: true })
