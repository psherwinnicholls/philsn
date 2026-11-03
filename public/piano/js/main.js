import { $, esc, settings } from './util.js'
import { midi } from './midi.js'
import { releaseAll, setHarmony } from './input.js'
import { mountHome } from './home.js'
import { mountQuiz } from './quiz.js'
import { mountSongs } from './songs-view.js'
import { mountPlay } from './falling.js'
import { mountLab } from './lab.js'
import { mountCreate } from './create.js'
import { mountSettings } from './settings-view.js'

const view = document.getElementById('view')
const chip = document.getElementById('midi-chip')
let cleanup = () => {}

const routes = {
  '': [mountHome, 'learn'], quiz: [mountQuiz, 'learn'], songs: [mountSongs, 'songs'], play: [mountPlay, 'songs'],
  lab: [mountLab, 'lab'], create: [mountCreate, 'create'], settings: [mountSettings, 'settings'],
}

function route() {
  try { cleanup() } catch (e) { console.error(e) }
  releaseAll(); setHarmony([0])
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/')
  const [mount, tab] = routes[name] || routes['']
  view.innerHTML = ''
  cleanup = mount(view, arg ? decodeURIComponent(arg) : undefined) || (() => {})
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab))
  window.scrollTo(0, 0)
}

function paintChip() {
  chip.className = 'chip'
  if (!midi.supported) { chip.textContent = 'No MIDI in this browser'; chip.classList.add('warn') }
  else if (midi.connected) { chip.textContent = '● ' + (midi.deviceName || 'Piano'); chip.classList.add('ok') }
  else { chip.textContent = '🔌 Connect piano' }
}
chip.addEventListener('click', async () => {
  if (midi.supported && !midi.connected) { const ok = await midi.connect(); if (ok && midi.connected) return }
  location.hash = '#/settings'
})
midi.on('state', paintChip)
paintChip()

window.addEventListener('hashchange', route)
route()
midi.autoConnect()

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
