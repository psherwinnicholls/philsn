import { esc, store } from './util.js'
import { getSongs, LEVELS, deleteUserSong } from './songs.js'

export function mountSongs(root) {
  const best = store.get('best', {})
  const render = () => {
    const songs = getSongs()
    const groups = [1, 2, 3, 0].map((lv) => ({ lv, list: songs.filter((s) => (s.level ?? 0) === lv) })).filter((g) => g.list.length)
    root.innerHTML = `
    <section class="home">
      <div class="hero"><h1>Play along</h1><p>Notes fall towards the keys – play them as they land. Start with <b>Wait for me</b>: the song pauses until you find the right key.</p></div>
      ${groups.map((g) => `<h2 class="grp">${LEVELS[g.lv]}</h2><div class="cards">
        ${g.list.map((s) => {
          const stars = Math.max(0, ...['wait', 'play'].map((m) => best[`${s.id}:${m}`]?.stars || 0))
          return `<a class="card" href="#/play/${encodeURIComponent(s.id)}"><span class="ico">${g.lv === 0 ? '⭐' : '🎵'}</span>
            <span class="txt"><b>${esc(s.title)}</b><small>${esc(s.composer || '')} · ${s.events.length} notes</small></span>
            <span class="badge ${stars ? 'has' : ''}">${stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : ''}</span>
            ${s.custom ? `<button class="del" data-del="${esc(s.id)}" aria-label="Delete">🗑</button>` : ''}</a>`
        }).join('')}</div>`).join('')}
      <div class="cards"><a class="card add" href="#/create"><span class="ico">＋</span><span class="txt"><b>Add your own song</b><small>Record it or type it in</small></span></a></div>
    </section>`
    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation()
      if (confirm('Delete this song?')) { deleteUserSong(b.dataset.del); render() }
    }))
  }
  render()
  return () => {}
}
