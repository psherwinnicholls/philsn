// The exercise engine: name / staff / ear note drills, chord drills and scale walks.
import { $, esc, pick, pc, prettyName, noteName, chordName, kbRange, CHORDS, SCALES, ROOT_NAMES } from './util.js'
import { createKeyboard } from './keyboard.js'
import { input, held, appPlay } from './input.js'
import { synth } from './audio.js'
import { renderStaff } from './staff.js'
import { findActivity, progress } from './activities.js'

const PRAISE = ['Nice!', 'Yes!', 'Spot on!', 'Great!', 'Correct!', 'Got it!']

export function mountQuiz(root, id) {
  const cfg = findActivity(id)
  if (!cfg) { root.innerHTML = `<p class="empty">Activity not found. <a href="#/">Back</a></p>`; return () => {} }
  if (cfg.kind === 'scalepicker') return mountScalePicker(root)
  const h = {}
  run(root, cfg, h)
  return () => h.fn?.()
}

// ---------------------------------------------------------------- scale picker
function mountScalePicker(root) {
  const h = {}
  const state = { root: 0, scale: 'major', octaves: 1, dir: 'updown', guide: true }
  root.innerHTML = `
  <section class="form">
    <div class="bar"><a class="back" href="#/">‹ Back</a><h2>Scale builder</h2></div>
    <h3>Key</h3>
    <div class="chips" id="roots">${ROOT_NAMES.map((n, i) => `<button class="chip-btn" data-r="${i}">${n}</button>`).join('')}</div>
    <h3>Scale</h3>
    <select id="scale">${Object.entries(SCALES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('')}</select>
    <div class="row">
      <label>Octaves <select id="oct"><option value="1">1</option><option value="2">2</option></select></label>
      <label>Direction <select id="dir"><option value="up">Up</option><option value="updown">Up and back down</option></select></label>
    </div>
    <label class="check"><input id="guide" type="checkbox" checked> Highlight the next key</label>
    <button class="primary big" id="go">▶ Start</button>
  </section>`
  const paint = () => root.querySelectorAll('#roots button').forEach((b) => b.classList.toggle('on', +b.dataset.r === state.root))
  root.querySelectorAll('#roots button').forEach((b) => b.addEventListener('click', () => { state.root = +b.dataset.r; paint() }))
  $(root, '#dir').value = state.dir; paint()
  $(root, '#go').addEventListener('click', () => {
    state.scale = $(root, '#scale').value; state.octaves = +$(root, '#oct').value
    state.dir = $(root, '#dir').value; state.guide = $(root, '#guide').checked
    const base = 60 + state.root
    const iv = SCALES[state.scale].iv
    const up = []
    for (let o = 0; o < state.octaves; o++) iv.forEach((s) => up.push(base + o * 12 + s))
    up.push(base + state.octaves * 12)
    const seq = state.dir === 'up' ? up : [...up, ...up.slice(0, -1).reverse()]
    run(root, { id: 'scale-run', kind: 'seq', title: `${ROOT_NAMES[state.root]} ${SCALES[state.scale].label}`, seq, guide: state.guide, backTo: '#/quiz/scales', noProgress: true }, h)
  })
  return () => h.fn?.()
}

