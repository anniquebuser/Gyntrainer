import { useState, useEffect, useCallback } from 'react'
import { CARDS, CATEGORIES } from './cards'

// ── LocalStorage helpers ──────────────────────────────────────
const LS = 'gyntrainer_v2'
const loadRatings = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} } }
const saveRatings = r => { try { localStorage.setItem(LS, JSON.stringify(r)) } catch {} }

const LS_STREAK = 'gyntrainer_streak_v2'
const getStreak = () => {
  try {
    const s = JSON.parse(localStorage.getItem(LS_STREAK) || '{"count":0,"last":""}')
    const today = new Date().toISOString().slice(0, 10)
    if (s.last === today) return s.count
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const count = s.last === yest ? s.count + 1 : 1
    localStorage.setItem(LS_STREAK, JSON.stringify({ count, last: today }))
    return count
  } catch { return 1 }
}

// ── Build deck with Spaced Repetition ────────────────────────
const ORDER = { hard: 0, medium: 1, undefined: 2, easy: 3 }
function buildDeck(cat, ratings) {
  const pool = cat === 'Alle Themen' ? [...CARDS] : CARDS.filter(c => c.cat === cat)
  return [...pool].sort((a, b) => (ORDER[ratings[a.id]] ?? 2) - (ORDER[ratings[b.id]] ?? 2))
}

