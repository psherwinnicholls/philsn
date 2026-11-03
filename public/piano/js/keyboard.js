// Responsive on-screen piano. Reacts to every input source and can be played by touch/mouse.
import { isBlack, noteName, pc, settings, settingsBus } from './util.js'
import { input, held, noteOn, noteOff } from './input.js'

const MIN_KEY = 26 // px; below this the keyboard scrolls sideways
const KEYMAP = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75, ';': 76 }

export function createKeyboard(host, { low = 60, high = 84, base = 60 } = {}) {
  while (isBlack(low)) low--
  while (isBlack(high)) high++
  const whites = []
  for (let n = low; n <= high; n++) if (!isBlack(n)) whites.push(n)
  const W = whites.length
  const idx = new Map(whites.map((n, i) => [n, i]))

  host.innerHTML = ''
  const scroller = document.createElement('div'); scroller.className = 'kb-scroll'
  const inner = document.createElement('div'); inner.className = 'kb'
  scroller.append(inner); host.append(scroller)

  const keys = new Map()
  for (let n = low; n <= high; n++) {
    const k = document.createElement('div')
    k.dataset.note = n
    const black = isBlack(n)
    k.className = 'key ' + (black ? 'black' : 'white')
    if (black) {
      k.style.left = ((idx.get(n - 1) + 1 - 0.3) / W) * 100 + '%'
      k.style.width = (0.6 / W) * 100 + '%'
    } else {
      k.style.left = (idx.get(n) / W) * 100 + '%'
      k.style.width = (1 / W) * 100 + '%'
      const label = document.createElement('span')
      label.className = 'lbl' + (pc(n) === 0 ? ' c' : '')
      label.textContent = pc(n) === 0 ? noteName(n) : noteName(n, false)
      if (n === base) label.classList.add('mid')
      k.append(label)
    }
    inner.append(k); keys.set(n, k)
  }

  const layoutCbs = new Set()
  function layout() {
    const avail = scroller.clientWidth || host.clientWidth || 360
    inner.style.width = Math.max(avail, W * MIN_KEY) + 'px'
    inner.style.touchAction = W * MIN_KEY > avail ? 'pan-x' : 'none'
    layoutCbs.forEach((f) => f())
  }
  const ro = new ResizeObserver(layout); ro.observe(host)
  const showLabels = () => host.classList.toggle('nolabels', !settings.labels)
  showLabels()
  const offSettings = settingsBus.on('change', showLabels)

  // ---- playing with touch / mouse ----
  const ptr = new Map() // pointerId -> note
  const noteAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('.key')
    return el && inner.contains(el) ? +el.dataset.note : null
  }
  const velAt = (el, y) => {
    const r = el.getBoundingClientRect()
    return Math.round(45 + 75 * Math.min(1, Math.max(0, (y - r.top) / r.height)))
  }
  inner.addEventListener('pointerdown', (e) => {
    const k = e.target.closest('.key'); if (!k) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const n = +k.dataset.note
    ptr.set(e.pointerId, n); noteOn(n, velAt(k, e.clientY), 'screen')
    if (inner.style.touchAction === 'none') e.preventDefault()
  })
  inner.addEventListener('pointermove', (e) => {
    if (!ptr.has(e.pointerId)) return
    const n = noteAt(e.clientX, e.clientY)
    const cur = ptr.get(e.pointerId)
    if (n != null && n !== cur) { noteOff(cur, 'screen'); ptr.set(e.pointerId, n); noteOn(n, 80, 'screen') }
  })
  const up = (e) => { if (ptr.has(e.pointerId)) { noteOff(ptr.get(e.pointerId), 'screen'); ptr.delete(e.pointerId) } }
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up)
  inner.addEventListener('contextmenu', (e) => e.preventDefault())

  // ---- computer keyboard (handy for testing on a laptop) ----
  const kd = (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || /input|select|textarea/i.test(e.target.tagName)) return
    const n = KEYMAP[e.key.toLowerCase()]
    if (n != null) noteOn(n, 90, 'qwerty')
  }
  const ku = (e) => { const n = KEYMAP[e.key.toLowerCase()]; if (n != null) noteOff(n, 'qwerty') }
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku)

  // ---- show what's held ----
  const mark = (n, on) => keys.get(n)?.classList.toggle('down', on)
  const offs = [
    input.on('noteon', (e) => mark(e.note, true)),
    input.on('noteoff', (e) => mark(e.note, false)),
  ]
  for (const n of held.keys()) mark(n, true)

  const timers = new Set()
  const kb = {
    el: host, scroller, inner, low, high, keys,
    get width() { return inner.clientWidth },
    /** x/width of a key in px (for aligning falling notes) */
    geom(n) {
      const w = inner.clientWidth
      if (isBlack(n)) return { x: ((idx.get(n - 1) + 1 - 0.3) / W) * w, w: (0.6 / W) * w, black: true }
      return { x: (idx.get(n) / W) * w, w: w / W, black: false }
    },
    has: (n) => keys.has(n),
    whiteCount: W,
    setTargets(list, cls = 'target') {
      keys.forEach((k) => k.classList.remove(cls))
      list.forEach((n) => keys.get(n)?.classList.add(cls))
    },
    flash(n, cls, ms = 400) {
      const k = keys.get(n); if (!k) return
      k.classList.add(cls)
      const t = setTimeout(() => { k.classList.remove(cls); timers.delete(t) }, ms); timers.add(t)
    },
    clear() { keys.forEach((k) => k.classList.remove('target', 'good', 'bad', 'hint')) },
    /** scroll so a note is comfortably in view */
    reveal(n) {
      const g = kb.geom(n)
      const left = g.x + g.w / 2 - scroller.clientWidth / 2
      scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    },
    /** put another element (e.g. the falling-notes canvas) in the same scrolling box, above the keys */
    mountAbove(elm) { scroller.insertBefore(elm, inner) },
    onLayout(fn) { layoutCbs.add(fn); return () => layoutCbs.delete(fn) },
    destroy() {
      ro.disconnect(); offs.forEach((f) => f()); offSettings()
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku)
      timers.forEach(clearTimeout)
      for (const [, n] of ptr) noteOff(n, 'screen')
      ptr.clear(); host.innerHTML = ''
    },
  }
  layout()
  return kb
}
