// Web MIDI wrapper: finds the piano, emits note events, can send notes back to it.
import { Emitter, settings, saveSettings } from './util.js'

export const midi = new Emitter()
midi.supported = typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess
midi.inputs = []
midi.outputs = []
midi.out = null
midi.error = null
let access = null

const isVirtual = (p) => /midi through|microsoft gs/i.test(p.name || '')

function refresh() {
  midi.inputs = [...access.inputs.values()].filter((p) => !isVirtual(p))
  midi.outputs = [...access.outputs.values()].filter((p) => !isVirtual(p))
  midi.inputs.forEach((i) => { i.onmidimessage = onMessage })
  midi.out = midi.outputs.find((o) => o.id === settings.midiOut)
    || midi.outputs.find((o) => /kawai|cs\d|digital piano/i.test(o.name))
    || midi.outputs[0] || null
  midi.emit('state')
}

function onMessage(e) {
  const [st, d1, d2] = e.data
  if (st >= 0xf0) return // clock, active sensing, sysex…
  const cmd = st & 0xf0
  if (cmd === 0x90 && d2 > 0) midi.emit('noteon', { note: d1, vel: d2, time: e.timeStamp })
  else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) midi.emit('noteoff', { note: d1, time: e.timeStamp })
  else if (cmd === 0xb0 && d1 === 64) midi.emit('sustain', { on: d2 >= 64 })
  else if (cmd === 0xc0) midi.emit('program', { program: d1 })
}

midi.connect = async () => {
  if (!midi.supported) { midi.error = 'unsupported'; midi.emit('state'); return false }
  try {
    access = await navigator.requestMIDIAccess({ sysex: false })
    access.onstatechange = refresh
    midi.error = null
    refresh()
    return true
  } catch (err) {
    midi.error = err?.name === 'SecurityError' ? 'denied' : 'failed'
    midi.emit('state')
    return false
  }
}

midi.selectOutput = (id) => { settings.midiOut = id; saveSettings(); refresh() }
Object.defineProperty(midi, 'hasOutput', { get: () => !!midi.out })
Object.defineProperty(midi, 'connected', { get: () => midi.inputs.length > 0 })
Object.defineProperty(midi, 'deviceName', { get: () => midi.inputs[0]?.name || midi.out?.name || '' })

const send = (bytes) => { try { midi.out?.send(bytes) } catch { /* port closed */ } }
midi.sendOn = (n, v = 90, ch = 0) => send([0x90 | ch, n, v])
midi.sendOff = (n, ch = 0) => send([0x80 | ch, n, 0])
midi.programChange = (p, ch = 0) => send([0xc0 | ch, p])
midi.allNotesOff = (ch = 0) => send([0xb0 | ch, 123, 0])

/** Auto-connect silently if the user already granted permission on a previous visit. */
midi.autoConnect = async () => {
  if (!midi.supported) return
  try {
    const status = await navigator.permissions?.query({ name: 'midi' })
    if (status?.state === 'granted') await midi.connect()
  } catch { /* permissions API for midi not available – user taps Connect */ }
}
