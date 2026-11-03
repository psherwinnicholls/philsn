import { $, esc, settings, saveSettings, chordName, noteName, store } from './util.js'
import { createKeyboard } from './keyboard.js'
import { input, held, setHarmony, releaseAll } from './input.js'
import { synth, PRESET_LIST, applyFx } from './audio.js'
import { midi } from './midi.js'

const LAYERS = [
  { id: 'single', label: 'Single note', o: [0] },
  { id: 'oct-up', label: '+ Octave up', o: [0, 12] },
  { id: 'oct-down', label: '+ Octave down', o: [0, -12] },
  { id: 'fifth', label: '+ Fifth', o: [0, 7] },
  { id: 'major', label: 'Major chord', o: [0, 4, 7] },
  { id: 'minor', label: 'Minor chord', o: [0, 3, 7] },
  { id: 'seventh', label: 'Major 7th', o: [0, 4, 7, 11] },
  { id: 'power', label: 'Power chord', o: [0, 7, 12] },
]
const SLIDERS = [
  ['volume', 'Volume', 0, 1, 0.01], ['attack', 'Attack (slow fade-in)', 0, 1.5, 0.01], ['release', 'Release (tail)', 0, 3, 0.01],
  ['bright', 'Brightness', 0, 1, 0.01], ['reverb', 'Reverb', 0, 1, 0.01], ['echo', 'Echo', 0, 1, 0.01],
]

export function mountLab(root) {
  let layer = store.get('layer', 'single'), program = store.get('program', 1)
  root.innerHTML = `
  <section class="lab">
    <div class="hero"><h1>Sound lab</h1><p>Shape the sound, stack layers and just play.</p></div>
    <div class="now" id="now"><span class="chordname">Play something…</span><span class="notes"></span></div>
    <div id="kbhost"></div>

    <h3>Layers <small class="muted">(extra notes added to every key you press)</small></h3>
    <div class="chips">${LAYERS.map((l) => `<button class="chip-btn" data-layer="${l.id}">${l.label}</button>`).join('')}</div>

    <h3>This app's sounds <small class="muted">(play from this device)</small></h3>
    <div class="chips">${PRESET_LIST.map((p) => `<button class="chip-btn" data-preset="${p.id}">${p.label}</button>`).join('')}</div>
    <div class="row" id="waverow"><label>Wave <select id="wave">${['sine', 'triangle', 'sawtooth', 'square'].map((w) => `<option>${w}</option>`).join('')}</select></label>
      <label>Octave <select id="octave">${[-2, -1, 0, 1, 2].map((o) => `<option value="${o}">${o > 0 ? '+' + o : o}</option>`).join('')}</select></label></div>
    <div class="sliders">${SLIDERS.map(([k, label, min, max, step]) => `<label class="slider">${label}<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}"></label>`).join('')}</div>
    <label class="check"><input type="checkbox" id="thru"> Also play my piano's keys through this device <small class="muted">(turn the piano's volume down so you hear the app's sound instead)</small></label>
    <button class="ghost" id="reset">Reset sound</button>

    <h3>The piano's own sounds</h3>
    <p class="muted">Sends a MIDI "program change" to the piano. The numbers follow the piano's sound list (see the MIDI section of the CS-11 manual) – experiment!</p>
    <div class="row prog">
      <button id="p-dn" aria-label="Previous">‹</button><output id="p-out"></output><button id="p-up" aria-label="Next">›</button>
      <button class="primary" id="p-test">Play C major</button>
    </div>
    <p class="muted" id="prog-note"></p>
  </section>`
  const kb = createKeyboard($(root, '#kbhost'), { low: 48, high: 84 })
  kb.scroller.scrollLeft = 0

  const apply = () => {
    const l = LAYERS.find((x) => x.id === layer) || LAYERS[0]
    setHarmony(l.o); store.set('layer', layer)
    root.querySelectorAll('[data-layer]').forEach((b) => b.classList.toggle('on', b.dataset.layer === layer))
    root.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('on', b.dataset.preset === settings.preset))
    $(root, '#waverow').style.display = settings.preset === 'synth' ? 'flex' : 'none'
    $(root, '#wave').value = settings.wave; $(root, '#octave').value = settings.octave
    root.querySelectorAll('input[data-k]').forEach((i) => { i.value = settings[i.dataset.k] })
    $(root, '#thru').checked = settings.thru
    $(root, '#p-out').textContent = 'Sound ' + program
    $(root, '#prog-note').textContent = midi.hasOutput ? `Sending to: ${midi.out.name}` : 'Connect your piano (Settings) to use this.'
    applyFx()
  }
  root.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => { layer = b.dataset.layer; apply() }))
  root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { settings.preset = b.dataset.preset; saveSettings(); apply(); synth.noteOn(60, 90); setTimeout(() => synth.noteOff(60), 400) }))
  $(root, '#wave').addEventListener('change', (e) => { settings.wave = e.target.value; saveSettings() })
  $(root, '#octave').addEventListener('change', (e) => { settings.octave = +e.target.value; saveSettings() })
  root.querySelectorAll('input[data-k]').forEach((i) => i.addEventListener('input', () => { settings[i.dataset.k] = +i.value; saveSettings(); applyFx() }))
  $(root, '#thru').addEventListener('change', (e) => { settings.thru = e.target.checked; saveSettings() })
  $(root, '#reset').addEventListener('click', () => { Object.assign(settings, { preset: 'piano', wave: 'sawtooth', attack: 0, release: 0, bright: 0.5, reverb: 0.2, echo: 0, octave: 0 }); layer = 'single'; saveSettings(); apply() })
  const sendProgram = () => { store.set('program', program); midi.programChange(program - 1); apply() }
  $(root, '#p-dn').addEventListener('click', () => { program = Math.max(1, program - 1); sendProgram() })
  $(root, '#p-up').addEventListener('click', () => { program = Math.min(128, program + 1); sendProgram() })
  $(root, '#p-test').addEventListener('click', () => {
    const c = [60, 64, 67]; c.forEach((n) => midi.sendOn(n, 90)); setTimeout(() => c.forEach((n) => midi.sendOff(n)), 1200)
    if (!midi.hasOutput) c.forEach((n) => { synth.noteOn(n, 90); setTimeout(() => synth.noteOff(n), 1200) })
  })

  const now = $(root, '#now')
  const showChord = () => {
    const notes = [...held.keys()].sort((a, b) => a - b)
    const name = notes.length > 1 ? chordName(notes) : null
    now.innerHTML = `<span class="chordname">${notes.length ? esc(name || (notes.length === 1 ? noteName(notes[0]) : '…')) : 'Play something…'}</span><span class="notes">${notes.map((n) => noteName(n)).join(' · ')}</span>`
  }
  const offs = [input.on('noteon', showChord), input.on('noteoff', showChord), midi.on('state', apply)]
  apply()
  return () => { offs.forEach((f) => f()); setHarmony([0]); releaseAll(); kb.destroy() }
}
