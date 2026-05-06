import { useState, useEffect, useCallback } from 'react'
import { CARDS as BASE_CARDS, CATEGORIES } from './cards'

// ── LocalStorage helpers ──────────────────────────────────────
const LS = 'gyntrainer_v3'
const LS_STREAK = 'gyntrainer_streak_v3'
const LS_CUSTOM = 'gyntrainer_custom_v3'
const LS_FAVS = 'gyntrainer_favs_v3'

const load = (key, def) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? def } catch { return def } }
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

const getStreak = () => {
  try {
    const s = load(LS_STREAK, { count: 0, last: '' })
    const today = new Date().toISOString().slice(0, 10)
    if (s.last === today) return s.count
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const count = s.last === yest ? s.count + 1 : 1
    save(LS_STREAK, { count, last: today })
    return count
  } catch { return 1 }
}

// Notify helper (best-effort)
const requestNotify = async () => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const p = await Notification.requestPermission()
  return p === 'granted'
}

// ── Build deck ────────────────────────────────────────────────
const ORDER = { hard: 0, medium: 1, undefined: 2, easy: 3 }

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck(cat, ratings, allCards, mode = 'spaced', filterRating = null) {
  let pool = cat === 'Alle Themen' ? [...allCards] : allCards.filter(c => c.cat === cat)
  if (filterRating) pool = pool.filter(c => ratings[c.id] === filterRating)
  if (mode === 'shuffle') return shuffle(pool)
  if (mode === 'favorites') return pool // already filtered outside
  return [...pool].sort((a, b) => (ORDER[ratings[a.id]] ?? 2) - (ORDER[ratings[b.id]] ?? 2))
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' },
  header: { background: 'var(--green)', padding: '14px 16px 10px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(26,92,58,0.3)' },
  headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  logo: { color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' },
  streakBadge: { background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 100, border: 'none', cursor: 'pointer' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 5 },
  progressTrack: { height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' },
  progressFill: (pct) => ({ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 10, transition: 'width 0.5s ease' }),
  navTabs: { display: 'flex', background: '#fff', borderBottom: '1px solid var(--border)', overflowX: 'auto' },
  navTab: (active) => ({ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: active ? 'var(--green)' : 'var(--muted)', borderBottom: active ? '2.5px solid var(--green)' : '2.5px solid transparent', background: 'none', border: 'none', whiteSpace: 'nowrap', cursor: 'pointer' }),
  content: { padding: '16px', maxWidth: 680, margin: '0 auto', width: '100%', flex: 1, boxSizing: 'border-box' },
  statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 },
  statCard: (clickable) => ({ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 10px', textAlign: 'center', cursor: clickable ? 'pointer' : 'default', transition: 'transform 0.1s' }),
  statNum: (color) => ({ fontSize: 22, fontWeight: 700, lineHeight: 1, color }),
  statLabel: { fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 },
  filterBanner: { background: 'var(--gold-light)', border: '1px solid #f0d28a', borderRadius: 10, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 },
  catScroll: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 8, scrollbarWidth: 'none' },
  catChip: (active) => ({ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 500, padding: '6px 13px', borderRadius: 100, border: `1.5px solid ${active ? 'var(--green)' : 'var(--border)'}`, background: active ? 'var(--green)' : '#fff', color: active ? '#fff' : 'var(--muted)', cursor: 'pointer' }),
  modeRow: { display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' },
  modeBtn: (active) => ({ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 500, padding: '6px 13px', borderRadius: 100, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent)' : '#fff', color: active ? '#fff' : 'var(--muted)', cursor: 'pointer' }),
  cardHint: { textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 10 },
  cardWrap: { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '22px 20px', marginBottom: 14, cursor: 'pointer', boxShadow: 'var(--shadow)', minHeight: 200, display: 'flex', flexDirection: 'column' },
  cardWrapBack: { background: 'var(--green)', borderRadius: 'var(--radius)', padding: '22px 20px', marginBottom: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,92,58,0.25)', minHeight: 200, display: 'flex', flexDirection: 'column' },
  cardTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTopLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  catTag: (dark) => ({ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: dark ? 'rgba(255,255,255,0.6)' : 'var(--green)' }),
  posBadge: (dark) => ({ fontSize: 11, fontWeight: 600, background: dark ? 'rgba(255,255,255,0.15)' : 'var(--bg)', color: dark ? 'rgba(255,255,255,0.8)' : 'var(--muted)', padding: '3px 10px', borderRadius: 100 }),
  favBtn: (active, dark) => ({ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: active ? '#e74c3c' : (dark ? 'rgba(255,255,255,0.4)' : '#ccc'), padding: '0 4px' }),
  editBtn: (dark) => ({ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: dark ? 'rgba(255,255,255,0.5)' : 'var(--muted)', padding: '0 4px' }),
  question: { fontSize: 18, lineHeight: 1.55, color: 'var(--text)', fontWeight: 500, flex: 1 },
  ansLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  answer: { fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.95)', flex: 1 },
  linkRow: { marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)' },
  linkBtn: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 },
  actionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 },
  btnHard: { background: '#fdf0ef', color: '#c0392b', border: '1.5px solid #f1b8b4', borderRadius: 14, padding: '13px 8px', fontSize: 13, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' },
  btnMed: { background: 'var(--gold-light)', color: '#854f0b', border: '1.5px solid #f0d28a', borderRadius: 14, padding: '13px 8px', fontSize: 13, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' },
  btnEasy: { background: 'var(--green-light)', color: 'var(--green)', border: '1.5px solid #b8dcca', borderRadius: 14, padding: '13px 8px', fontSize: 13, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' },
  navRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 8 },
  navBtn: (disabled) => ({ fontSize: 13, fontWeight: 500, padding: '9px 20px', borderRadius: 100, border: '1.5px solid var(--border)', background: '#fff', color: disabled ? '#ccc' : 'var(--text)', cursor: disabled ? 'default' : 'pointer' }),
  navPos: { fontSize: 13, fontWeight: 600, color: 'var(--muted)', minWidth: 70, textAlign: 'center' },
  doneCard: { background: '#fff', borderRadius: 'var(--radius)', padding: '32px 22px', textAlign: 'center', boxShadow: 'var(--shadow)' },
  doneTrophy: { fontSize: 52, marginBottom: 8 },
  doneTitle: { fontSize: 23, fontWeight: 700, color: 'var(--green)', marginBottom: 6 },
  doneMsg: { fontSize: 14, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.5 },
  doneStats: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 },
  doneStat: (bg) => ({ padding: '12px', borderRadius: 14, background: bg }),
  doneStatNum: (color) => ({ fontSize: 28, fontWeight: 700, color }),
  doneStatLbl: { fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' },
  btnGreen: { background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 100, padding: '13px 28px', fontSize: 15, fontWeight: 600, marginRight: 10, cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent)', borderRadius: 100, padding: '12px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', background: '#fff', boxSizing: 'border-box', marginBottom: 14 },
  textarea: { width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text)', background: '#fff', boxSizing: 'border-box', marginBottom: 14, minHeight: 100, resize: 'vertical' },
  modalBtns: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  btnCancel: { background: '#f5f5f5', color: 'var(--muted)', border: 'none', borderRadius: 100, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSave: { background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 100, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnDel: { background: '#fdf0ef', color: '#c0392b', border: '1.5px solid #f1b8b4', borderRadius: 100, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  // Stats tab
  bigStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 },
  bigStat: { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center' },
  bigNum: { fontSize: 36, fontWeight: 700, color: 'var(--green)' },
  bigLbl: { fontSize: 12, color: 'var(--muted)', marginTop: 4 },
  sectionLbl: { fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 },
  catBarItem: { background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 14px', marginBottom: 8 },
  catBarTop: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 },
  catBarTrack: { height: 6, background: 'var(--bg)', borderRadius: 10, overflow: 'hidden' },
  catBarFill: (pct, color) => ({ height: '100%', width: `${pct}%`, background: color, borderRadius: 10, transition: 'width 0.8s ease' }),
  btnReset: { width: '100%', marginTop: 20, fontSize: 13, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--muted)', cursor: 'pointer' },
  // Exam tab
  examBox: { background: '#fff', borderRadius: 'var(--radius)', padding: 22, marginBottom: 14, border: '1px solid var(--border)' },
  examRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border)' },
  examLabel: { fontSize: 14, fontWeight: 500 },
  examDesc: { fontSize: 11, color: 'var(--muted)', marginTop: 1 },
  examSelect: { fontSize: 13, padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff' },
  btnStartExam: { width: '100%', padding: 16, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  timerWrap: { textAlign: 'center', marginBottom: 10 },
  timerSub: { fontSize: 12, color: 'var(--muted)', marginBottom: 4 },
  timer: (warn) => ({ fontSize: 44, fontWeight: 700, color: warn ? 'var(--accent)' : 'var(--green)' }),
  notifyBox: { background: 'var(--green-light)', border: '1px solid #b8dcca', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  notifyText: { fontSize: 13, color: 'var(--green)', flex: 1 },
  btnNotify: { background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 100, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
}

// ── Edit Modal ────────────────────────────────────────────────
function EditModal({ card, onSave, onDelete, onClose }) {
  const [q, setQ] = useState(card.q)
  const [a, setA] = useState(card.a)
  const [link, setLink] = useState(card.link || '')
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>✏️ Karte bearbeiten</div>
        <label style={S.label}>Frage</label>
        <textarea style={S.textarea} value={q} onChange={e => setQ(e.target.value)} />
        <label style={S.label}>Antwort</label>
        <textarea style={S.textarea} value={a} onChange={e => setA(e.target.value)} />
        <label style={S.label}>Link (Open Evidence oder andere Quelle)</label>
        <input style={S.input} value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
        <div style={S.modalBtns}>
          <button style={S.btnDel} onClick={() => { if (window.confirm('Karte wirklich löschen?')) onDelete(card.id) }}>🗑 Löschen</button>
          <button style={S.btnCancel} onClick={onClose}>Abbrechen</button>
          <button style={S.btnSave} onClick={() => onSave({ ...card, q, a, link })}>Speichern</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('learn')
  const [ratings, setRatings] = useState(() => load(LS, {}))
  const [customCards, setCustomCards] = useState(() => load(LS_CUSTOM, {})) // overrides by id
  const [deletedIds, setDeletedIds] = useState(() => load(LS_CUSTOM + '_del', []))
  const [favorites, setFavorites] = useState(() => load(LS_FAVS, []))

  // Merged card list (apply custom edits, filter deleted)
  const allCards = BASE_CARDS
    .filter(c => !deletedIds.includes(c.id))
    .map(c => customCards[c.id] ? { ...c, ...customCards[c.id] } : c)

  const [activeCat, setActiveCat] = useState('Alle Themen')
  const [deckMode, setDeckMode] = useState('spaced') // spaced | shuffle | favorites
  const [ratingFilter, setRatingFilter] = useState(null) // null | 'hard' | 'medium' | 'easy'
  const [deck, setDeck] = useState(() => {
    const r = load(LS, {})
    return buildDeck('Alle Themen', r, BASE_CARDS.filter(c => ![].includes(c.id)).map(c => c), 'spaced', null)
  })
  const [idx, setIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [done, setDone] = useState(false)
  const [streak] = useState(getStreak)
  const [editCard, setEditCard] = useState(null)
  const [notifyGranted, setNotifyGranted] = useState(Notification?.permission === 'granted')

  // Exam state
  const [examRunning, setExamRunning] = useState(false)
  const [examFinished, setExamFinished] = useState(false)
  const [examDeck, setExamDeck] = useState([])
  const [examIdx, setExamIdx] = useState(0)
  const [examRatings, setExamRatings] = useState({})
  const [examShowAnswer, setExamShowAnswer] = useState(false)
  const [examCount, setExamCount] = useState(60)
  const [examTime, setExamTime] = useState(90)
  const [examCat, setExamCat] = useState('all')
  const [timeLeft, setTimeLeft] = useState(90)

  // Persist ratings
  useEffect(() => { save(LS, ratings) }, [ratings])
  useEffect(() => { save(LS_CUSTOM, customCards) }, [customCards])
  useEffect(() => { save(LS_CUSTOM + '_del', deletedIds) }, [deletedIds])
  useEffect(() => { save(LS_FAVS, favorites) }, [favorites])

  // Rebuild deck when allCards changes
  useEffect(() => {
    rebuildDeck(activeCat, deckMode, ratingFilter)
  }, [allCards.length, deletedIds.length])

  // Exam timer
  useEffect(() => {
    if (!examRunning || examFinished || examTime === 0 || examShowAnswer) return
    if (timeLeft <= 0) { handleExamRate('hard'); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [examRunning, examFinished, examTime, examShowAnswer, timeLeft])

  // ── Deck building ────────────────────────────────────────────
  const rebuildDeck = useCallback((cat, mode, filter) => {
    let pool = cat === 'Alle Themen' ? [...allCards] : allCards.filter(c => c.cat === cat)
    if (mode === 'favorites') pool = pool.filter(c => favorites.includes(c.id))
    if (filter) pool = pool.filter(c => ratings[c.id] === filter)
    let d
    if (mode === 'shuffle' || mode === 'favorites') d = shuffle(pool)
    else d = [...pool].sort((a, b) => (ORDER[ratings[a.id]] ?? 2) - (ORDER[ratings[b.id]] ?? 2))
    setDeck(d); setIdx(0); setShowAnswer(false); setDone(false)
  }, [allCards, ratings, favorites])

  const changeCat = (cat) => {
    setActiveCat(cat)
    setRatingFilter(null)
    rebuildDeck(cat, deckMode, null)
  }

  const changeMode = (mode) => {
    setDeckMode(mode)
    setRatingFilter(null)
    rebuildDeck(activeCat, mode, null)
  }

  const applyRatingFilter = (filter) => {
    const newFilter = ratingFilter === filter ? null : filter
    setRatingFilter(newFilter)
    rebuildDeck(activeCat, deckMode, newFilter)
  }

  const handleRate = (r) => {
    const card = deck[idx]
    if (!card) return
    const newRatings = { ...ratings, [card.id]: r }
    setRatings(newRatings)
    setShowAnswer(false)
    const next = idx + 1
    if (next >= deck.length) setDone(true)
    else setIdx(next)
  }

  const restart = () => rebuildDeck(activeCat, deckMode, ratingFilter)

  // ── Favorites ────────────────────────────────────────────────
  const toggleFav = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  // ── Card editing ─────────────────────────────────────────────
  const saveEdit = (updatedCard) => {
    setCustomCards(prev => ({ ...prev, [updatedCard.id]: { q: updatedCard.q, a: updatedCard.a, link: updatedCard.link } }))
    setDeck(prev => prev.map(c => c.id === updatedCard.id ? { ...c, ...updatedCard } : c))
    setEditCard(null)
  }

  const deleteCard = (id) => {
    setDeletedIds(prev => [...prev, id])
    setDeck(prev => {
      const newDeck = prev.filter(c => c.id !== id)
      if (idx >= newDeck.length) setDone(newDeck.length === 0 || true)
      return newDeck
    })
    setEditCard(null)
  }

  // ── Notifications ────────────────────────────────────────────
  const enableNotify = async () => {
    const ok = await requestNotify()
    setNotifyGranted(ok)
    if (ok) {
      // Schedule a reminder notification for next day at 8:00
      alert('Erinnerungen aktiviert! Du erhältst täglich eine Benachrichtigung wenn du auf diesem Gerät die App geöffnet hast.')
    }
  }

  // Check if we should show daily reminder (best-effort in-app)
  useEffect(() => {
    if (!notifyGranted) return
    const lastNotif = load('gyntrainer_last_notif', '')
    const today = new Date().toISOString().slice(0, 10)
    if (lastNotif !== today) {
      const hour = new Date().getHours()
      if (hour >= 8) {
        save('gyntrainer_last_notif', today)
        try {
          new Notification('🩺 GynTrainer', { body: 'Zeit zum Lernen! Dein täglicher Streak wartet auf dich. 🔥', icon: '/favicon.ico' })
        } catch {}
      }
    }
  }, [notifyGranted])

  // ── Exam ─────────────────────────────────────────────────────
  const startExam = () => {
    let pool = examCat === 'all' ? [...allCards] : allCards.filter(c => c.cat === examCat)
    pool = shuffle(pool).slice(0, examCount)
    setExamDeck(pool); setExamIdx(0); setExamRatings({})
    setExamShowAnswer(false); setExamRunning(true); setExamFinished(false)
    setTimeLeft(examTime)
  }

  const handleExamRate = (r) => {
    const card = examDeck[examIdx]
    if (!card) return
    const newER = { ...examRatings, [card.id]: r }
    setExamRatings(newER)
    setRatings(prev => ({ ...prev, [card.id]: r }))
    setExamShowAnswer(false)
    const next = examIdx + 1
    if (next >= examDeck.length) setExamFinished(true)
    else { setExamIdx(next); setTimeLeft(examTime) }
  }

  // ── Computed ──────────────────────────────────────────────────
  const totalAnswered = Object.keys(ratings).filter(id => allCards.find(c => c.id == id)).length
  const totalEasy = Object.entries(ratings).filter(([id, r]) => r === 'easy' && allCards.find(c => c.id == id)).length
  const totalHard = Object.entries(ratings).filter(([id, r]) => r === 'hard' && allCards.find(c => c.id == id)).length
  const totalPct = allCards.length ? Math.round(totalAnswered / allCards.length * 100) : 0

  const deckEasy = deck.filter(c => ratings[c.id] === 'easy').length
  const deckMed  = deck.filter(c => ratings[c.id] === 'medium').length
  const deckHard = deck.filter(c => ratings[c.id] === 'hard').length

  const card = deck[idx]
  const examCard = examDeck[examIdx]
  const donePct = deck.length ? Math.round(deckEasy / deck.length * 100) : 0
  const doneEmoji = donePct >= 85 ? '🏆' : donePct >= 65 ? '📈' : '📚'
  const doneMsg = donePct >= 85 ? 'Ausgezeichnet! Prüfungsbereit!' : donePct >= 65 ? 'Gut! Weiterüben lohnt sich.' : 'Gute Übung — die schwachen Karten kommen nächste Runde zuerst.'

  const exVals = Object.values(examRatings)
  const exEasy = exVals.filter(r => r === 'easy').length
  const exMed  = exVals.filter(r => r === 'medium').length
  const exHard = exVals.filter(r => r === 'hard').length
  const exPct  = exVals.length ? Math.round((exEasy + exMed * 0.5) / exVals.length * 100) : 0

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      {editCard && (
        <EditModal
          card={editCard}
          onSave={saveEdit}
          onDelete={deleteCard}
          onClose={() => setEditCard(null)}
        />
      )}

      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={S.logo}>🩺 GynTrainer</div>
          <div style={S.streakBadge}>🔥 {streak} Tage</div>
        </div>
        <div style={S.progressMeta}>
          <span>{totalAnswered} von {allCards.length} Karten bewertet</span>
          <span>{totalPct}%</span>
        </div>
        <div style={S.progressTrack}>
          <div style={S.progressFill(totalPct)} />
        </div>
      </div>

      {/* NAV TABS */}
      <div style={S.navTabs}>
        {[['learn','📖 Lernen'],['stats','📊 Fortschritt'],['exam','⏱ Prüfung']].map(([t,label]) => (
          <button key={t} style={S.navTab(tab===t)} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {/* ══ LERNEN TAB ══ */}
      {tab === 'learn' && (
        <div style={S.content}>

          {/* Notification banner */}
          {!notifyGranted && 'Notification' in window && (
            <div style={S.notifyBox}>
              <div style={S.notifyText}>🔔 Aktiviere Erinnerungen damit du täglich lernst!</div>
              <button style={S.btnNotify} onClick={enableNotify}>Aktivieren</button>
            </div>
          )}

          {/* Stats — clickable to filter */}
          <div style={S.statsRow}>
            <div style={S.statCard(true)} onClick={() => applyRatingFilter('easy')}>
              <div style={{ ...S.statNum('#1d9e75'), outline: ratingFilter === 'easy' ? '2px solid #1d9e75' : 'none', borderRadius: 8 }}>{deckEasy}</div>
              <div style={S.statLabel}>✓ Gewusst</div>
            </div>
            <div style={S.statCard(true)} onClick={() => applyRatingFilter('medium')}>
              <div style={{ ...S.statNum('#d68910') }}>{deckMed}</div>
              <div style={S.statLabel}>≈ Knapp</div>
            </div>
            <div style={S.statCard(true)} onClick={() => applyRatingFilter('hard')}>
              <div style={{ ...S.statNum('#c0392b') }}>{deckHard}</div>
              <div style={S.statLabel}>✗ Nochmals</div>
            </div>
          </div>

          {/* Rating filter banner */}
          {ratingFilter && (
            <div style={S.filterBanner}>
              <span>🎯 Filter: {ratingFilter === 'easy' ? 'Gewusste' : ratingFilter === 'medium' ? 'Knappe' : 'Nicht-gewusste'} Karten ({deck.length})</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => applyRatingFilter(ratingFilter)}>✕</button>
            </div>
          )}

          {/* Mode buttons */}
          <div style={S.modeRow}>
            <button style={S.modeBtn(deckMode === 'spaced')} onClick={() => changeMode('spaced')}>📚 Spaced Repetition</button>
            <button style={S.modeBtn(deckMode === 'shuffle')} onClick={() => changeMode('shuffle')}>🔀 Zufallsmodus</button>
            <button style={S.modeBtn(deckMode === 'favorites')} onClick={() => changeMode('favorites')}>❤️ Favoriten ({favorites.length})</button>
          </div>

          {/* Category chips */}
          <div style={S.catScroll}>
            {['Alle Themen', ...[...new Set(allCards.map(c => c.cat))].sort()].map(cat => {
              const n = cat === 'Alle Themen' ? allCards.length : allCards.filter(c => c.cat === cat).length
              const done2 = cat === 'Alle Themen'
                ? totalAnswered
                : allCards.filter(c => c.cat === cat && ratings[c.id]).length
              return (
                <button key={cat} style={S.catChip(cat === activeCat)} onClick={() => changeCat(cat)}>
                  {cat} ({done2}/{n})
                </button>
              )
            })}
          </div>

          {deck.length === 0 ? (
            <div style={S.doneCard}>
              <div style={S.doneTrophy}>🔍</div>
              <div style={S.doneTitle}>Keine Karten</div>
              <div style={S.doneMsg}>
                {deckMode === 'favorites' ? 'Noch keine Favoriten gesetzt. Tippe auf ❤️ auf einer Karte.' : 'Keine Karten für diesen Filter gefunden.'}
              </div>
              <button style={S.btnGreen} onClick={() => { setRatingFilter(null); changeMode('spaced') }}>Alle Karten anzeigen</button>
            </div>
          ) : !done ? (
            <>
              <div style={S.cardHint}>Karte antippen → Antwort sehen → bewerten</div>

              {!showAnswer ? (
                <div style={S.cardWrap} onClick={() => setShowAnswer(true)}>
                  <div style={S.cardTopRow}>
                    <div style={S.cardTopLeft}>
                      <span style={S.catTag(false)}>{card?.cat}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button style={S.favBtn(favorites.includes(card?.id), false)} onClick={e => { e.stopPropagation(); toggleFav(card?.id) }}>
                        {favorites.includes(card?.id) ? '❤️' : '🤍'}
                      </button>
                      <button style={S.editBtn(false)} onClick={e => { e.stopPropagation(); setEditCard(card) }}>✏️</button>
                      <span style={S.posBadge(false)}>{idx + 1} / {deck.length}</span>
                    </div>
                  </div>
                  <div style={S.question}>{card?.q}</div>
                  <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>↓ Antippen für Antwort</div>
                </div>
              ) : (
                <div style={S.cardWrapBack} onClick={() => setShowAnswer(false)}>
                  <div style={S.cardTopRow}>
                    <div style={S.cardTopLeft}>
                      <span style={S.catTag(true)}>Antwort</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button style={S.favBtn(favorites.includes(card?.id), true)} onClick={e => { e.stopPropagation(); toggleFav(card?.id) }}>
                        {favorites.includes(card?.id) ? '❤️' : '🤍'}
                      </button>
                      <button style={S.editBtn(true)} onClick={e => { e.stopPropagation(); setEditCard(card) }}>✏️</button>
                      <span style={S.posBadge(true)}>{idx + 1} / {deck.length}</span>
                    </div>
                  </div>
                  <div style={S.ansLabel}>Korrekte Antwort</div>
                  <div style={S.answer}>{card?.a}</div>
                  {card?.link && (
                    <div style={S.linkRow}>
                      <a href={card.link} target="_blank" rel="noopener noreferrer" style={S.linkBtn} onClick={e => e.stopPropagation()}>
                        🔗 Quelle / Open Evidence
                      </a>
                    </div>
                  )}
                </div>
              )}

              {showAnswer && (
                <div style={S.actionRow}>
                  <button style={S.btnHard} onClick={() => handleRate('hard')}><span style={{ fontSize: 18 }}>✗</span>Nochmals</button>
                  <button style={S.btnMed}  onClick={() => handleRate('medium')}><span style={{ fontSize: 18 }}>≈</span>Knapp</button>
                  <button style={S.btnEasy} onClick={() => handleRate('easy')}><span style={{ fontSize: 18 }}>✓</span>Gewusst</button>
                </div>
              )}

              {!showAnswer && (
                <div style={S.navRow}>
                  <button style={S.navBtn(idx === 0)} disabled={idx === 0} onClick={() => { setIdx(i => i - 1); setShowAnswer(false) }}>← Zurück</button>
                  <span style={S.navPos}>{idx + 1} / {deck.length}</span>
                  <button style={S.navBtn(idx >= deck.length - 1)} disabled={idx >= deck.length - 1} onClick={() => { setIdx(i => i + 1); setShowAnswer(false) }}>Weiter →</button>
                </div>
              )}
            </>
          ) : (
            <div style={S.doneCard}>
              <div style={S.doneTrophy}>{doneEmoji}</div>
              <div style={S.doneTitle}>Runde geschafft!</div>
              <div style={S.doneMsg}>{doneMsg}</div>
              <div style={S.doneStats}>
                <div style={S.doneStat('var(--green-light)')}><div style={S.doneStatNum('var(--green)')}>{deckEasy}</div><div style={S.doneStatLbl}>Gewusst</div></div>
                <div style={S.doneStat('var(--gold-light)')}><div style={S.doneStatNum('#854f0b')}>{deckMed}</div><div style={S.doneStatLbl}>Knapp</div></div>
                <div style={S.doneStat('var(--accent-light)')}><div style={S.doneStatNum('var(--accent)')}>{deckHard}</div><div style={S.doneStatLbl}>Nochmals</div></div>
              </div>
              <button style={S.btnGreen} onClick={restart}>🔄 Nochmals</button>
              <button style={S.btnOutline} onClick={() => { applyRatingFilter('hard') }}>🎯 Nur falsche</button>
            </div>
          )}
        </div>
      )}

      {/* ══ FORTSCHRITT TAB ══ */}
      {tab === 'stats' && (
        <div style={S.content}>
          <div style={S.bigStats}>
            <div style={S.bigStat}><div style={S.bigNum}>{totalAnswered}</div><div style={S.bigLbl}>Beantwortet</div></div>
            <div style={S.bigStat}><div style={S.bigNum}>{totalEasy}</div><div style={S.bigLbl}>✓ Gewusst</div></div>
            <div style={S.bigStat}><div style={{ ...S.bigNum, fontSize: 28 }}>{totalPct}%</div><div style={S.bigLbl}>Gesamtfortschritt</div></div>
            <div style={S.bigStat}><div style={S.bigNum}>{favorites.length}</div><div style={S.bigLbl}>❤️ Favoriten</div></div>
          </div>
          <div style={S.sectionLbl}>Fortschritt nach Thema</div>
          {[...new Set(allCards.map(c => c.cat))].sort().map(cat => {
            const cc = allCards.filter(c => c.cat === cat)
            const e = cc.filter(c => ratings[c.id] === 'easy').length
            const m = cc.filter(c => ratings[c.id] === 'medium').length
            const h = cc.filter(c => ratings[c.id] === 'hard').length
            const d = e + m + h
            const pct = Math.round(d / cc.length * 100)
            const col = e / cc.length > 0.7 ? '#1d9e75' : e / cc.length > 0.4 ? '#c9a227' : 'var(--green)'
            return (
              <div key={cat} style={S.catBarItem}>
                <div style={S.catBarTop}>
                  <span style={{ fontWeight: 500 }}>{cat}</span>
                  <span style={{ color: 'var(--muted)' }}>✓{e} ≈{m} ✗{h} ({pct}%)</span>
                </div>
                <div style={S.catBarTrack}>
                  <div style={S.catBarFill(pct, col)} />
                </div>
              </div>
            )
          })}
          {deletedIds.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              {deletedIds.length} Karte(n) gelöscht
            </div>
          )}
          <button style={S.btnReset} onClick={() => {
            if (window.confirm('Gesamten Fortschritt wirklich löschen?')) {
              setRatings({}); save(LS, {})
              rebuildDeck(activeCat, deckMode, null)
            }
          }}>🗑 Fortschritt zurücksetzen</button>
          <button style={{ ...S.btnReset, marginTop: 8, color: '#c0392b', borderColor: '#f1b8b4' }} onClick={() => {
            if (window.confirm('Alle eigenen Änderungen und gelöschten Karten zurücksetzen?')) {
              setCustomCards({}); save(LS_CUSTOM, {})
              setDeletedIds([]); save(LS_CUSTOM + '_del', [])
            }
          }}>↩️ Karten-Änderungen zurücksetzen</button>
        </div>
      )}

      {/* ══ PRÜFUNGSMODUS TAB ══ */}
      {tab === 'exam' && (
        <div style={S.content}>
          {!examRunning && !examFinished && (
            <>
              <div style={S.examBox}>
                <div style={S.examRow}>
                  <div><div style={S.examLabel}>Anzahl Fragen</div><div style={S.examDesc}>Fragen pro Prüfung</div></div>
                  <select style={S.examSelect} value={examCount} onChange={e => setExamCount(+e.target.value)}>
                    {[20,40,60,80].map(n => <option key={n} value={n}>{n} Fragen</option>)}
                  </select>
                </div>
                <div style={S.examRow}>
                  <div><div style={S.examLabel}>Zeitlimit</div><div style={S.examDesc}>Sekunden pro Frage</div></div>
                  <select style={S.examSelect} value={examTime} onChange={e => setExamTime(+e.target.value)}>
                    <option value={0}>Kein Limit</option>
                    <option value={60}>60 Sek.</option>
                    <option value={90}>90 Sek.</option>
                    <option value={120}>120 Sek.</option>
                  </select>
                </div>
                <div style={{ ...S.examRow, borderBottom: 'none' }}>
                  <div><div style={S.examLabel}>Thema</div><div style={S.examDesc}>Alle oder spezifisch?</div></div>
                  <select style={S.examSelect} value={examCat} onChange={e => setExamCat(e.target.value)}>
                    <option value="all">Alle Themen</option>
                    {[...new Set(allCards.map(c => c.cat))].sort().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button style={S.btnStartExam} onClick={startExam}>⏱ Prüfung starten (zufällige Reihenfolge)</button>
            </>
          )}

          {examRunning && !examFinished && examCard && (
            <>
              <div style={S.timerWrap}>
                <div style={S.timerSub}>Frage {examIdx + 1} von {examDeck.length}</div>
                {examTime > 0 && (
                  <div style={S.timer(timeLeft <= 15)}>
                    {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}
                  </div>
                )}
              </div>

              {!examShowAnswer ? (
                <div style={S.cardWrap} onClick={() => setExamShowAnswer(true)}>
                  <div style={S.cardTopRow}>
                    <span style={S.catTag(false)}>{examCard.cat}</span>
                    <span style={S.posBadge(false)}>{examIdx+1}/{examDeck.length}</span>
                  </div>
                  <div style={S.question}>{examCard.q}</div>
                  <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>↓ Antippen für Antwort</div>
                </div>
              ) : (
                <div style={S.cardWrapBack} onClick={() => setExamShowAnswer(false)}>
                  <div style={S.cardTopRow}>
                    <span style={S.catTag(true)}>Antwort</span>
                    <span style={S.posBadge(true)}>{examIdx+1}/{examDeck.length}</span>
                  </div>
                  <div style={S.ansLabel}>Korrekte Antwort</div>
                  <div style={S.answer}>{examCard.a}</div>
                  {examCard.link && (
                    <div style={S.linkRow}>
                      <a href={examCard.link} target="_blank" rel="noopener noreferrer" style={S.linkBtn} onClick={e => e.stopPropagation()}>
                        🔗 Quelle / Open Evidence
                      </a>
                    </div>
                  )}
                </div>
              )}

              {examShowAnswer && (
                <div style={S.actionRow}>
                  <button style={S.btnHard} onClick={() => handleExamRate('hard')}><span style={{fontSize:18}}>✗</span>Falsch</button>
                  <button style={S.btnMed}  onClick={() => handleExamRate('medium')}><span style={{fontSize:18}}>≈</span>Knapp</button>
                  <button style={S.btnEasy} onClick={() => handleExamRate('easy')}><span style={{fontSize:18}}>✓</span>Richtig</button>
                </div>
              )}
            </>
          )}

          {examFinished && (
            <div style={S.doneCard}>
              <div style={S.doneTrophy}>{exPct>=80?'🏆':exPct>=60?'📈':'📚'}</div>
              <div style={S.doneTitle}>Prüfung abgeschlossen!</div>
              <div style={S.doneMsg}>{exPct>=80?'Ausgezeichnet! Prüfungsbereit!':exPct>=60?'Gut! Weiterüben lohnt sich.':'Nicht aufgeben — du schaffst das!'}</div>
              <div style={S.doneStats}>
                <div style={S.doneStat('var(--green-light)')}><div style={S.doneStatNum('var(--green)')}>{exEasy}</div><div style={S.doneStatLbl}>Richtig</div></div>
                <div style={S.doneStat('var(--gold-light)')}><div style={S.doneStatNum('#854f0b')}>{exMed}</div><div style={S.doneStatLbl}>Knapp</div></div>
                <div style={S.doneStat('var(--accent-light)')}><div style={S.doneStatNum('var(--accent)')}>{exHard}</div><div style={S.doneStatLbl}>Falsch</div></div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>{exPct}%</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 22 }}>Korrekte Antworten</div>
              <button style={S.btnGreen} onClick={() => { setExamRunning(false); setExamFinished(false) }}>Neue Prüfung</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
