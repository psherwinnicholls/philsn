// Make your own things: custom drills, recorded songs, typed-in songs.
import { $, esc, ROOT_NAMES, CHORDS, store } from './util.js'
import { createKeyboard } from './keyboard.js'
import { input, appPlay } from './input.js'
import { synth } from './audio.js'
import { saveDrill, getDrills, deleteDrill } from './activities.js'
import { parseSong, saveUserSong, getSongs, deleteUserSong } from './songs.js'

const PRESETS = {
  white: [0, 2, 4, 5, 7, 9, 11], black: [1, 3, 6, 8, 10], pentatonic: [0, 2, 4, 7, 9],
  all: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], cmaj: [0, 4, 7], gmaj: [7, 11, 2],
}
const uid = (p) => p + Date.now().toString(36)

export function mountCreate(root) {
  const cleanups = []
  root.innerHTML = `
  <section class="form create">
    <div class="hero"><h1>Create</h1><p>Make drills and songs that fit exactly what you want to practise.</p></div>
    <div class="seg tabs2" id="tabs"><button data-t="drill">Custom drill</button><button data-t="record">Record a song</button><button data-t="write">Type a song</button></div>
    <div id="pane"></div>
    <div id="mine"></div>
  </section>`
  const pane = $(root, '#pane')
  let tab = store.get('createTab', 'drill'), cleanPane = () => {}
  const show = (t) => {
    tab = t; store.set('createTab', t); cleanPane(); cleanPane = () => {}
    root.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t))
    cleanPane = (t === 'drill' ? drillPane : t === 'record' ? recordPane : writePane)(pane, renderMine) || (() => {})
  }
  root.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => show(b.dataset.t)))

  function renderMine() {
    const drills = getDrills(), songs = getSongs().filter((s) => s.custom || s.id.startsWith('u:'))
    $(root, '#mine').innerHTML = (drills.length || songs.length) ? `<h3>Saved</h3><div class="cards">
      ${drills.map((d) => `<div class="card"><span class="ico">⭐</span><a class="txt" href="#/quiz/${d.id}"><b>${esc(d.title)}</b><small>Drill</small></a><button class="del" data-d="${d.id}">🗑</button></div>`).join('')}
      ${songs.map((s) => `<div class="card"><span class="ico">🎵</span><a class="txt" href="#/play/${encodeURIComponent(s.id)}"><b>${esc(s.title)}</b><small>Song</small></a><button class="del" data-s="${esc(s.id)}">🗑</button></div>`).join('')}</div>` : ''
    root.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { deleteDrill(b.dataset.d); renderMine() }))
    root.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { deleteUserSong(b.dataset.s); renderMine() }))
  }
  renderMine(); show(tab)
  return () => { cleanPane(); cleanups.forEach((f) => f()) }
}

