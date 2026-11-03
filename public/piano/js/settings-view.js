import { $, esc, settings, saveSettings, store } from './util.js'
import { midi } from './midi.js'
import { appPlay } from './input.js'
import { synth } from './audio.js'

export function mountSettings(root) {
  root.innerHTML = `
  <section class="form settings">
    <div class="hero"><h1>Settings</h1></div>
    <h3>Piano connection</h3>
    <div id="conn"></div>
    <label>Send the app's sounds to
      <select id="appSound">
        <option value="auto">Auto – the piano if connected, otherwise this device</option>
        <option value="piano">The piano</option>
        <option value="device">This device's speaker</option>
        <option value="both">Both</option>
      </select></label>
    <label class="check"><input type="checkbox" id="thru"> Also play my piano's keys through this device</label>
    <button id="test">🔔 Play a test note</button>

    <h3>Display</h3>
    <label class="check"><input type="checkbox" id="labels"> Show note names on the keys</label>

    <h3>Timing</h3>
    <label class="slider">Input delay compensation <input type="range" id="offset" min="-150" max="250" step="5"><output id="offset-out"></output></label>
    <p class="muted">If notes in "Play along" feel consistently early or late, nudge this.</p>

    <h3>Getting connected</h3>
    <details open><summary>Kawai CS-11 → Pixel (Android)</summary>
      <p>Use a USB-C to USB-B (printer-style) cable from the piano's <b>USB to Host</b> port to your phone. Open this page in <b>Chrome</b>, tap <b>Connect my piano</b> and allow MIDI access. No driver needed.</p></details>
    <details open><summary>Kawai CS-11 → iPad</summary>
      <p><b>Safari on iPad/iPhone does not support Web MIDI</b>, so the piano won't be detected there. Use a browser app that does – for example the free <b>Web MIDI Browser</b> app from the App Store – and open this page in it. You'll need a USB-C to USB-B cable (or a Lightning/USB-C adapter for an older iPad). The on-screen keyboard works in any browser.</p></details>
    <details><summary>Nothing happening?</summary>
      <p>Check the cable is a data cable, switch the piano on <i>before</i> opening the page, then tap Connect again. If you denied MIDI permission, re-enable it from the site settings in your browser.</p></details>

    <h3>Data</h3>
    <button class="ghost" id="wipe">Reset my scores</button>
  </section>`
  const conn = $(root, '#conn')
  const paint = () => {
    const outs = midi.outputs.map((o) => `<option value="${esc(o.id)}" ${midi.out?.id === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')
    if (!midi.supported) conn.innerHTML = `<div class="notice warn">This browser doesn't support Web MIDI. Use Chrome on Android, or a MIDI-capable browser app on iPad.</div>`
    else if (midi.error === 'denied') conn.innerHTML = `<div class="notice warn">MIDI permission was blocked. Allow it in your browser's site settings, then <button id="c">Try again</button></div>`
    else if (midi.connected) conn.innerHTML = `<div class="notice ok">🎹 Connected: <b>${esc(midi.deviceName)}</b></div>${midi.outputs.length > 1 ? `<label>Output <select id="out">${outs}</select></label>` : ''}`
    else conn.innerHTML = `<div class="notice"><button class="primary" id="c">🔌 Connect my piano</button><p class="muted">${midi.error === 'failed' ? 'Could not open MIDI. ' : ''}${midi.inputs.length === 0 && midi.error === null && midi.out === null ? '' : ''}</p></div>`
    $(conn, '#c')?.addEventListener('click', () => midi.connect())
    $(conn, '#out')?.addEventListener('change', (e) => midi.selectOutput(e.target.value))
  }
  paint()
  $(root, '#appSound').value = settings.appSound
  $(root, '#appSound').addEventListener('change', (e) => { settings.appSound = e.target.value; saveSettings() })
  $(root, '#thru').checked = settings.thru
  $(root, '#thru').addEventListener('change', (e) => { settings.thru = e.target.checked; saveSettings() })
  $(root, '#labels').checked = settings.labels
  $(root, '#labels').addEventListener('change', (e) => { settings.labels = e.target.checked; saveSettings() })
  const off = $(root, '#offset'), offOut = $(root, '#offset-out')
  off.value = settings.timingOffset; offOut.textContent = settings.timingOffset + ' ms'
  off.addEventListener('input', () => { settings.timingOffset = +off.value; offOut.textContent = off.value + ' ms'; saveSettings() })
  $(root, '#test').addEventListener('click', () => { synth.unlock(); appPlay(60, 700) })
  $(root, '#wipe').addEventListener('click', () => { if (confirm('Reset all scores and stars?')) { store.set('progress', {}); store.set('best', {}) } })
  return midi.on('state', paint)
}
