// The built-in exercise catalogue + user-made drills.
import { store, ROOT_NAMES, CHORDS } from './util.js'

const WHITE = [0, 2, 4, 5, 7, 9, 11]
const BLACKS = [1, 3, 6, 8, 10]
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

export const GROUPS = [
  { id: 'keys', title: 'Find your way around', blurb: 'Learn where the notes live on the keyboard.' },
  { id: 'staff', title: 'Read music', blurb: 'See a note on the staff, play it on the piano.' },
  { id: 'ear', title: 'Train your ears', blurb: 'The app plays a note – you find it.' },
  { id: 'chords', title: 'Chords', blurb: 'Press several keys together.' },
  { id: 'scales', title: 'Scales', blurb: 'Climb up and down a scale, key by key.' },
]

export const ACTIVITIES = [
  { id: 'landmarks', group: 'keys', icon: '📍', title: 'Landmarks: C and F', desc: 'C sits left of the two black keys; F left of the three.', kind: 'note', display: 'name', pcs: [0, 5], low: 60, high: 83, anyOctave: true, rounds: 10, hints: true },
  { id: 'white-keys', group: 'keys', icon: '⚪', title: 'White keys', desc: 'Find any C, D, E, F, G, A or B.', kind: 'note', display: 'name', pcs: WHITE, low: 60, high: 83, anyOctave: true, rounds: 15, hints: true },
  { id: 'black-keys', group: 'keys', icon: '⚫', title: 'Black keys', desc: 'Sharps and flats – each has two names.', kind: 'note', display: 'name', pcs: BLACKS, low: 60, high: 83, anyOctave: true, rounds: 12, hints: true },
  { id: 'exact-keys', group: 'keys', icon: '🎯', title: 'Exact notes', desc: 'The right note in the right octave (C4 = middle C).', kind: 'note', display: 'name', pcs: ALL, low: 48, high: 83, anyOctave: false, rounds: 15, hints: true },
  { id: 'speed-names', group: 'keys', icon: '⏱️', title: 'Speed round', desc: '60 seconds – how many can you find?', kind: 'note', display: 'name', pcs: ALL, low: 60, high: 83, anyOctave: true, timeLimit: 60, hints: false },

  { id: 'treble-1', group: 'staff', icon: '🎼', title: 'Treble clef: first five', desc: 'C D E F G just above middle C.', kind: 'note', display: 'staff', clef: 'treble', pcs: WHITE, low: 60, high: 67, anyOctave: false, rounds: 12, hints: true },
  { id: 'treble-2', group: 'staff', icon: '🎼', title: 'Treble clef: whole staff', desc: 'Every white key from middle C up to A.', kind: 'note', display: 'staff', clef: 'treble', pcs: WHITE, low: 60, high: 81, anyOctave: false, rounds: 15, hints: true },
  { id: 'bass-1', group: 'staff', icon: '🎼', title: 'Bass clef: first five', desc: 'C down to F in the left hand.', kind: 'note', display: 'staff', clef: 'bass', pcs: WHITE, low: 53, high: 60, anyOctave: false, rounds: 12, hints: true },
  { id: 'bass-2', group: 'staff', icon: '🎼', title: 'Bass clef: whole staff', desc: 'Every white key from low E up to middle C.', kind: 'note', display: 'staff', clef: 'bass', pcs: WHITE, low: 40, high: 60, anyOctave: false, rounds: 15, hints: true },
  { id: 'grand', group: 'staff', icon: '🎹', title: 'Both clefs (grand staff)', desc: 'Treble and bass mixed, with sharps.', kind: 'note', display: 'staff', clef: 'grand', pcs: ALL, low: 43, high: 79, anyOctave: false, rounds: 20, hints: true },

  { id: 'ear-5', group: 'ear', icon: '👂', title: 'Five notes', desc: 'C D E G A – the friendly pentatonic.', kind: 'note', display: 'ear', pcs: [0, 2, 4, 7, 9], low: 60, high: 72, anyOctave: false, rounds: 10, hints: true },
  { id: 'ear-oct', group: 'ear', icon: '👂', title: 'One octave, white keys', desc: 'Find the note you heard.', kind: 'note', display: 'ear', pcs: WHITE, low: 60, high: 71, anyOctave: false, rounds: 10, hints: true },
  { id: 'ear-all', group: 'ear', icon: '👂', title: 'Every note', desc: 'All 12 notes across two octaves.', kind: 'note', display: 'ear', pcs: ALL, low: 60, high: 83, anyOctave: false, rounds: 12, hints: true },

  { id: 'chords-1', group: 'chords', icon: '🎶', title: 'C, F and G major', desc: 'The three most useful chords.', kind: 'chord', roots: [0, 5, 7], types: ['major'], rounds: 8, hints: true },
  { id: 'chords-2', group: 'chords', icon: '🎶', title: 'Major & minor', desc: 'Happy or sad? White-key roots.', kind: 'chord', roots: WHITE, types: ['major', 'minor'], rounds: 12, hints: true },
  { id: 'chords-3', group: 'chords', icon: '🎶', title: 'Every major chord', desc: 'All twelve roots.', kind: 'chord', roots: ALL, types: ['major'], rounds: 12, hints: true },
  { id: 'chords-4', group: 'chords', icon: '🎷', title: 'Seventh chords', desc: 'Dominant, major and minor 7ths.', kind: 'chord', roots: [0, 2, 5, 7, 9], types: ['7', 'maj7', 'm7'], rounds: 10, hints: true },

  { id: 'scales', group: 'scales', icon: '🪜', title: 'Scale builder', desc: 'Pick a key and a scale, then climb it.', kind: 'scalepicker' },
]

export const getDrills = () => store.get('drills', [])
export const saveDrill = (d) => { const l = getDrills().filter((x) => x.id !== d.id); l.push(d); store.set('drills', l) }
export const deleteDrill = (id) => store.set('drills', getDrills().filter((x) => x.id !== id))
export const findActivity = (id) => ACTIVITIES.find((a) => a.id === id) || getDrills().find((d) => d.id === id)

export const progress = {
  all: () => store.get('progress', {}),
  record(id, stars, text) {
    const p = progress.all()
    const prev = p[id] || { plays: 0, stars: 0 }
    p[id] = { plays: prev.plays + 1, stars: Math.max(prev.stars, stars), text: stars >= prev.stars ? text : prev.text }
    store.set('progress', p)
  },
}

export const chordTitle = (rootPc, type) => `${ROOT_NAMES[rootPc]} ${CHORDS[type].label}`