// ------------------------------------------------------------------ drill builder
function drillPane(pane, onSaved) {
  const sel = new Set(PRESETS.white)
  const chordTypes = new Set(['major', 'minor'])
  pane.innerHTML = `
    <label>Name <input id="name" type="text" maxlength="40" placeholder="e.g. Black keys, treble only"></label>
    <label>Type
      <select id="type">
        <option value="name">Name the key – shown a note name</option>
        <option value="staff-treble">Read the staff – treble clef</option>
        <option value="staff-bass">Read the staff – bass clef</option>
        <option value="staff-grand">Read the staff – both clefs</option>
        <option value="ear">Ear training – hear a note, play it</option>
        <option value="chord">Chords</option>
      </select></label>
    <div id="notesec">
      <h3>Notes to include</h3>
      <div class="chips" id="pcs">${ROOT_NAMES.map((n, i) => `<button class="chip-btn" data-p="${i}">${n}</button>`).join('')}</div>
      <div class="chips small">${Object.keys({ white: 1, black: 1, pentatonic: 1, all: 1 }).map((k) => `<button data-preset="${k}">${k}</button>`).join('')}</div>
    </div>
    <div id="chordsec" hidden>
      <h3>Chord types</h3>
      <div class="chips" id="ctypes">${Object.entries(CHORDS).map(([k, c]) => `<button class="chip-btn" data-c="${k}">${c.label}</button>`).join('')}</div>
      <h3>Root notes</h3><p class="muted">Uses the notes chosen above as chord roots (pick them first).</p>
    </div>
    <div class="row" id="rangesec">
      <label>Lowest octave <select id="lo">${[1, 2, 3, 4, 5, 6].map((o) => `<option value="${o}" ${o === 4 ? 'selected' : ''}>C${o}</option>`).join('')}</select></label>
      <label>Highest octave <select id="hi">${[1, 2, 3, 4, 5, 6].map((o) => `<option value="${o}" ${o === 5 ? 'selected' : ''}>B${o}</option>`).join('')}</select></label>
    </div>
    <label class="check" id="anyrow"><input id="any" type="checkbox" checked> Any octave counts (name mode)</label>
    <div class="row">
      <label>Length <select id="len"><option value="r:10">10 questions</option><option value="r:20">20 questions</option><option value="r:40">40 questions</option><option value="t:30">30 seconds</option><option value="t:60" selected>60 seconds</option><option value="t:120">2 minutes</option></select></label>
      <label class="check"><input id="hints" type="checkbox" checked> Show hints after 2 slips</label>
    </div>
    <div class="row"><button class="primary" id="save">Save &amp; play</button><span class="muted" id="msg"></span></div>`
  const paint = () => {
    pane.querySelectorAll('#pcs button').forEach((b) => b.classList.toggle('on', sel.has(+b.dataset.p)))
    pane.querySelectorAll('#ctypes button').forEach((b) => b.classList.toggle('on', chordTypes.has(b.dataset.c)))
    const type = $(pane, '#type').value
    $(pane, '#chordsec').hidden = type !== 'chord'
    $(pane, '#rangesec').hidden = type === 'chord'
    $(pane, '#anyrow').hidden = type !== 'name'
  }
  pane.querySelectorAll('#pcs button').forEach((b) => b.addEventListener('click', () => { const p = +b.dataset.p; sel.has(p) ? sel.delete(p) : sel.add(p); paint() }))
  pane.querySelectorAll('#ctypes button').forEach((b) => b.addEventListener('click', () => { const c = b.dataset.c; chordTypes.has(c) ? chordTypes.delete(c) : chordTypes.add(c); paint() }))
  pane.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { sel.clear(); PRESETS[b.dataset.preset].forEach((p) => sel.add(p)); paint() }))
  $(pane, '#type').addEventListener('change', paint)
  $(pane, '#save').addEventListener('click', () => {
    const msg = $(pane, '#msg'), type = $(pane, '#type').value
    if (!sel.size) return (msg.textContent = 'Pick at least one note.')
    if (type === 'chord' && !chordTypes.size) return (msg.textContent = 'Pick at least one chord type.')
    let lo = +$(pane, '#lo').value, hi = +$(pane, '#hi').value
    if (hi < lo) [lo, hi] = [hi, lo]
    const [kind, v] = $(pane, '#len').value.split(':')
    const d = { id: uid('c:'), title: $(pane, '#name').value.trim() || 'My drill', hints: $(pane, '#hints').checked, [kind === 'r' ? 'rounds' : 'timeLimit']: +v }
    if (type === 'chord') Object.assign(d, { kind: 'chord', roots: [...sel], types: [...chordTypes] })
    else {
      Object.assign(d, { kind: 'note', pcs: [...sel], low: (lo + 1) * 12, high: (hi + 1) * 12 + 11 })
      if (type === 'name') Object.assign(d, { display: 'name', anyOctave: $(pane, '#any').checked })
      else if (type === 'ear') Object.assign(d, { display: 'ear', anyOctave: false })
      else Object.assign(d, { display: 'staff', clef: type.split('-')[1], anyOctave: false })
    }
    saveDrill(d); onSaved(); location.hash = '#/quiz/' + d.id
  })
  paint()
}