// ---------------------------------------------------------------- generic runner
function run(root, cfg, h) {
  const timers = new Set()
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn() }, ms); timers.add(t) }
  const offs = []
  let kb = null, done = false, started = false, tickTimer = null

  const [kbLow, kbHigh] = rangeFor(cfg)
  root.innerHTML = `
  <section class="quiz">
    <div class="bar"><a class="back" href="${cfg.backTo || '#/'}">‹ Back</a><h2>${esc(cfg.title)}</h2><div class="stats" id="stats"></div></div>
    <div class="prompt" id="prompt"></div>
    <div class="feedback" id="fb" aria-live="polite">&nbsp;</div>
    <div class="actions">
      <button id="b-ear" hidden>🔊 Hear it again</button>
      <button id="b-ref" hidden>Play C (reference)</button>
      <button id="b-hint">💡 Show me</button>
      <button id="b-skip" class="ghost">Skip</button>
    </div>
    <div class="stage"><div id="kbhost"></div><div class="overlay" id="ov"></div></div>
  </section>`
  const ov = $(root, '#ov'), promptEl = $(root, '#prompt'), fbEl = $(root, '#fb'), statsEl = $(root, '#stats')
  kb = createKeyboard($(root, '#kbhost'), { low: kbLow, high: kbHigh })

  const S = { round: 0, correct: 0, mistakes: 0, streak: 0, best: 0, tries: 0, target: null, locked: false, t0: 0, left: cfg.timeLimit || 0, idx: 0, evalWrong: false }
  const fb = (msg, cls = '') => { fbEl.className = 'feedback ' + cls; fbEl.innerHTML = msg || '&nbsp;' }
  const stats = () => {
    const parts = []
    if (cfg.kind === 'seq') parts.push(`${S.idx}/${cfg.seq.length}`)
    else if (cfg.rounds) parts.push(`${Math.min(S.round, cfg.rounds)}/${cfg.rounds}`)
    if (cfg.timeLimit) parts.push(`⏱ ${S.left}s`)
    if (cfg.kind !== 'seq') parts.push(`✔ ${S.correct}`)
    parts.push(`✖ ${S.mistakes}`)
    if (S.streak >= 3) parts.push(`🔥 ${S.streak}`)
    statsEl.textContent = parts.join('  ')
  }

  // ----- build the question pool -----
  const pool = []
  if (cfg.kind === 'note') for (let n = cfg.low; n <= cfg.high; n++) if (cfg.pcs.includes(pc(n))) pool.push(n)

  function hint() {
    if (cfg.kind === 'note') {
      kb.setTargets(cfg.anyOctave ? [...Array(kb.high - kb.low + 1)].map((_, i) => kb.low + i).filter((n) => pc(n) === pc(S.target)) : [S.target], 'hint')
    } else if (cfg.kind === 'chord') kb.setTargets(S.target.notes, 'hint')
    else if (cfg.kind === 'seq') kb.setTargets([cfg.seq[S.idx]], 'hint')
  }

  // ----- start overlay -----
  const intro = {
    note: cfg.display === 'ear' ? 'You will hear a note. Find it on your piano.' : cfg.display === 'staff' ? 'A note appears on the staff. Play it on your piano.' : cfg.anyOctave ? 'You will be asked for a note name. Play it in any octave.' : 'Play exactly the note you are asked for.',
    chord: 'You will be shown a chord name. Press all its notes together.',
    seq: 'Play the scale one note at a time, in order.',
  }[cfg.kind]
  $(root, '#ov').innerHTML = `<h3>${esc(cfg.title)}</h3><p>${intro}</p>${cfg.timeLimit ? `<p class="muted">${cfg.timeLimit} seconds on the clock</p>` : ''}<button class="primary big" id="go">▶ Start</button>`
  ov.classList.add('show')
  $(ov, '#go').addEventListener('click', begin)

  function begin() {
    synth.unlock(); ov.classList.remove('show'); started = true
    S.t0 = performance.now()
    if (cfg.timeLimit) tickTimer = setInterval(() => { S.left--; stats(); if (S.left <= 0) finish() }, 1000)
    if (cfg.kind === 'seq') seqPrompt(); else next()
    stats()
  }

  // ----- note questions -----
  function next() {
    if (done) return
    if (cfg.rounds && S.round >= cfg.rounds) return finish()
    S.round++; S.tries = 0; S.locked = false; S.evalWrong = false; kb.clear(); fb('')
    if (cfg.kind === 'note') {
      let n; do { n = pick(pool) } while (pool.length > 1 && n === S.target)
      S.target = n
      const nm = cfg.anyOctave ? prettyName(n) : prettyName(n, true)
      if (cfg.display === 'staff') promptEl.innerHTML = renderStaff(n, cfg.clef)
      else if (cfg.display === 'ear') promptEl.innerHTML = `<div class="big-emoji">🎧</div><div class="sub">Listen, then play that note</div>`
      else promptEl.innerHTML = `<div class="bignote">${nm}</div><div class="sub">${cfg.anyOctave ? 'Play it anywhere on the keyboard' : 'Middle C is C4'}</div>`
      $(root, '#b-ear').hidden = cfg.display !== 'ear'; $(root, '#b-ref').hidden = cfg.display !== 'ear'
      if (cfg.display === 'ear') later(() => appPlay(n, 1000), 300)
      kb.reveal(n)
    } else {
      const r = pick(cfg.roots), t = pick(cfg.types)
      const base = 60 + r
      S.target = { r, t, notes: CHORDS[t].iv.map((i) => base + i), pcs: new Set(CHORDS[t].iv.map((i) => (r + i) % 12)), name: `${ROOT_NAMES[r]} ${CHORDS[t].label}` }
      promptEl.innerHTML = `<div class="bignote">${S.target.name}</div><div class="sub">Press all ${S.target.pcs.size} notes together</div>`
    }
    stats()
  }
  const targetText = () => cfg.kind === 'note' ? (cfg.display === 'staff' ? noteName(S.target) : cfg.anyOctave ? prettyName(S.target) : prettyName(S.target, true)) : S.target.name

  function right() {
    S.locked = true; S.correct++; S.streak++; S.best = Math.max(S.best, S.streak)
    synth.ding(true); fb('✔ ' + pick(PRAISE), 'good'); stats()
    later(next, 750)
  }
  function wrong(msg) {
    S.mistakes++; S.streak = 0; S.tries++; synth.ding(false); fb(msg, 'bad'); stats()
    if (cfg.hints && S.tries >= 2) hint()
  }

  function onNote(e) {
    if (!started || done) return
    if (cfg.kind === 'note') {
      if (S.locked) return
      const ok = cfg.anyOctave ? pc(e.note) === pc(S.target) : e.note === S.target
      if (ok) { kb.flash(e.note, 'good', 600); right() } else {
        kb.flash(e.note, 'bad', 500)
        let msg = `That was <b>${prettyName(e.note, !cfg.anyOctave)}</b>.`
        if (!cfg.anyOctave && pc(e.note) === pc(S.target)) msg += ' Right note, wrong octave!'
        else if (cfg.display === 'ear' && !cfg.anyOctave) msg += e.note > S.target ? ' Too high – go lower.' : ' Too low – go higher.'
        else msg += ` Looking for <b>${targetText()}</b>.`
        wrong(msg)
      }
    } else if (cfg.kind === 'chord') {
      if (S.locked) return
      later(checkChord, 90)
    } else seqNote(e)
  }
  function checkChord() {
    if (S.locked || done) return
    const notes = [...held.keys()]
    if (notes.length < S.target.pcs.size) return
    const pcs = new Set(notes.map(pc))
    const ok = pcs.size === S.target.pcs.size && [...S.target.pcs].every((p) => pcs.has(p))
    if (ok) { notes.forEach((n) => kb.flash(n, 'good', 600)); right() }
    else if (!S.evalWrong) {
      S.evalWrong = true
      notes.forEach((n) => kb.flash(n, 'bad', 500))
      const got = chordName(notes)
      wrong(`${got ? `That sounds like <b>${got}</b>.` : 'Not quite.'} We want <b>${S.target.name}</b>.`)
    }
  }

  // ----- scale walks -----
  function seqPrompt() {
    const names = cfg.seq.map((n, i) => `<span class="${i < S.idx ? 'done' : i === S.idx ? 'cur' : ''}">${prettyName(n)}</span>`).join(' ')
    promptEl.innerHTML = `<div class="seqnotes">${names}</div>`
    if (cfg.guide) kb.setTargets([cfg.seq[S.idx]]); else kb.clear()
    kb.reveal(cfg.seq[S.idx]); stats()
  }
  function seqNote(e) {
    if (e.note === cfg.seq[S.idx]) {
      kb.flash(e.note, 'good', 300); S.idx++; fb('')
      if (S.idx >= cfg.seq.length) { synth.ding(true); return finish() }
      seqPrompt()
    } else {
      S.mistakes++; kb.flash(e.note, 'bad', 300)
      fb(`That was ${prettyName(e.note, true)} – next is <b>${prettyName(cfg.seq[S.idx])}</b>`, 'bad'); stats()
    }
  }

  // ----- buttons -----
  $(root, '#b-ear').addEventListener('click', () => S.target != null && appPlay(S.target, 1000))
  $(root, '#b-ref').addEventListener('click', () => appPlay(60, 900))
  $(root, '#b-hint').addEventListener('click', () => { if (started && !done) hint() })
  $(root, '#b-skip').addEventListener('click', () => { if (!started || done) return; if (cfg.kind === 'seq') { S.idx = 0; seqPrompt() } else { S.streak = 0; next() } })

  offs.push(input.on('noteon', onNote))
  offs.push(input.on('noteoff', () => { if (held.size === 0) S.evalWrong = false }))

  function finish() {
    if (done) return
    done = true; clearInterval(tickTimer); kb.clear()
    const secs = Math.round((performance.now() - S.t0) / 1000)
    let stars, lines, text
    if (cfg.kind === 'seq') {
      stars = S.mistakes === 0 ? 3 : S.mistakes <= 2 ? 2 : 1
      lines = [`${S.mistakes} wrong note${S.mistakes === 1 ? '' : 's'} · ${secs}s`]; text = `${S.mistakes} mistakes`
    } else {
      const att = S.correct + S.mistakes
      const acc = att ? Math.round((S.correct / att) * 100) : 0
      stars = S.correct === 0 ? 0 : acc >= 90 ? 3 : acc >= 70 ? 2 : 1
      lines = [`${S.correct} correct · ${S.mistakes} slips · ${acc}% accuracy`, `Longest streak: ${S.best}`]
      text = cfg.timeLimit ? `${S.correct} in ${cfg.timeLimit}s` : `${acc}%`
    }
    if (!cfg.noProgress) progress.record(cfg.id, stars, text)
    ov.innerHTML = `<h3>${stars === 3 ? 'Brilliant!' : stars === 2 ? 'Well done!' : stars === 1 ? 'Good effort!' : 'Keep going!'}</h3>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      ${lines.map((l) => `<p>${l}</p>`).join('')}
      <div class="row"><button class="primary" id="again">Again</button><a class="btn" href="${cfg.backTo || '#/'}">Done</a></div>`
    ov.classList.add('show')
    $(ov, '#again').addEventListener('click', () => { cleanup(); run(root, cfg, h) })
  }

  function cleanup() {
    done = true; clearInterval(tickTimer); timers.forEach(clearTimeout); offs.forEach((f) => f()); kb.destroy()
  }
  h.fn = cleanup
}

function rangeFor(cfg) {
  if (cfg.kind === 'note') {
    return kbRange(cfg.low, cfg.high)
  }
  if (cfg.kind === 'chord') return [60, 84]
  const lo = Math.min(...cfg.seq), hi = Math.max(...cfg.seq)
  return kbRange(lo, hi)
}
