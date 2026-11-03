// Song library. Notation: "C4:1 D4:0.5 R:1 [C4 E4 G4]:2"  (name:beats, R = rest, [..] = chord)
import { parseNote, store } from './util.js'

export function parseSong(text) {
  const events = []
  let pos = 0
  const errors = []
  const tokens = text.match(/\[[^\]]*\](?::[\d./]+)?|\S+/g) || []
  const dur = (s) => {
    if (s == null || s === '') return 1
    if (s.includes('/')) { const [a, b] = s.split('/').map(Number); return a / b }
    return parseFloat(s)
  }
  for (const tok of tokens) {
    if (tok === '|') continue
    let names, d
    if (tok[0] === '[') {
      const m = /^\[([^\]]*)\](?::([\d./]+))?$/.exec(tok)
      if (!m) { errors.push(tok); continue }
      names = m[1].split(/[\s,]+/).filter(Boolean); d = dur(m[2])
    } else {
      const [n, ds] = tok.split(':'); names = n.toUpperCase() === 'R' ? [] : [n]; d = dur(ds)
    }
    if (!(d > 0)) { errors.push(tok); continue }
    for (const nm of names) {
      const midi = parseNote(nm)
      if (midi == null) errors.push(tok); else events.push({ note: midi, start: pos, dur: d })
    }
    pos += d
  }
  events.sort((a, b) => a.start - b.start || a.note - b.note)
  return { events, errors, beats: pos }
}

const BUILT_IN = [
  { id: 'mary', title: 'Mary Had a Little Lamb', composer: 'Traditional', level: 1, bpm: 96, score: 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4' },
  { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', composer: 'Traditional', level: 1, bpm: 96, score: 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2' },
  { id: 'row', title: 'Row, Row, Row Your Boat', composer: 'Traditional', level: 1, bpm: 96, score: 'C4:1 C4:1 C4:0.75 D4:0.25 E4:1 E4:0.75 D4:0.25 E4:0.75 F4:0.25 G4:2 C5:0.33 C5:0.33 C5:0.34 G4:0.33 G4:0.33 G4:0.34 E4:0.33 E4:0.33 E4:0.34 C4:0.33 C4:0.33 C4:0.34 G4:0.75 F4:0.25 E4:0.75 D4:0.25 C4:2' },
  { id: 'ode', title: 'Ode to Joy', composer: 'Beethoven', level: 1, bpm: 100, score: 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2 D4 D4 E4 C4 D4 E4:0.5 F4:0.5 E4 C4 D4 E4:0.5 F4:0.5 E4 D4 C4 D4 G3:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2' },
  { id: 'birthday', title: 'Happy Birthday', composer: 'Traditional', level: 2, bpm: 100, score: 'G4:0.75 G4:0.25 A4 G4 C5 B4:2 G4:0.75 G4:0.25 A4 G4 D5 C5:2 G4:0.75 G4:0.25 G5 E5 C5 B4 A4:2 F5:0.75 F5:0.25 E5 C5 D5 C5:2' },
  { id: 'jingle', title: 'Jingle Bells (chorus)', composer: 'Pierpont', level: 2, bpm: 120, score: 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 F4 F4 F4:1.5 F4:0.5 F4 E4 E4 E4:0.5 E4:0.5 E4 D4 D4 E4 D4:2 G4:2' },
  { id: 'fourchords', title: 'Four Chords (C · G · Am · F)', composer: 'Chord practice', level: 2, bpm: 80, score: '[C4 E4 G4]:2 [B3 D4 G4]:2 [A3 C4 E4]:2 [A3 C4 F4]:2 [C4 E4 G4]:2 [B3 D4 G4]:2 [A3 C4 E4]:2 [A3 C4 F4]:2 [C4 E4 G4]:4' },
  { id: 'canon', title: 'Canon in D (melody)', composer: 'Pachelbel', level: 3, bpm: 84, score: 'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 D5:1 C#5:1 D5:1 F#4:1 A4:1 G4:1 F#4:1 D4:1 F#4:1 E4:1 D4:1 E4:1 F#4:1 G4:1 A4:1 F#4:1 D4:1 A4:2 F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2' },
  { id: 'elise', title: 'Für Elise (opening)', composer: 'Beethoven', level: 3, bpm: 130, score: 'E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 R:.5 C4:.5 E4:.5 A4:.5 B4:1 R:.5 E4:.5 G#4:.5 B4:.5 C5:1 R:.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 R:.5 C4:.5 E4:.5 A4:.5 B4:1 R:.5 E4:.5 C5:.5 B4:.5 A4:1.5' },
]

const userSongs = () => store.get('songs', [])
export function saveUserSong(song) {
  const list = userSongs().filter((s) => s.id !== song.id)
  list.push(song); store.set('songs', list)
}
export function deleteUserSong(id) { store.set('songs', userSongs().filter((s) => s.id !== id)) }

function build(s) {
  if (s.events) return { ...s, custom: true }
  const { events, beats } = parseSong(s.score)
  return { ...s, events, beats }
}
export const getSongs = () => [...BUILT_IN.map(build), ...userSongs().map(build)]
export const getSong = (id) => getSongs().find((s) => s.id === id)
export const LEVELS = { 1: 'Easy', 2: 'Medium', 3: 'Challenge', 0: 'Mine' }
