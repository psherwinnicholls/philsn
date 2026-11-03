import { esc } from './util.js'
import { GROUPS, ACTIVITIES, getDrills, progress } from './activities.js'
import { midi } from './midi.js'

const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n)

export function mountHome(root) {
  const prog = progress.all()
  const card = (a, href) => {
    const p = prog[a.id]
    return `<a class="card" href="${href || '#/quiz/' + a.id}">
      <span class="ico">${a.icon || '🎹'}</span>
      <span class="txt"><b>${esc(a.title)}</b><small>${esc(a.desc || '')}</small></span>
      <span class="badge ${p ? 'has' : ''}">${p ? stars(p.stars) : ''}</span></a>`
  }
  const drills = getDrills()
  root.innerHTML = `
  <section class="home">
    <div class="hero">
      <h1>Learn piano, one key at a time</h1>
      <p>Play on your piano (or the on-screen keys) and the app listens.</p>
      <div id="hero-status"></div>
    </div>
    ${GROUPS.map((g) => `
      <h2 class="grp">${g.title}</h2><p class="blurb">${g.blurb}</p>
      <div class="cards">${ACTIVITIES.filter((a) => a.group === g.id).map((a) => card(a)).join('')}</div>`).join('')}
    <h2 class="grp">My drills</h2>
    <div class="cards">
      ${drills.map((d) => card({ ...d, icon: d.icon || '⭐', desc: d.desc || 'Custom drill' })).join('')}
      <a class="card add" href="#/create"><span class="ico">＋</span><span class="txt"><b>Build your own</b><small>Choose the notes, range and style</small></span></a>
    </div>
    <h2 class="grp">More</h2>
    <div class="cards">
      <a class="card" href="#/songs"><span class="ico">🎮</span><span class="txt"><b>Play along</b><small>Falling-notes songs, easy to challenging</small></span></a>
      <a class="card" href="#/lab"><span class="ico">🎛️</span><span class="txt"><b>Sound lab</b><small>Change sounds, add layers, free play</small></span></a>
    </div>
  </section>`
  const status = root.querySelector('#hero-status')
  const paint = () => {
    if (!midi.supported) status.innerHTML = `<div class="notice warn"><b>This browser can't read MIDI.</b> You can still practise with the on-screen keys. To use your Kawai CS-11, open this page in Chrome on your Pixel, or a MIDI-capable browser app on your iPad. <a href="#/settings">Details</a></div>`
    else if (midi.connected) status.innerHTML = `<div class="notice ok">🎹 Connected: <b>${esc(midi.deviceName)}</b></div>`
    else status.innerHTML = `<div class="notice"><button class="primary" id="hero-connect">🔌 Connect my piano</button> <span class="muted">or just tap the on-screen keys</span></div>`
    status.querySelector('#hero-connect')?.addEventListener('click', () => midi.connect())
  }
  paint()
  return midi.on('state', paint)
}
