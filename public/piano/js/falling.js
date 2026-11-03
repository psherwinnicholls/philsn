// Guitar-Hero-style player: notes fall onto the keyboard; play them as they land.
import { $, esc, kbRange, store, settings, clamp } from './util.js'
import { createKeyboard } from './keyboard.js'
import { input, appPlay } from './input.js'
import { synth } from './audio.js'
import { getSong, LEVELS } from './songs.js'

const LOOKAHEAD = 5 // beats visible above the keys
const COUNT_IN = 3
const PERFECT = 0.09, GOOD = 0.22 // seconds
const MODES = {
  wait: { label: 'Wait for me', hint: 'The song pauses until you play the right notes. Best for learning.' },
  play: { label: 'Play along', hint: 'The song keeps moving. Hit notes as they land for points and combos.' },
  demo: { label: 'Listen', hint: 'Hear the song played back so you know how it sounds.' },
}

export function mountPlay(root, songId) {
  const song = getSong(songId)
  if (!song || !song.events.length) {
    root.innerHTML = `<p class="empty">Song not found. <a href="#/songs">Back to songs</a></p>`
    return () => {}
  }
  const events = song.events.map((e) => ({ ...e, hit: null }))
  const lo = Math.min(...events.map((e) => e.note)), hi = Math.max(...events.map((e) => e.note))
  const [low, high] = kbRange(lo, hi)
  const lastEnd = Math.max(...events.map((e) => e.start + e.dur))
  const bests = store.get('best', {})

  let mode = store.get('playMode', 'wait')
  let speed = store.get('playSpeed', 1)
  let metro = store.get('playMetro', false)
  let state = 'idle' // idle | running | paused | done
  let pos = 0, lastFrame = 0, raf = 0, lastBeat = 0, demoIdx = 0, catchUp = -Infinity
  let score = 0, combo = 0, maxCombo = 0, perfect = 0, good = 0, miss = 0, wrong = 0, hits = 0
  let targetKey = ''

  root.innerHTML = `
  <section class="play">
    <div class="bar">
      <a class="back" href="#/songs">‹ Songs</a>
      <h2>${esc(song.title)}</h2>
      <div class="stats"><span id="s-score">0</span> pts <b id="s-combo"></b></div>
    </div>
    <div class="playctl">
      <div class="seg" id="modes">${Object.entries(MODES).map(([k, m]) => `<button data-mode="${k}">${m.label}</button>`).join('')}</div>
      <label class="slider">Speed <input id="speed" type="range" min="0.4" max="1.25" step="0.05"><output id="speed-out"></output></label>
      <label class="check"><input id="metro" type="checkbox"> Click</label>
      <button id="pause" class="ghost" disabled>⏸ Pause</button>
    </div>
    <div class="stage">
      <div id="kbhost"></div>
      <div class="judge" id="judge"></div>
      <div class="overlay" id="ov"></div>
    </div>
  </section>`

  const ov = $(root, '#ov'), judgeEl = $(root, '#judge')
  const kb = createKeyboard($(root, '#kbhost'), { low, high })
  const canvasWrap = document.createElement('div'); canvasWrap.className = 'fall-wrap'
  const canvas = document.createElement('canvas'); canvasWrap.append(canvas)
  kb.mountAbove(canvasWrap)
  const g = canvas.getContext('2d')
  let H = 300
  function resize() {
    H = clamp(Math.round(window.innerHeight * 0.4), 200, 380)
    const w = kb.width, dpr = window.devicePixelRatio || 1
    canvas.style.width = w + 'px'; canvas.style.height = H + 'px'
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(H * dpr)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw()
  }
  const offLayout = kb.onLayout(resize)

  const bps = () => (song.bpm * speed) / 60
  const resetRun = () => {
    events.forEach((e) => { e.hit = null })
    pos = -COUNT_IN; lastBeat = Math.floor(pos); demoIdx = 0; catchUp = -Infinity
    score = combo = maxCombo = perfect = good = miss = wrong = hits = 0
    kb.clear(); targetKey = ''; updateStats()
  }

  // ---------- UI ----------
  function syncControls() {
    root.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode))
    $(root, '#speed').value = speed; $(root, '#speed-out').textContent = Math.round(speed * 100) + '%'
    $(root, '#metro').checked = metro
    $(root, '#pause').disabled = state !== 'running' && state !== 'paused'
    $(root, '#pause').textContent = state === 'paused' ? '▶ Resume' : '⏸ Pause'
  }
  root.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => {
    if (state === 'running') return
    mode = b.dataset.mode; store.set('playMode', mode); showStart(); syncControls()
  }))
  $(root, '#speed').addEventListener('input', (e) => {
    speed = +e.target.value; store.set('playSpeed', speed); $(root, '#speed-out').textContent = Math.round(speed * 100) + '%'
  })
  $(root, '#metro').addEventListener('change', (e) => { metro = e.target.checked; store.set('playMetro', metro) })
  $(root, '#pause').addEventListener('click', () => {
    if (state === 'running') { state = 'paused'; showOverlay(`<h3>Paused</h3><div class="row"><button class="primary" id="resume">Resume</button><button id="restart">Restart</button></div>`) ; bindOv() }
    else if (state === 'paused') resume()
    syncControls()
  })
  function bindOv() {
    $(ov, '#resume')?.addEventListener('click', resume)
    $(ov, '#restart')?.addEventListener('click', () => { cancelAnimationFrame(raf); state = 'idle'; showStart(); syncControls() })
    $(ov, '#start')?.addEventListener('click', start)
  }
  function showOverlay(html) { ov.innerHTML = html; ov.classList.add('show') }
  function hideOverlay() { ov.classList.remove('show') }
  function showStart() {
    const b = bests[`${song.id}:${mode}`]
    showOverlay(`<h3>${esc(song.title)}</h3>
      <p class="muted">${esc(song.composer || '')} · ${LEVELS[song.level ?? 0]}</p>
      <p>${MODES[mode].hint}</p>
      ${b ? `<p class="muted">Best: ${'★'.repeat(b.stars)}${'☆'.repeat(3 - b.stars)} ${b.text}</p>` : ''}
      <button class="primary big" id="start">▶ Start</button>`)
    bindOv()
  }

  function updateStats() {
    $(root, '#s-score').textContent = score
    $(root, '#s-combo').textContent = combo >= 3 ? `${combo}× combo` : ''
  }
  function judge(text, cls) {
    judgeEl.className = 'judge'; void judgeEl.offsetWidth
    judgeEl.textContent = text; judgeEl.className = 'judge pop ' + cls
  }

  // ---------- run control ----------
  function start() {
    synth.unlock()
    resetRun(); hideOverlay(); state = 'running'; lastFrame = performance.now()
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); syncControls()
  }
  function resume() { hideOverlay(); state = 'running'; lastFrame = performance.now(); raf = requestAnimationFrame(frame); syncControls() }

  function finish() {
    state = 'done'; syncControls(); kb.clear()
    if (mode === 'demo') {
      showOverlay(`<h3>That's the song!</h3><div class="row"><button class="primary" id="restart">Back</button></div>`); bindOv(); return
    }
    const total = events.length
    let stars, text
    if (mode === 'wait') {
      const rate = wrong / total
      stars = wrong === 0 ? 3 : rate <= 0.15 ? 2 : 1
      text = `${wrong} wrong note${wrong === 1 ? '' : 's'}`
    } else {
      const acc = Math.round(((perfect + good * 0.6) / total) * 100)
      stars = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 40 ? 1 : 0
      text = `${acc}% · ${score} pts`
    }
    const key = `${song.id}:${mode}`
    const prev = bests[key]
    if (!prev || stars > prev.stars || (stars === prev.stars && mode === 'play' && parseInt(text) > parseInt(prev.text))) {
      bests[key] = { stars, text }; store.set('best', bests)
    }
    showOverlay(`<h3>${stars === 3 ? 'Brilliant!' : stars === 2 ? 'Great playing!' : stars === 1 ? 'Nice work!' : 'Keep practising!'}</h3>
      <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <p>${mode === 'play' ? `Perfect ${perfect} · Good ${good} · Missed ${miss}<br>Best combo ${maxCombo}` : `Mistakes: ${wrong}`}</p>
      <p class="muted">${text}</p>
      <div class="row"><button class="primary" id="start">Play again</button><a class="btn" href="#/songs">Songs</a></div>`)
    bindOv()
  }

  // ---------- main loop ----------
  function waitGroup() {
    const next = events.find((e) => e.hit == null)
    if (!next) return null
    return { t: next.start, notes: events.filter((e) => e.hit == null && Math.abs(e.start - next.start) < 1e-6) }
  }

  function frame(now) {
    if (state !== 'running') return
    const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now
    if (document.hidden) { state = 'paused'; showOverlay(`<h3>Paused</h3><button class="primary" id="resume">Resume</button>`); bindOv(); syncControls(); return }

    // in wait mode, if you played ahead of the falling notes, whizz forward to catch up
    let next = pos + dt * bps() * (mode === 'wait' && pos < catchUp ? 6 : 1)
    if (mode === 'wait' && pos < catchUp) next = Math.min(next, catchUp)
    if (mode === 'wait' && pos >= -COUNT_IN) {
      const grp = waitGroup()
      if (grp && next > grp.t) next = Math.max(pos, grp.t)
    }
    pos = next

    // click track
    const b = Math.floor(pos)
    if (b > lastBeat) { if (pos < 0 || (metro && mode !== 'demo')) synth.click(((b % 4) + 4) % 4 === 0); lastBeat = b }

    if (mode === 'play') {
      const missBeats = GOOD * bps()
      for (const e of events) if (e.hit == null && pos > e.start + missBeats) { e.hit = 'miss'; miss++; combo = 0; judge('Miss', 'miss'); updateStats() }
    }
    if (mode === 'demo') {
      while (demoIdx < events.length && events[demoIdx].start <= pos) {
        const e = events[demoIdx++]
        appPlay(e.note, Math.max(120, (e.dur / bps()) * 1000 * 0.92)); kb.flash(e.note, 'target', 250)
      }
    }

    // highlight what's coming up on the keyboard
    let upcoming = []
    if (mode === 'wait') { const grp = waitGroup(); if (grp && grp.t - pos < 1.5) upcoming = grp.notes.map((e) => e.note) }
    else if (mode === 'play') upcoming = events.filter((e) => e.hit == null && e.start - pos < 0.6 && e.start - pos > -0.3).map((e) => e.note)
    const key = upcoming.join(',')
    if (key !== targetKey && mode !== 'demo') { targetKey = key; kb.setTargets(upcoming) }

    draw()
    if (mode === 'demo') {
      if (demoIdx >= events.length && pos > lastEnd + 0.5) { finish(); return }
    } else if (events.every((e) => e.hit != null)) {
      if (!finish.timer) finish.timer = setTimeout(() => { finish.timer = 0; if (state === 'running') finish() }, 500)
    }
    raf = requestAnimationFrame(frame)
  }

  const HUES = [0, 20, 40, 60, 90, 130, 160, 190, 215, 245, 275, 310]
  function draw() {
    const w = kb.width
    g.clearRect(0, 0, w, H)
    // lane guides on white-key boundaries
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1
    for (let n = kb.low; n <= kb.high; n++) { const k = kb.geom(n); if (!k.black) { g.beginPath(); g.moveTo(k.x, 0); g.lineTo(k.x, H); g.stroke() } }
    const ppb = H / LOOKAHEAD
    for (const e of events) {
      const bottom = H - (e.start - pos) * ppb, top = H - (e.start + e.dur - pos) * ppb
      if (bottom < -4 || top > H) continue
      const k = kb.geom(e.note); if (!kb.has(e.note)) continue
      const inset = k.black ? 1 : 3
      const x = k.x + inset, ww = k.w - inset * 2
      const y = top, h = Math.max(16, bottom - top - 3)
      const hue = HUES[((e.note % 12) + 12) % 12]
      if (e.hit === 'perfect' || e.hit === 'good') { g.fillStyle = 'rgba(52,211,153,.28)' }
      else if (e.hit === 'miss') { g.fillStyle = 'rgba(148,163,184,.25)' }
      else { g.fillStyle = `hsl(${hue} 85% ${k.black ? 48 : 58}%)` }
      roundRect(g, x, y, ww, h, 6); g.fill()
      if (e.hit == null) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; roundRect(g, x, y, ww, h, 6); g.stroke() }
    }
    // hit line
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, H - 3, w, 3)
    if (pos < 0 && state === 'running') {
      g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '700 64px system-ui,sans-serif'; g.textAlign = 'center'
      g.fillText(String(Math.ceil(-pos)), w / 2, H / 2 + 20)
    }
  }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); c.beginPath()
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
  }

  // ---------- judging input ----------
  const offIn = input.on('noteon', (e) => {
    if (state !== 'running' || mode === 'demo' || pos < -0.5) return
    const note = e.note
    if (mode === 'wait') {
      const grp = waitGroup()
      const hitEv = grp && grp.notes.find((x) => x.note === note)
      if (hitEv) { hitEv.hit = 'perfect'; hits++; if (grp.notes.every((x) => x.hit != null)) catchUp = Math.max(catchUp, grp.t); kb.flash(note, 'good', 300); combo++; maxCombo = Math.max(maxCombo, combo); score += 100; updateStats() }
      else { wrong++; combo = 0; kb.flash(note, 'bad', 300); judge('Oops', 'miss'); updateStats() }
      return
    }
    const p = pos + ((e.time - settings.timingOffset - lastFrame) / 1000) * bps()
    let best = null, bestD = Infinity
    for (const ev of events) {
      if (ev.hit != null || ev.note !== note) continue
      const d = Math.abs(ev.start - p) / bps()
      if (d < bestD) { best = ev; bestD = d }
    }
    if (best && bestD <= GOOD) {
      const perfectHit = bestD <= PERFECT
      best.hit = perfectHit ? 'perfect' : 'good'; perfectHit ? perfect++ : good++
      combo++; maxCombo = Math.max(maxCombo, combo)
      score += (perfectHit ? 100 : 50) * (1 + Math.min(3, Math.floor(combo / 10)))
      kb.flash(note, 'good', 250); judge(perfectHit ? 'Perfect!' : 'Good', perfectHit ? 'perfect' : 'good'); updateStats()
    } else { wrong++; kb.flash(note, 'bad', 250) }
  })

  syncControls(); resize(); showStart()
  return () => {
    cancelAnimationFrame(raf); clearTimeout(finish.timer); finish.timer = 0
    state = 'idle'; offIn(); offLayout(); kb.destroy()
  }
}