// ── Styles (inline so nothing can block them) ─────────────────
const S = {
  // Layout
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' },
  // Header
  header: { background: 'var(--green)', padding: '14px 16px 10px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(26,92,58,0.3)' },
  headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  logo: { color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' },
  streakBadge: { background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '5px 12px', borderRadius: 100, border: 'none' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 5 },
  progressTrack: { height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' },
  progressFill: (pct) => ({ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 10, transition: 'width 0.5s ease' }),
  // Tabs
  navTabs: { display: 'flex', background: '#fff', borderBottom: '1px solid var(--border)', overflowX: 'auto' },
  navTab: (active) => ({ padding: '12px 18px', fontSize: 13, fontWeight: 500, color: active ? 'var(--green)' : 'var(--muted)', borderBottom: active ? '2.5px solid var(--green)' : '2.5px solid transparent', background: 'none', border: 'none', whiteSpace: 'nowrap', cursor: 'pointer' }),
  // Content
  content: { padding: '16px', maxWidth: 680, margin: '0 auto', width: '100%', flex: 1 },
  // Stats row
  statsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 },
  statCard: { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' },
  statNum: (color) => ({ fontSize: 22, fontWeight: 700, lineHeight: 1, color }),
  statLabel: { fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 },
  // Category chips
  catScroll: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' },
  catChip: (active) => ({ whiteSpace: 'nowrap', fontSize: 12, fontWeight: 500, padding: '6px 13px', borderRadius: 100, border: `1.5px solid ${active ? 'var(--green)' : 'var(--border)'}`, background: active ? 'var(--green)' : '#fff', color: active ? '#fff' : 'var(--muted)', cursor: 'pointer' }),
  // Card
  cardHint: { textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginBottom: 10 },
  cardWrap: { background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '22px 20px', marginBottom: 14, cursor: 'pointer', boxShadow: 'var(--shadow)', minHeight: 200, display: 'flex', flexDirection: 'column' },
  cardWrapBack: { background: 'var(--green)', borderRadius: 'var(--radius)', padding: '22px 20px', marginBottom: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,92,58,0.25)', minHeight: 200, display: 'flex', flexDirection: 'column' },
  cardTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  catTag: (dark) => ({ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: dark ? 'rgba(255,255,255,0.6)' : 'var(--green)' }),
  posBadge: (dark) => ({ fontSize: 11, fontWeight: 600, background: dark ? 'rgba(255,255,255,0.15)' : 'var(--bg)', color: dark ? 'rgba(255,255,255,0.8)' : 'var(--muted)', padding: '3px 10px', borderRadius: 100 }),
  question: { fontSize: 18, lineHeight: 1.55, color: 'var(--text)', fontWeight: 500, flex: 1 },
  ansLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  answer: { fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.95)', flex: 1 },
  // Action buttons
  actionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 },
  btnHard: { background: '#fdf0ef', color: '#c0392b', border: '1.5px solid #f1b8b4', borderRadius: 14, padding: '13px 8px', fontSize: 13, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  btnMed: { background: 'var(--gold-light)', color: '#854f0b', border: '1.5px solid #f0d28a', borderRadius: 14, padding: '13px 8px', fontSize: 13, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  btnEasy: { background: 'var(--green-light)', color: 'var(--green)', border: '1.5px solid #b8dcca', borderRadius: 14, padding: '13px 8px', fontSize: 13, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  // Nav
  navRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 8 },
  navBtn: (disabled) => ({ fontSize: 13, fontWeight: 500, padding: '9px 20px', borderRadius: 100, border: '1.5px solid var(--border)', background: '#fff', color: disabled ? '#ccc' : 'var(--text)', cursor: disabled ? 'default' : 'pointer' }),
  navPos: { fontSize: 13, fontWeight: 600, color: 'var(--muted)', minWidth: 70, textAlign: 'center' },
  // Done card
  doneCard: { background: '#fff', borderRadius: 'var(--radius)', padding: '32px 22px', textAlign: 'center', boxShadow: 'var(--shadow)' },
  doneTrophy: { fontSize: 52, marginBottom: 8 },
  doneTitle: { fontSize: 23, fontWeight: 700, color: 'var(--green)', marginBottom: 6 },
  doneMsg: { fontSize: 14, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.5 },
  doneStats: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 },
  doneStat: (bg, color) => ({ padding: '12px', borderRadius: 14, background: bg }),
  doneStatNum: (color) => ({ fontSize: 28, fontWeight: 700, color }),
  doneStatLbl: { fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' },
  btnGreen: { background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 100, padding: '13px 28px', fontSize: 15, fontWeight: 600, marginRight: 10 },
  btnOutline: { background: 'transparent', color: 'var(--accent)', border: '1.5px solid var(--accent)', borderRadius: 100, padding: '12px 22px', fontSize: 13, fontWeight: 600 },
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
  btnReset: { width: '100%', marginTop: 20, fontSize: 13, padding: '12px', borderRadius: 12, border: '1.5px solid var(--border)', background: '#fff', color: 'var(--muted)' },
  // Exam tab
  examBox: { background: '#fff', borderRadius: 'var(--radius)', padding: 22, marginBottom: 14, border: '1px solid var(--border)' },
  examRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border)' },
  examLabel: { fontSize: 14, fontWeight: 500 },
  examDesc: { fontSize: 11, color: 'var(--muted)', marginTop: 1 },
  examSelect: { fontSize: 13, padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff' },
  btnStartExam: { width: '100%', padding: 16, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600 },
  timerWrap: { textAlign: 'center', marginBottom: 10 },
  timerSub: { fontSize: 12, color: 'var(--muted)', marginBottom: 4 },
  timer: (warn) => ({ fontSize: 44, fontWeight: 700, color: warn ? 'var(--accent)' : 'var(--green)' }),
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('learn')
  const [ratings, setRatings] = useState(loadRatings)
  const [activeCat, setActiveCat] = useState('Alle Themen')
  const [deck, setDeck] = useState(() => buildDeck('Alle Themen', loadRatings()))
  const [idx, setIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [done, setDone] = useState(false)
  const [streak] = useState(getStreak)

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
  useEffect(() => { saveRatings(ratings) }, [ratings])

  // Exam timer
  useEffect(() => {
    if (!examRunning || examFinished || examTime === 0 || examShowAnswer) return
    if (timeLeft <= 0) { handleExamRate('hard'); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [examRunning, examFinished, examTime, examShowAnswer, timeLeft])

  // ── LEARN ───────────────────────────────────────────────────
  const changeCat = (cat) => {
    setActiveCat(cat)
    const d = buildDeck(cat, ratings)
    setDeck(d)
    setIdx(0)
    setShowAnswer(false)
    setDone(false)
  }

  const handleRate = (r) => {
    const card = deck[idx]
    if (!card) return
    const newRatings = { ...ratings, [card.id]: r }
    setRatings(newRatings)
    setShowAnswer(false)
    const next = idx + 1
    if (next >= deck.length) {
      setDone(true)
    } else {
      setIdx(next)
    }
  }

  const restart = () => {
    const d = buildDeck(activeCat, ratings)
    setDeck(d); setIdx(0); setShowAnswer(false); setDone(false)
  }

  const practiceWrong = () => {
    const wrong = CARDS.filter(c => ratings[c.id] === 'hard')
    if (!wrong.length) { alert('Keine falsch beantworteten Karten!'); return }
    setDeck(wrong); setIdx(0); setShowAnswer(false); setDone(false)
  }

  // ── EXAM ────────────────────────────────────────────────────
  const startExam = () => {
    let pool = examCat === 'all' ? [...CARDS] : CARDS.filter(c => c.cat === examCat)
    pool = pool.sort(() => Math.random() - 0.5).slice(0, examCount)
    setExamDeck(pool); setExamIdx(0); setExamRatings({})
    setExamShowAnswer(false); setExamRunning(true); setExamFinished(false)
    setTimeLeft(examTime)
  }

  const handleExamRate = (r) => {
    const card = examDeck[examIdx]
    if (!card) return
    const newER = { ...examRatings, [card.id]: r }
    setExamRatings(newER)
    const newGlobal = { ...ratings, [card.id]: r }
    setRatings(newGlobal)
    setExamShowAnswer(false)
    const next = examIdx + 1
    if (next >= examDeck.length) { setExamFinished(true) }
    else { setExamIdx(next); setTimeLeft(examTime) }
  }

  // ── COMPUTED ─────────────────────────────────────────────────
  const totalAnswered = Object.keys(ratings).length
  const totalEasy = Object.values(ratings).filter(r => r === 'easy').length
  const totalHard = Object.values(ratings).filter(r => r === 'hard').length
  const totalPct = Math.round(totalAnswered / CARDS.length * 100)

  const deckEasy = deck.filter(c => ratings[c.id] === 'easy').length
  const deckMed  = deck.filter(c => ratings[c.id] === 'medium').length
  const deckHard = deck.filter(c => ratings[c.id] === 'hard').length

  const card = deck[idx]
  const examCard = examDeck[examIdx]

  // Done result
  const donePct = deck.length ? Math.round(deckEasy / deck.length * 100) : 0
  const doneEmoji = donePct >= 85 ? '🏆' : donePct >= 65 ? '📈' : '📚'
  const doneMsg = donePct >= 85 ? 'Ausgezeichnet! Prüfungsbereit!' : donePct >= 65 ? 'Gut! Weiterüben lohnt sich.' : 'Gute Übung — die schwachen Karten kommen nächste Runde zuerst.'

  // Exam result
  const exVals = Object.values(examRatings)
  const exEasy = exVals.filter(r => r === 'easy').length
  const exMed  = exVals.filter(r => r === 'medium').length
  const exHard = exVals.filter(r => r === 'hard').length
  const exPct  = exVals.length ? Math.round((exEasy + exMed * 0.5) / exVals.length * 100) : 0

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>

      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={S.logo}>🩺 GynTrainer</div>
          <div style={S.streakBadge}>🔥 {streak} Tage</div>
        </div>
        <div style={S.progressMeta}>
          <span>{totalAnswered} von {CARDS.length} Karten bewertet</span>
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

          {/* Stats */}
          <div style={S.statsRow}>
            <div style={S.statCard}><div style={S.statNum('#1d9e75')}>{deckEasy}</div><div style={S.statLabel}>✓ Gewusst</div></div>
            <div style={S.statCard}><div style={S.statNum('#d68910')}>{deckMed}</div><div style={S.statLabel}>≈ Knapp</div></div>
            <div style={S.statCard}><div style={S.statNum('#c0392b')}>{deckHard}</div><div style={S.statLabel}>✗ Nochmals</div></div>
          </div>

          {/* Category chips */}
          <div style={S.catScroll}>
            {CATEGORIES.map(cat => {
              const n = cat === 'Alle Themen' ? CARDS.length : CARDS.filter(c => c.cat === cat).length
              const done2 = cat === 'Alle Themen'
                ? totalAnswered
                : CARDS.filter(c => c.cat === cat && ratings[c.id]).length
              return (
                <button key={cat} style={S.catChip(cat === activeCat)} onClick={() => changeCat(cat)}>
                  {cat} ({done2}/{n})
                </button>
              )
            })}
          </div>

          {!done ? (
            <>
              {/* CARD */}
              <div style={S.cardHint}>Karte antippen → Antwort sehen → bewerten</div>

              {!showAnswer ? (
                /* FRONT */
                <div style={S.cardWrap} onClick={() => setShowAnswer(true)}>
                  <div style={S.cardTopRow}>
                    <span style={S.catTag(false)}>{card?.cat}</span>
                    <span style={S.posBadge(false)}>{idx + 1} / {deck.length}</span>
                  </div>
                  <div style={S.question}>{card?.q}</div>
                  <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                    ↓ Antippen für Antwort
                  </div>
                </div>
              ) : (
                /* BACK */
                <div style={S.cardWrapBack} onClick={() => setShowAnswer(false)}>
                  <div style={S.cardTopRow}>
                    <span style={S.catTag(true)}>Antwort</span>
                    <span style={S.posBadge(true)}>{idx + 1} / {deck.length}</span>
                  </div>
                  <div style={S.ansLabel}>Korrekte Antwort</div>
                  <div style={S.answer}>{card?.a}</div>
                </div>
              )}

              {/* BEWERTUNG */}
              {showAnswer && (
                <div style={S.actionRow}>
                  <button style={S.btnHard} onClick={() => handleRate('hard')}>
                    <span style={{ fontSize: 18 }}>✗</span>Nochmals
                  </button>
                  <button style={S.btnMed} onClick={() => handleRate('medium')}>
                    <span style={{ fontSize: 18 }}>≈</span>Knapp
                  </button>
                  <button style={S.btnEasy} onClick={() => handleRate('easy')}>
                    <span style={{ fontSize: 18 }}>✓</span>Gewusst
                  </button>
                </div>
              )}

              {/* NAV */}
              {!showAnswer && (
                <div style={S.navRow}>
                  <button style={S.navBtn(idx === 0)} disabled={idx === 0} onClick={() => { setIdx(i => i - 1); setShowAnswer(false) }}>← Zurück</button>
                  <span style={S.navPos}>{idx + 1} / {deck.length}</span>
                  <button style={S.navBtn(idx >= deck.length - 1)} disabled={idx >= deck.length - 1} onClick={() => { setIdx(i => i + 1); setShowAnswer(false) }}>Weiter →</button>
                </div>
              )}
            </>
          ) : (
            /* DONE */
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
              <button style={S.btnOutline} onClick={practiceWrong}>🎯 Nur falsche</button>
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
            <div style={S.bigStat}><div style={S.bigNum}>{totalHard}</div><div style={S.bigLbl}>✗ Noch schwach</div></div>
          </div>
          <div style={S.sectionLbl}>Fortschritt nach Thema</div>
          {[...new Set(CARDS.map(c => c.cat))].sort().map(cat => {
            const cc = CARDS.filter(c => c.cat === cat)
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
          <button style={S.btnReset} onClick={() => {
            if (window.confirm('Gesamten Fortschritt wirklich löschen?')) {
              setRatings({}); saveRatings({})
              changeCat(activeCat)
            }
          }}>🗑 Fortschritt zurücksetzen</button>
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
                    {[...new Set(CARDS.map(c => c.cat))].sort().map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button style={S.btnStartExam} onClick={startExam}>⏱ Prüfung starten</button>
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