// ------------------------------------------------------------------ recorder
function recordPane(pane, onSaved) {
  let bpm = store.get('recBpm', 90), phase = 'idle', events = [], t0 = 0, metro = null
  const down = new Map()
  pane.innerHTML = `
    <p class="muted">Play a tune (a melody works best), stop, and it becomes a song you can practise with falling notes. Timing is tidied to the nearest quarter-beat.</p>
    <div class="row">
      <label>Tempo <input id="bpm" type="number" min="40" max="200" value="${bpm}"> bpm</label>
      <button class="primary" id="rec">● Record</button>
      <button id="stop" disabled>■ Stop</button>
    </div>
    <div class="recstatus" id="rs">Press Record. You get a 4-beat count-in.</div>
    <div id="kbhost"></div>
    <div id="after" hidden>
      <label>Song name <input id="title" type="text" maxlength="40" value="My tune"></label>
      <div class="row"><button id="prev">▶ Preview</button><button class="primary" id="save">Save song</button></div>
    </div>`
  const kb = createKeyboard($(pane, '#kbhost'), { low: 48, high: 84 })
  const rs = $(pane, '#rs')
  const stopMetro = () => { clearInterval(metro); metro = null }
  $(pane, '#rec').addEventListener('click', () => {
    synth.unlock(); bpm = +$(pane, '#bpm').value || 90; store.set('recBpm', bpm)
    events = []; down.clear(); phase = 'count'; $(pane, '#after').hidden = true
    $(pane, '#rec').disabled = true; $(pane, '#stop').disabled = false
    let beat = 0; rs.textContent = 'Count-in… 4'
    synth.click(true)
    metro = setInterval(() => {
      beat++
      if (beat < 4) { synth.click(false); rs.textContent = `Count-in… ${4 - beat}` }
      else { if (beat === 4) { phase = 'rec'; t0 = performance.now(); rs.textContent = '● Recording – play your tune' } synth.click(beat % 4 === 0) }
    }, 60000 / bpm)
  })
  const stop = () => {
    stopMetro()
    const wasRec = phase === 'rec'
    phase = 'idle'; $(pane, '#rec').disabled = false; $(pane, '#stop').disabled = true
    for (const [, ev] of down) ev.dur = Math.max(0.25, ev.dur ?? (performance.now() - t0) / 60000 * bpm - ev.start)
    down.clear()
    if (!wasRec || !events.length) { rs.textContent = 'Nothing recorded. Press Record to try again.'; return }
    const q = (x) => Math.round(x * 4) / 4
    const first = Math.min(...events.map((e) => q(e.start)))
    events = events.map((e) => ({ note: e.note, start: q(e.start) - first, dur: Math.max(0.25, q(e.dur)) })).sort((a, b) => a.start - b.start)
    rs.textContent = `Recorded ${events.length} notes. Preview or save it!`
    $(pane, '#after').hidden = false
  }
  $(pane, '#stop').addEventListener('click', stop)
  const bps = () => bpm / 60
  $(pane, '#prev').addEventListener('click', () => events.forEach((e) => setTimeout(() => appPlay(e.note, (e.dur / bps()) * 900), (e.start / bps()) * 1000)))
  $(pane, '#save').addEventListener('click', () => {
    const title = $(pane, '#title').value.trim() || 'My tune'
    saveUserSong({ id: uid('u:'), title, composer: 'Recorded by me', level: 0, bpm, events })
    rs.textContent = `Saved “${title}”. Find it under Songs → Mine.`; $(pane, '#after').hidden = true; onSaved()
  })
  const offs = [
    input.on('noteon', (e) => { if (phase !== 'rec') return; const ev = { note: e.note, start: ((e.time - t0) / 60000) * bpm, dur: undefined }; if (ev.start < -0.1) return; events.push(ev); down.set(e.note, ev) }),
    input.on('noteoff', (e) => { const ev = down.get(e.note); if (ev && phase === 'rec') { ev.dur = ((performance.now() - t0) / 60000) * bpm - ev.start; down.delete(e.note) } }),
  ]
  return () => { stopMetro(); offs.forEach((f) => f()); kb.destroy() }
}

// ------------------------------------------------------------------ type a song
function writePane(pane, onSaved) {
  pane.innerHTML = `
    <p class="muted">Write notes separated by spaces: <code>C4 D4 E4:2</code>. After the colon is the length in beats (default 1). <code>R:1</code> is a rest, <code>[C4 E4 G4]:2</code> is a chord, <code>F#4</code> / <code>Bb3</code> for black keys.</p>
    <label>Song name <input id="title" type="text" maxlength="40" value="My song"></label>
    <label>Tempo <input id="bpm" type="number" min="40" max="200" value="100"> bpm</label>
    <textarea id="score" rows="6" spellcheck="false">C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2</textarea>
    <div class="muted" id="check"></div>
    <div class="row"><button id="prev">▶ Preview</button><button class="primary" id="save">Save song</button></div>`
  const check = () => {
    const { events, errors, beats } = parseSong($(pane, '#score').value)
    $(pane, '#check').textContent = errors.length ? `Can't read: ${errors.slice(0, 5).join(', ')}` : events.length ? `${events.length} notes · ${beats} beats` : 'Add some notes.'
    return { events, errors }
  }
  $(pane, '#score').addEventListener('input', check); check()
  $(pane, '#prev').addEventListener('click', () => {
    synth.unlock(); const { events } = check(); const bps = (+$(pane, '#bpm').value || 100) / 60
    events.forEach((e) => setTimeout(() => appPlay(e.note, (e.dur / bps) * 900), (e.start / bps) * 1000))
  })
  $(pane, '#save').addEventListener('click', () => {
    const { events, errors } = check(); if (errors.length || !events.length) return
    saveUserSong({ id: uid('u:'), title: $(pane, '#title').value.trim() || 'My song', composer: 'Written by me', level: 0, bpm: +$(pane, '#bpm').value || 100, events })
    $(pane, '#check').textContent = 'Saved! Find it under Songs → Mine.'; onSaved()
  })
}
