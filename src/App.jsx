import { useState, useMemo, useEffect } from 'react'
import { supabase } from './supabase.js'
import MindMap from './MindMap'

const FORMATS = ['APDA', 'BP', 'LD', 'Policy']
const SIDES = ['Government', 'Opposition']
const SETTINGS = ['Dinner party', 'Bar / pub', 'Road trip', 'Family gathering', 'Coffee shop', 'College dorm', 'Office lunch']
const VIBES = ['Friendly', 'Heated', 'Comedic', 'Intellectual']
const GROUP_SIZES = ['2 friends', '3-4 people', '5+ people']
const CATEGORIES = ['Politics', 'Philosophy', 'Tech', 'Economics', 'Ethics', 'Culture', 'International', 'Science']
const DIFFICULTIES = ['Novice', 'Intermediate', 'Advanced']
const JUDGE_TAGS = ['Strong Warrant', 'Dropped Arg', 'Good Turn', 'New in Rebuttal', 'Assertion', 'Key Clash']

const APDA_SPEECHES_2V2 = [
  { speaker: 'PM', title: 'Prime Minister Constructive', side: 'gov', duration: '7 min' },
  { speaker: 'LO', title: 'Leader of Opposition', side: 'opp', duration: '8 min' },
  { speaker: 'MG', title: 'Member of Government', side: 'gov', duration: '8 min' },
  { speaker: 'MO', title: 'Member of Opposition', side: 'opp', duration: '8 min' },
  { speaker: 'LOR', title: 'Leader of Opp Rebuttal', side: 'opp', duration: '4 min' },
  { speaker: 'PMR', title: 'PM Rebuttal', side: 'gov', duration: '5 min' },
]
const SPEECHES_1V1 = [
  { speaker: 'Speaker A', title: 'First Constructive', side: 'gov', duration: '5 min' },
  { speaker: 'Speaker B', title: 'First Response', side: 'opp', duration: '5 min' },
  { speaker: 'Speaker A', title: 'Rebuttal', side: 'gov', duration: '3 min' },
  { speaker: 'Speaker B', title: 'Rebuttal', side: 'opp', duration: '3 min' },
]

const COLOR_PALETTES = [
  { primary: '#818cf8', argument: '#67e8f9', turn: '#fbbf24', ballot: '#6ee7b7', accent: '#c084fc' },
  { primary: '#f472b6', argument: '#a5f3fc', turn: '#fdba74', ballot: '#86efac', accent: '#e879f9' },
  { primary: '#fb923c', argument: '#93c5fd', turn: '#fca5a5', ballot: '#a7f3d0', accent: '#fda4af' },
  { primary: '#a78bfa', argument: '#5eead4', turn: '#fcd34d', ballot: '#6ee7b7', accent: '#f9a8d4' },
  { primary: '#38bdf8', argument: '#c4b5fd', turn: '#fbbf24', ballot: '#86efac', accent: '#fb7185' },
  { primary: '#34d399', argument: '#93c5fd', turn: '#f9a8d4', ballot: '#fde68a', accent: '#a78bfa' },
]

// ─── PHILOSOPHY CONTENT ──────────────────────────────────────────────────────

const PHILOSOPHY_SECTIONS = [
  {
    title: 'How to Build a Case',
    content: `Every great case follows a chain: Mechanism → Arguments → Turns → Ballot Framing.

Your mechanism is the engine. It tells the judge exactly what your side does and why it is unique. Without a tight mechanism, your case is just a collection of opinions.

Arguments need three layers: a claim (what you assert), a warrant (why it is true), and an impact (why it matters). The impact must be terminal. "This is bad" is not an impact. "This leads to the systematic erosion of democratic institutions, affecting billions" is.

Your turn is your flex. Take the strongest thing the other side will say and show how it actually proves your case. This is what separates good debaters from great ones.

Ballot framing is your closing argument. Tell the judge exactly what the round came down to and why your side won that clash. Never leave the ballot to chance.`
  },
  {
    title: 'Weighing',
    content: `Judges need to know why your impacts matter more. Four dimensions:

Magnitude: How many people are affected? Structural arguments affecting billions outweigh individual anecdotes.

Probability: How likely is your impact? A 90% chance of moderate harm can outweigh a 5% chance of catastrophe, depending on the round.

Timeframe: When does your impact hit? Immediate, concrete harms often outweigh speculative long-term benefits because the link chain is shorter and more certain.

Reversibility: Can the harm be undone? Irreversible impacts (death, ecosystem collapse, erosion of rights) demand priority over reversible ones (economic downturns, policy shifts).

Always tell the judge which metric matters most in THIS round and why. Do not just assert your impact is bigger. Prove it.`
  },
  {
    title: 'Philosophical Frameworks',
    content: `Utilitarianism: Maximize aggregate well-being. Use when your side has clear consequentialist advantages. Weigh on magnitude and probability. Vulnerable to: individual rights objections, inability to aggregate disparate harms.

Deontology: Certain actions are inherently right or wrong regardless of consequences. Use when rights, dignity, or consent are at stake. The veil of ignorance is your strongest tool here: if you did not know your position in society, which system would you choose?

Contractualism: Fairness as the organizing principle. Use for institutional design arguments. Ask: could the affected parties reasonably reject this arrangement? If yes, it fails the contractualist test.

Capabilities Approach: People deserve the substantive freedom to achieve well-being. Use for development, education, and freedom arguments. Focus on what people are actually able to do and be, not just formal rights.

The best cases deploy multiple frameworks that converge on the same conclusion. If your argument is right under util AND deont, it becomes very hard to beat.`
  },
  {
    title: 'The Art of the Turn',
    content: `A turn does not just refute the opposition argument. It weaponizes it.

Step 1: Steel-man the opposition. State their argument at its strongest. This builds credibility with the judge and shows you understand the round.

Step 2: Identify the hidden premise. Every argument rests on assumptions. Find the one that, if flipped, makes their argument prove your case.

Step 3: Execute the turn. Show that their own logic, taken to its conclusion, supports your side. The best turns feel inevitable once explained.

Example: They argue "government intervention distorts markets." You turn: "The status quo already has massive government intervention through subsidies to incumbents. Our mechanism actually removes distortion by leveling the playing field. Their argument for free markets is our argument."

A clean turn is worth more than three new arguments because it does double duty: it removes their offense and adds to yours.`
  },
  {
    title: 'Ballot Framing',
    content: `Judges vote on whoever wins the most important argument in the round. Your job is to decide what that argument is.

Frame early. Do not wait until PMR to tell the judge what matters. Establish your framing in the constructive and reinforce it every speech.

Identify the key clash. Every round collapses to 1-2 core tensions. Name them. "This round comes down to whether structural reform or incremental change better serves the most vulnerable."

Weigh explicitly. Do not assume the judge shares your values. Explain why your impact metric is the right one for this round.

Close with conviction. Your last sentence should be a complete, confident articulation of why you win. Not "and that is why we think we might have the better side of the house." Instead: "When you weigh the round, only one side offered a mechanism that addresses the root cause, survived the turn, and proved terminal impact on the most people. That is our side. We are proud to propose."`
  },
  {
    title: 'Tips and Tricks from Top Debaters',
    content: `Speed is not depth. The debater who speaks faster does not win. The debater who warrants deeper wins. One fully developed argument with three layers of warrants beats five assertions every time.

Prep is about angles, not scripts. In prep, do not write out your speech word for word. Instead, brainstorm 5-6 possible angles, pick the 2-3 strongest, and understand them well enough to speak extemporaneously. The best debaters adapt in round; scripted debaters get destroyed on the turn.

POIs are weapons. Use Points of Information strategically. Ask questions that set up your later arguments. If you ask "Does the Gov concede that X leads to Y?" and they say yes, you have just gotten them to build your argument for you. If they say no, you have exposed a contradiction.

The MG is the most important speech. The Member of Government speech is where rounds are won or lost. A great MG does three things: rebuilds the case, answers every opposition argument, and extends the offense. A bad MG just restates the PM. The MG should be your best debater.

Never concede framing. If the other side says "this round is about X," do not accept it unless X is your framing too. Reframe immediately: "They want you to think this is about X. It is not. This round is about Y, and here is why."

Attack the link, not the impact. Most debaters try to argue that the other side's impact does not matter. This is hard because impacts are usually bad things that everyone agrees are bad. Instead, attack the link: argue that their mechanism does not actually cause their impact. This is much easier and much more devastating.

The counterfactual is your best friend. Always articulate what happens if we do not adopt your side. The status quo is rarely good. If you can show that inaction leads to worse outcomes than your proposal, you have won the round even if your proposal has risks.

Your rebuttal speeches should not introduce new arguments. This is a rule, but more importantly, it is good strategy. Rebuttals that try to make new arguments signal that the constructive was weak. Instead, collapse: pick the 1-2 arguments you are winning and go all in. Tell the judge these are the only things that matter.`
  },
  {
    title: 'Debate FAQs',
    content: `Q: What do I do if I get a terrible motion?
A: There is no such thing as a terrible motion, only a lack of creativity. The best rounds in APDA history come from motions that seemed impossible at first. If the motion seems one-sided, that means there is a counterintuitive case waiting to be found. That is where the fun is.

Q: How do I improve at flowing?
A: Flow every round you watch, even practice rounds. Use a two-column format: their argument on the left, your response on the right. After the round, review your flow and identify arguments you missed. The goal is to track every argument through every speech.

Q: How many arguments should my case have?
A: Two to three. Quality over quantity. One fully warranted argument with sub-points is worth more than five assertions. If you have time left after presenting two strong arguments, spend it deepening your warrants and pre-empting opposition, not adding a fourth argument.

Q: What makes a good partner?
A: Complementary skills, not identical ones. If you are a strong analytical thinker, find a partner who is a compelling speaker. If you are great at case construction, find someone who excels at rebuttals. The best teams have a clear division of labor and trust each other in round.

Q: How do I handle nervousness?
A: Channel it. Nervous energy makes you sharper and more passionate. The best debaters are not calm; they are controlled. Take a deep breath before you stand up, make eye contact with the judge, and remind yourself that you know this case better than anyone in the room.

Q: Should I read evidence in round?
A: In APDA, you generally should not read prepared evidence or cards. Instead, internalize the knowledge and present it naturally. Judges are more persuaded by someone who clearly understands the subject matter than by someone reading statistics off a page. That said, having key facts memorized is incredibly useful.

Q: How do I get better at POIs?
A: Listen actively during every speech. Write down 2-3 potential POIs before standing. Only ask POIs that serve your case: either expose a contradiction, force a concession, or set up your argument. Never ask a POI just to seem engaged.`
  },
  {
    title: 'Common Mistakes to Avoid',
    content: `Assertion without warrant. Saying "this policy will fail" is not an argument. Saying "this policy will fail because it assumes rational actors in a market with information asymmetry, which we know from the 2008 financial crisis is unrealistic" is an argument. Every claim needs a because.

Ignoring the other side. If you do not directly engage with their arguments, the judge will assume you cannot. Silence is a concession. Even if you think their argument is weak, say why. "They assert X, but this fails for two reasons" is always better than pretending X was never said.

Trying to win everything. You cannot win every argument in the round. The teams that try to respond to everything end up responding to nothing well. Instead, identify the 2-3 most important clashes, win those, and tell the judge why those are the only things that matter.

Running case you do not understand. If you cannot explain your mechanism in one sentence without jargon, you do not understand it well enough. Judges can tell when a team is parroting something they read versus genuinely understanding the dynamics at play.

Saving your best argument for the rebuttal. Your best argument should be in the constructive. Rebuttals are for collapsing and weighing, not for introducing your strongest material. If the judge first hears your best point in the last speech, they will wonder why you did not say it earlier.

Not signposting. Tell the judge where you are going. "I will address their three arguments in order, then present two additional reasons our side wins." This makes the judge's job easier, and a judge whose job is easy is a judge who follows your logic.`
  },
]

// ─── BACKGROUND GENERATOR ────────────────────────────────────────────────────

function generateBackground(colors) {
  const shapes = []
  const allColors = [colors.primary, colors.argument, colors.turn, colors.ballot, colors.accent]
  const w = 400, h = 400

  for (let i = 0; i < 35; i++) {
    const cx = Math.random() * w
    const cy = Math.random() * h
    const sides = 3 + Math.floor(Math.random() * 4)
    const r = 15 + Math.random() * 45
    const rot = Math.random() * 360
    const color = allColors[Math.floor(Math.random() * allColors.length)]
    const opacity = 0.06 + Math.random() * 0.08

    const points = []
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2 + (rot * Math.PI / 180)
      const jitter = 0.6 + Math.random() * 0.8
      points.push(`${cx + Math.cos(angle) * r * jitter},${cy + Math.sin(angle) * r * jitter}`)
    }
    shapes.push(`<polygon points="${points.join(' ')}" fill="${color}" opacity="${opacity}"/>`)
  }

  for (let i = 0; i < 20; i++) {
    const x1 = Math.random() * w, y1 = Math.random() * h
    const x2 = x1 + (Math.random() - 0.5) * 120, y2 = y1 + (Math.random() - 0.5) * 120
    const color = allColors[Math.floor(Math.random() * allColors.length)]
    shapes.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="0.7" opacity="${0.06 + Math.random() * 0.06}"/>`)
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${shapes.join('')}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// ─── FONT CONSTANTS ──────────────────────────────────────────────────────────

const FONT = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', 'Menlo', monospace",
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const colors = useMemo(() => COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)], [])
  const bgImage = useMemo(() => generateBackground(colors), [colors])

  const [page, setPage] = useState('generator')
  const [motion, setMotion] = useState('')
  const [caseBackground, setCaseBackground] = useState('')
  const [format, setFormat] = useState('APDA')
  const [side, setSide] = useState('Government')
  const [complexity, setComplexity] = useState(3) // 1-5 scale
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('debateos-theme') || 'dark' } catch { return 'dark' } })
  const cycleTheme = () => { const order = ['dark', 'light', 'daytime']; const next = order[(order.indexOf(theme) + 1) % 3]; setTheme(next); try { localStorage.setItem('debateos-theme', next) } catch {} }

  // Case Generator state
  const [caseResult, setCaseResult] = useState(null)
  const [blockResult, setBlockResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('case')
  const [caseFeedback, setCaseFeedback] = useState({}) // { sectionKey: "comment" }
  const [overallFeedback, setOverallFeedback] = useState('')
  const [refineLoading, setRefineLoading] = useState(false)

  // Resolution Generator state
  const [resCat, setResCat] = useState('Philosophy')
  const [resDiff, setResDiff] = useState('Intermediate')
  const [resolutions, setResolutions] = useState(null)
  const [resLoading, setResLoading] = useState(false)
  const [resTopics, setResTopics] = useState([])
  const [resHistory, setResHistory] = useState([])

  // Speech Structures state
  const [speechResult, setSpeechResult] = useState(null)
  const [speechLoading, setSpeechLoading] = useState(false)

  // Casual state
  const [casualTopic, setCasualTopic] = useState('')
  const [casualSetting, setCasualSetting] = useState('Dinner party')
  const [casualVibe, setCasualVibe] = useState('Friendly')
  const [casualGroupSize, setCasualGroupSize] = useState('2 friends')
  const [casualCategory, setCasualCategory] = useState('Philosophy')
  const [casualResult, setCasualResult] = useState(null)
  const [casualLoading, setCasualLoading] = useState(false)

  // Judge state
  const [judgeFormat, setJudgeFormat] = useState('2v2')
  const [judgeNotes, setJudgeNotes] = useState({})
  const [judgeTags, setJudgeTags] = useState({})
  const [judgeResult, setJudgeResult] = useState(null)
  const [judgeLoading, setJudgeLoading] = useState(false)
  const [recording, setRecording] = useState(null) // speaker currently being recorded
  const [speechFeedback, setSpeechFeedback] = useState({}) // { speaker: result }
  const [feedbackLoading, setFeedbackLoading] = useState(null) // speaker loading feedback

  // Philosophy state
  const [expandedPhil, setExpandedPhil] = useState(null)

  const [error, setError] = useState(null)

  // ─── AUTH STATE ─────────────────────────────────────────────────────────
  const [authMode, setAuthMode] = useState(localStorage.getItem('debateos_auth_mode') || 'none') // 'none', 'apikey', 'user'
  const [apiKey, setApiKey] = useState(localStorage.getItem('debateos_api_key') || '')
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [authView, setAuthView] = useState(null) // null, 'signin', 'signup'
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  // Admin state
  const [adminToken, setAdminToken] = useState(sessionStorage.getItem('debateos_admin') || '')
  const [adminKeys, setAdminKeys] = useState([])
  const [adminNewTeam, setAdminNewTeam] = useState('')
  const [adminNewEmail, setAdminNewEmail] = useState('')
  const [adminNewLimit, setAdminNewLimit] = useState(100)

  // Get auth token for API calls
  function getAuthToken() {
    if (apiKey && apiKey.startsWith('dbt_')) return apiKey
    if (apiKey && apiKey.startsWith('sk-ant-')) return apiKey
    if (session?.access_token) return session.access_token
    return null
  }
  const isAnthropicKey = apiKey && apiKey.startsWith('sk-ant-')

  const isAuthenticated = !!getAuthToken()

  // Supabase auth listener
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user || null)
      if (s) { setAuthMode('user'); localStorage.setItem('debateos_auth_mode', 'user') }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch user profile when session changes
  useEffect(() => {
    if (!session?.access_token) { setUserProfile(null); return }
    fetch('/api/admin/usage?limit=0', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      .catch(() => {}) // silently fail — profile is created by middleware on first API call
  }, [session])

  async function signIn() {
    if (!supabase) return setAuthError('Auth not configured')
    setAuthLoading(true); setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
    if (error) setAuthError(error.message)
    else { setAuthView(null); setAuthEmail(''); setAuthPassword('') }
    setAuthLoading(false)
  }

  async function signUp() {
    if (!supabase) return setAuthError('Auth not configured')
    setAuthLoading(true); setAuthError(null)
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword })
    if (error) setAuthError(error.message)
    else { setAuthError(null); setAuthView(null); setAuthEmail(''); setAuthPassword(''); alert('Check your email to confirm your account!') }
    setAuthLoading(false)
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setUser(null); setSession(null); setAuthMode('none')
    localStorage.removeItem('debateos_auth_mode')
  }

  function saveApiKey() {
    if (apiKey.trim()) {
      localStorage.setItem('debateos_api_key', apiKey.trim())
      localStorage.setItem('debateos_auth_mode', 'apikey')
      setAuthMode('apikey')
    }
  }

  function clearApiKey() {
    setApiKey(''); localStorage.removeItem('debateos_api_key')
    setAuthMode('none'); localStorage.removeItem('debateos_auth_mode')
  }

  async function handleUpgrade() {
    const token = getAuthToken()
    if (!token) return setError('Sign in first to upgrade')
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Failed to start checkout')
    } catch (e) { setError(e.message) }
  }

  async function handleManageBilling() {
    const token = getAuthToken()
    if (!token) return
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) { setError(e.message) }
  }

  // Admin functions
  async function fetchAdminKeys() {
    const res = await fetch('/api/admin/keys', { headers: { 'Authorization': `Bearer ${adminToken}` } })
    const data = await res.json()
    if (data.keys) setAdminKeys(data.keys)
  }

  async function createAdminKey() {
    if (!adminNewTeam || !adminNewEmail) return
    await fetch('/api/admin/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ teamName: adminNewTeam, coachEmail: adminNewEmail, dailyLimit: adminNewLimit })
    })
    setAdminNewTeam(''); setAdminNewEmail(''); setAdminNewLimit(100)
    fetchAdminKeys()
  }

  async function revokeAdminKey(id) {
    await fetch(`/api/admin/keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ isActive: false })
    })
    fetchAdminKeys()
  }

  // ─── API HELPERS ─────────────────────────────────────────────────────────

  async function apiCall(url, body, setter, loadSetter) {
    const token = getAuthToken()
    if (!token) { setError('Please sign in or enter an API key to use DebateOS.'); return }
    loadSetter(true)
    setError(null)
    setter(null)
    try {
      // BYOK: route directly to Anthropic if using sk-ant- key
      let res
      if (isAnthropicKey) {
        const sysPrompt = 'You are a world-class APDA parliamentary debate coach. Return valid JSON only, no markdown.'
        const userPrompt = JSON.stringify(body)
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': token,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8000,
            messages: [{ role: 'user', content: sysPrompt + '\n\nGenerate for: ' + userPrompt }],
          })
        })
        const raw = await res.json()
        if (raw.error) throw new Error(raw.error.message || 'Anthropic API error')
        const text = raw.content?.[0]?.text || '{}'
        let data
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
        } catch { throw new Error('Failed to parse AI response as JSON') }
        setter(data)
        return
      }
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error('Server returned an invalid response. The AI may be overloaded — try again in a moment.') }
      if (res.status === 401) throw new Error(data.error || 'Invalid API key or session expired. Please check your credentials.')
      if (res.status === 429) throw new Error(data.error || `Daily limit reached (${data.limit} requests/day). ${data.upgradeUrl ? 'Upgrade to Pro for more.' : 'Contact your team admin.'}`)
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setter(data)
    } catch (e) { setError(e.message) }
    finally { loadSetter(false) }
  }

  function generate() { setActiveTab('case'); setCaseFeedback({}); setOverallFeedback(''); apiCall('/api/generate', { motion: motion.trim(), format, side, background: caseBackground.trim() || undefined, complexity }, setCaseResult, setLoading) }
  function generateBlock() { const opp = side === 'Government' ? 'Opposition' : 'Government'; setActiveTab('block'); apiCall('/api/generate', { motion: motion.trim(), format, side: opp, background: caseBackground.trim() || undefined, complexity }, setBlockResult, setBlockLoading) }
  function refineCase() {
    const currentResult = activeTab === 'case' ? caseResult : blockResult
    const currentSide = activeTab === 'case' ? side : (side === 'Government' ? 'Opposition' : 'Government')
    const setter = activeTab === 'case' ? setCaseResult : setBlockResult
    const feedbackParts = []
    if (overallFeedback.trim()) feedbackParts.push(`Overall direction: ${overallFeedback.trim()}`)
    Object.entries(caseFeedback).forEach(([key, val]) => { if (val.trim()) feedbackParts.push(`On ${key}: ${val.trim()}`) })
    if (!feedbackParts.length) return
    apiCall('/api/refine', { motion: motion.trim(), format, side: currentSide, currentCase: currentResult, feedback: feedbackParts.join('\n') }, setter, setRefineLoading)
  }
  function generateResolutions() {
    apiCall('/api/random-resolutions', { topics: resTopics }, (data) => {
      setResolutions(data)
      if (data) setResHistory(prev => [{ batch: prev.length + 1, items: data, time: new Date().toLocaleTimeString() }, ...prev])
    }, setResLoading)
  }
  function useResolution(r) { setMotion(r.resolution); if (r.background) setCaseBackground(r.background); setPage('generator') }
  function toggleResTopic(t) { setResTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]) }
  function generateSpeechStructure() { apiCall('/api/speech-structure', { motion: motion.trim(), side }, setSpeechResult, setSpeechLoading) }
  function generateCasual() { apiCall('/api/casual', { topic: casualTopic.trim(), setting: casualSetting, groupSize: casualGroupSize, vibe: casualVibe, category: casualCategory }, setCasualResult, setCasualLoading) }

  function toggleTag(speaker, tag) {
    setJudgeTags(prev => {
      const current = prev[speaker] || []
      return { ...prev, [speaker]: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag] }
    })
  }

  function requestAdjudication() {
    const speeches = (judgeFormat === '2v2' ? APDA_SPEECHES_2V2 : SPEECHES_1V1).map(s => ({
      speaker: s.speaker,
      notes: judgeNotes[s.speaker] || '',
      tags: judgeTags[s.speaker] || [],
    }))
    apiCall('/api/adjudicate', { format: judgeFormat, speeches }, setJudgeResult, setJudgeLoading)
  }

  function toggleRecording(speaker) {
    if (recording === speaker) {
      // Stop recording
      if (window._recognition) { window._recognition.stop(); window._recognition = null }
      setRecording(null)
      return
    }
    if (recording) {
      // Stop previous
      if (window._recognition) { window._recognition.stop(); window._recognition = null }
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setError('Speech recognition not supported in this browser. Try Chrome.'); return }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    let finalTranscript = judgeNotes[speaker] || ''
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setJudgeNotes(prev => ({ ...prev, [speaker]: finalTranscript + interim }))
    }
    recognition.onerror = () => { setRecording(null); window._recognition = null }
    recognition.onend = () => { setRecording(null); window._recognition = null }
    recognition.start()
    window._recognition = recognition
    setRecording(speaker)
  }

  async function getSpeechFeedback(speaker) {
    const token = getAuthToken()
    if (!token) { setError('Please sign in or enter an API key.'); return }
    setFeedbackLoading(speaker)
    try {
      const res = await fetch('/api/speech-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          speaker,
          notes: judgeNotes[speaker] || '',
          tags: judgeTags[speaker] || [],
        })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Request failed') }
      const data = await res.json()
      setSpeechFeedback(prev => ({ ...prev, [speaker]: data }))
    } catch (e) { setError(e.message) }
    finally { setFeedbackLoading(null) }
  }

  const anyLoading = loading || blockLoading || resLoading || speechLoading || casualLoading || judgeLoading || refineLoading

  const PAGES = [
    { id: 'generator', label: 'Case Generator' },
    { id: 'resolutions', label: 'Resolutions' },
    { id: 'speeches', label: 'Round Vision' },
    { id: 'casual', label: 'Casual' },
    { id: 'philosophy', label: 'Philosophy' },
    { id: 'judge', label: 'Judge' },
    { id: 'mindmap', label: 'Argument Map' },
    ...(adminToken ? [{ id: 'admin', label: 'Admin' }] : []),
  ]

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div style={S.root}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background-color: #151520; background-image: ${bgImage}; color: #e0e0e6; font-family: ${FONT.sans}; -webkit-font-smoothing: antialiased; }
        ::selection { background: ${colors.primary}40; }
        ${theme === 'light' ? `
          body { background-color: #f0f4ff !important; background-image: none !important; color: #1e293b !important; }
          .page-nav button { color: #64748b !important; }
          [class*="panel"], [style*="1a1a28"] { background: #ffffff !important; border-color: #d1d9e6 !important; }
          textarea, select { background: #f8fafc !important; border-color: #d1d9e6 !important; color: #1e293b !important; }
          textarea::placeholder { color: #94a3b8 !important; }
          .result-section { background: #f8fafc !important; border-color: #e2e8f0 !important; }
          h1, h2, h3, h4, p, span, label, div { color: inherit; }
          input[type="range"] { accent-color: ${colors.primary}; }
        ` : ''}
        ${theme === 'daytime' ? `
          body { background-color: #eef4ff !important; background-image: none !important; color: #1e3a5f !important; }
          .page-nav button { color: #5b7fa5 !important; }
          [class*="panel"], [style*="1a1a28"] { background: #ffffff !important; border-color: #c4d9f2 !important; }
          textarea, select { background: #f0f6ff !important; border-color: #b8d0ed !important; color: #1e3a5f !important; }
          textarea::placeholder { color: #8baac8 !important; }
          .result-section { background: #f5f9ff !important; border-color: #d4e4f7 !important; }
          h1, h2, h3, h4, p, span, label, div { color: inherit; }
          input[type="range"] { accent-color: #3b82f6; }
          ::selection { background: #3b82f630 !important; }
        ` : ''}
        .page-nav button:hover:not([style*="boxShadow"]) { background: #1a1a2810; color: #888899 !important; }
        textarea:focus, select:focus { outline: none; border-color: ${colors.primary} !important; }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .result-section { padding: 20px; background: #12121a; border: 1px solid #1e1e2e; border-bottom: none; }
        .result-section:first-child { border-top-left-radius: 12px; border-top-right-radius: 12px; }
        .result-section:last-child { border-bottom: 1px solid #1e1e2e; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
        @media (max-width: 640px) {
          .turn-grid, .casual-sides { flex-direction: column !important; }
          .turn-arrow, .casual-vs { display: none !important; }
          .button-row { flex-direction: column !important; }
          .page-nav { flex-wrap: wrap !important; gap: 4px !important; }
          .page-nav button { font-size: 11px !important; padding: 6px 10px !important; }
          .timeline-card { margin-left: 20px !important; margin-right: 0 !important; }
          .case-feedback-layout { flex-direction: column !important; }
          .case-feedback-layout > div:last-child { width: 100% !important; position: static !important; }
          body { background-image: none !important; background-color: #151520 !important; }
          .tag-row { flex-wrap: wrap !important; gap: 4px !important; }
          .tag-row button:last-child { width: 100% !important; margin-top: 4px !important; }
          .tag-row button { font-size: 9px !important; padding: 4px 6px !important; }
        }
      `}</style>

      <header style={S.header}>
        <h1 style={S.logo}><span style={{ color: colors.primary }}>Debate</span>OS</h1>
        <p style={S.subtitle}>AI-powered debate toolkit</p>
        <button onClick={cycleTheme} style={{ position: 'absolute', top: 12, right: 20, padding: '4px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', background: theme === 'daytime' ? '#3b82f615' : theme === 'light' ? '#64748b15' : '#f59e0b20', color: theme === 'daytime' ? '#3b82f6' : theme === 'light' ? '#64748b' : '#f59e0b', border: '1px solid ' + (theme === 'daytime' ? '#3b82f630' : theme === 'light' ? '#64748b30' : '#f59e0b40'), borderRadius: 6, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>{{ dark: 'Light', light: 'Daytime', daytime: 'Dark' }[theme]} Mode</button>
      </header>

      {/* ── AUTH BAR ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 780, margin: '0 auto 0', padding: '0 16px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#12121a', border: '1px solid #1e1e2e', borderRadius: 10, fontSize: 13 }}>
          {user ? (
            <>
              <span style={{ color: '#666', fontSize: 11 }}>Signed in as</span>
              <span style={{ color: colors.primary, fontWeight: 600 }}>{user.email}</span>
              <span style={{ flex: 1 }} />
              {userProfile?.plan === 'pro' ? (
                <span onClick={handleManageBilling} style={{ fontSize: 11, color: '#6ee7b7', background: '#6ee7b720', padding: '2px 8px', borderRadius: 6, cursor: 'pointer' }}>PRO</span>
              ) : (
                <button onClick={handleUpgrade} style={{ fontSize: 11, color: '#fbbf24', background: '#fbbf2415', border: '1px solid #fbbf2430', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT.mono }}>Upgrade to Pro</button>
              )}
              <button onClick={signOut} style={{ fontSize: 11, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT.sans }}>Sign Out</button>
            </>
          ) : apiKey && authMode === 'apikey' ? (
            <>
              <span style={{ color: '#666', fontSize: 11 }}>API Key:</span>
              <span style={{ color: colors.primary, fontFamily: FONT.mono, fontSize: 12 }}>{apiKey.slice(0, 12)}...</span>
              <span style={{ flex: 1 }} />
              <button onClick={clearApiKey} style={{ fontSize: 11, color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Change Key</button>
            </>
          ) : authView ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', padding: '4px 0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ flex: 1, padding: '6px 10px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#e0e0e6', fontSize: 13, outline: 'none' }} />
                <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (authView === 'signin' ? signIn() : signUp())} style={{ flex: 1, padding: '6px 10px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#e0e0e6', fontSize: 13, outline: 'none' }} />
                <button onClick={authView === 'signin' ? signIn : signUp} disabled={authLoading} style={{ padding: '6px 14px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: authLoading ? 0.5 : 1 }}>{authLoading ? '...' : authView === 'signin' ? 'Sign In' : 'Sign Up'}</button>
                <button onClick={() => { setAuthView(null); setAuthError(null) }} style={{ fontSize: 11, color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
              </div>
              {authError && <span style={{ color: '#f87171', fontSize: 11 }}>{authError}</span>}
              <span style={{ fontSize: 11, color: '#555' }}>{authView === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}<span onClick={() => setAuthView(authView === 'signin' ? 'signup' : 'signin')} style={{ color: colors.primary, cursor: 'pointer' }}>{authView === 'signin' ? 'Sign Up' : 'Sign In'}</span></span>
            </div>
          ) : (
            <>
              <span style={{ color: '#555', fontSize: 12 }}>Get started:</span>
              <button onClick={() => setAuthView('signin')} style={{ padding: '4px 12px', background: `${colors.primary}20`, color: colors.primary, border: `1px solid ${colors.primary}30`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
              <button onClick={() => setAuthView('signup')} style={{ padding: '4px 12px', background: 'none', color: '#888', border: '1px solid #2a2a3e', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Sign Up</button>
              <span style={{ color: '#333', fontSize: 11 }}>or</span>
              <input type="text" placeholder="Paste API key (dbt_... or sk-ant-...)" value={apiKey} onChange={e => setApiKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApiKey()} style={{ flex: 1, padding: '5px 10px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#e0e0e6', fontSize: 12, fontFamily: FONT.mono, outline: 'none' }} />
              <button onClick={saveApiKey} disabled={!apiKey.trim()} style={{ padding: '4px 10px', background: apiKey.trim() ? colors.primary : '#333', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: apiKey.trim() ? 'pointer' : 'default', opacity: apiKey.trim() ? 1 : 0.4 }}>Save</button>
            </>
          )}
        </div>
      </div>

      <nav className="page-nav" style={S.pageNav}>
        {PAGES.map(p => (
          <button key={p.id} style={{ ...S.pageTab, ...(page === p.id ? { ...S.pageTabActive, color: colors.primary, background: `${colors.primary}15`, borderColor: `${colors.primary}30`, boxShadow: `0 0 0 1px ${colors.primary}20` } : {}) }} onClick={() => setPage(p.id)}>
            {p.label}
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {error && <div style={S.error}><strong>Error:</strong> {error}</div>}

        {/* ── AUTH GATE ─────────────────────────────────────────────── */}
        {!isAuthenticated && page !== 'philosophy' && (
          <div style={{ padding: '48px 28px', background: '#1a1a28', border: '1px solid #1e1e2e', borderRadius: 14, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 4 }}>🔑</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e6', letterSpacing: '-0.01em' }}>API Key Required</h2>
            <p style={{ fontSize: 14, color: '#6b6b80', lineHeight: 1.6, maxWidth: 420 }}>Sign in or enter an API key above to use DebateOS features. You can use a team key (dbt_...) or your own Anthropic key (sk-ant-...).</p>
            <p style={{ fontSize: 12, color: '#444', marginTop: 4 }}>The Philosophy section is free to browse.</p>
          </div>
        )}

        {/* ── CASE GENERATOR ───────────────────────────────────────── */}
        {page === 'generator' && isAuthenticated && (
          <>
            <div style={S.panel}>
              <label style={S.label}>Motion</label>
              <textarea style={S.textarea} rows={3} placeholder="This house would ban private education..." value={motion} onChange={e => setMotion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generate() }} />
              <label style={S.label}>Background <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#444' }}>(optional — philosophical motions often work best without one)</span></label>
              <textarea style={{ ...S.textarea, fontSize: 13 }} rows={2} placeholder="Actor details, scenario constraints, or specific context. Leave blank for abstract/philosophical motions — the AI will just run with the motion structure." value={caseBackground} onChange={e => setCaseBackground(e.target.value)} />
              <div>
                <label style={S.label}>Complexity <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#555' }}>{['', 'Skeleton', 'Quick', 'Standard', 'Deep', 'Competition'][complexity]}</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: '#555', fontFamily: FONT.mono, minWidth: 20 }}>1</span>
                  <input type="range" min={1} max={5} step={1} value={complexity} onChange={e => setComplexity(Number(e.target.value))} style={{ flex: 1, accentColor: colors.primary, cursor: 'pointer' }} />
                  <span style={{ fontSize: 11, color: '#555', fontFamily: FONT.mono, minWidth: 20, textAlign: 'right' }}>5</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {['Skeleton', 'Quick', 'Standard', 'Deep', 'Competition'].map((label, i) => (
                    <span key={label} style={{ fontSize: 10, color: complexity === i + 1 ? colors.primary : '#333', fontFamily: FONT.mono, cursor: 'pointer', transition: 'color 0.15s' }} onClick={() => setComplexity(i + 1)}>{label}</span>
                  ))}
                </div>
              </div>
              <div style={S.row}>
                <Field label="Format"><select style={S.select} value={format} onChange={e => setFormat(e.target.value)}>{FORMATS.map(f => <option key={f}>{f}</option>)}</select></Field>
                <Field label="Side"><select style={S.select} value={side} onChange={e => setSide(e.target.value)}>{SIDES.map(s => <option key={s}>{s}</option>)}</select></Field>
              </div>
              <div className="button-row" style={S.buttonRow}>
                <Btn color={colors.primary} onClick={generate} disabled={anyLoading || !motion.trim()} loading={loading}>Generate Case</Btn>
                <Btn color={colors.turn} outline onClick={generateBlock} disabled={anyLoading || !motion.trim()} loading={blockLoading}>Generate Tight-block</Btn>
              </div>
            </div>
            {(loading || blockLoading) && !caseResult && !blockResult && <Skeleton />}
            {(caseResult || blockResult) && (
              <>
                {caseResult && blockResult && (
                  <div style={S.tabBar}>
                    <button style={{ ...S.tab, ...(activeTab === 'case' ? { ...S.tabActive, color: colors.primary, borderColor: `${colors.primary}40` } : {}) }} onClick={() => setActiveTab('case')}>Your Case ({side})</button>
                    <button style={{ ...S.tab, ...(activeTab === 'block' ? { ...S.tabActive, color: colors.turn, borderColor: `${colors.turn}40` } : {}) }} onClick={() => setActiveTab('block')}>Tight-block</button>
                  </div>
                )}
                <div className="case-feedback-layout" style={S.caseFeedbackLayout}>
                  <div style={S.caseColumn}>
                    <CaseDisplay result={activeTab === 'case' ? caseResult : blockResult} sideName={activeTab === 'case' ? side : (side === 'Government' ? 'Opposition' : 'Government')} formatName={format} isBlock={activeTab === 'block'} colors={colors} setPage={setPage} />
                  </div>
                  <div style={S.feedbackColumn}>
                    <div style={S.feedbackPanel}>
                      <h3 style={{ ...S.sectionTitle, color: colors.accent, marginBottom: 14 }}>FEEDBACK</h3>
                      <label style={S.label}>Overall Direction</label>
                      <textarea style={{ ...S.textarea, minHeight: 70, fontSize: 13 }} placeholder="e.g., Incorporate stronger empirical examples, make the mechanism more specific..." value={overallFeedback} onChange={e => setOverallFeedback(e.target.value)} />

                      {(activeTab === 'case' ? caseResult : blockResult) && (
                        <>
                          <FeedbackNote label="Round Vision" sectionKey="roundVision" feedback={caseFeedback} setFeedback={setCaseFeedback} />
                          <FeedbackNote label="Mechanism" sectionKey="mechanism" feedback={caseFeedback} setFeedback={setCaseFeedback} />
                          {(activeTab === 'case' ? caseResult : blockResult).arguments.map((arg, i) => (
                            <FeedbackNote key={i} label={arg.label} sectionKey={`arg-${i}`} feedback={caseFeedback} setFeedback={setCaseFeedback} />
                          ))}
                          <FeedbackNote label="Turn" sectionKey="turn" feedback={caseFeedback} setFeedback={setCaseFeedback} />
                          <FeedbackNote label="Ballot Framing" sectionKey="ballot" feedback={caseFeedback} setFeedback={setCaseFeedback} />
                        </>
                      )}

                      <Btn color={colors.accent} onClick={refineCase} disabled={anyLoading || (!overallFeedback.trim() && !Object.values(caseFeedback).some(v => v.trim()))} loading={refineLoading} style={{ marginTop: 12 }}>
                        Refine Case
                      </Btn>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── RESOLUTION GENERATOR ─────────────────────────────────── */}
        {page === 'resolutions' && isAuthenticated && (
          <>
            <div style={{ ...S.panel, alignItems: 'center', padding: 36 }}>
              <p style={{ fontSize: 15, color: '#6b6b80', textAlign: 'center', marginBottom: 12 }}>Generate random debate motions, resolutions, and case prompts.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                {['Finance', 'Philosophy', 'Politics', 'Technology', 'Ethics', 'International Relations', 'Science', 'Culture', 'Law', 'Environment'].map(t => {
                  const active = resTopics.includes(t)
                  return (
                    <button key={t} onClick={() => toggleResTopic(t)} style={{ ...S.topicChip, ...(active ? { background: `${colors.accent}25`, color: colors.accent, borderColor: `${colors.accent}50` } : {}) }}>
                      {t}
                    </button>
                  )
                })}
              </div>
              {resTopics.length > 0 && <p style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Focused on: {resTopics.join(', ')}</p>}
              <Btn color={colors.accent} onClick={generateResolutions} disabled={anyLoading} loading={resLoading} style={{ maxWidth: 320, fontSize: 18, padding: '16px 32px' }}>Roll</Btn>
            </div>
            {resLoading && <Skeleton />}
            {resolutions && (
              <div style={S.cardList}>
                {resolutions.map((r, i) => (
                  <div key={i} style={{ ...S.resCard, borderLeftColor: r.type === 'background' ? colors.accent : colors.primary }}>
                    <div style={S.resHeader}>
                      <span style={{ ...S.badge, color: r.type === 'background' ? colors.accent : colors.primary, background: `${r.type === 'background' ? colors.accent : colors.primary}15`, borderColor: `${r.type === 'background' ? colors.accent : colors.primary}30` }}>{r.type === 'background' ? 'BACKGROUND' : 'VAGUE'}</span>
                      <span style={{ ...S.badge, color: '#666', background: '#1e1e2e', borderColor: '#2a2a3d' }}>{r.difficulty}</span>
                    </div>
                    <p style={S.resText}>{r.resolution}</p>
                    {r.background && <p style={S.resBg}>{r.background}</p>}
                    <button style={S.buildCaseBtn} onClick={() => useResolution(r)}>Build Case →</button>
                  </div>
                ))}
              </div>
            )}
            {resHistory.length > 1 && (
              <div style={S.cardList}>
                {resHistory.slice(1).map((batch, bi) => (
                  <div key={bi}>
                    <div style={S.historyDivider}><span style={S.historyLabel}>Roll #{batch.batch} · {batch.time}</span></div>
                    {batch.items.map((r, i) => (
                      <div key={i} style={{ ...S.resCard, borderLeftColor: r.type === 'background' ? colors.accent : colors.primary, opacity: 0.7, marginBottom: 8 }}>
                        <p style={S.resText}>{r.resolution}</p>
                        <button style={S.buildCaseBtn} onClick={() => useResolution(r)}>Build Case →</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SPEECH STRUCTURES ─────────────────────────────────────── */}
        {page === 'speeches' && isAuthenticated && (
          <>
            <div style={S.panel}>
              <p style={{ fontSize: 14, color: '#6b6b80', marginBottom: 8, lineHeight: 1.6 }}>
                Map out how a full round unfolds. See what each speaker should aim for, the strategic intention behind every speech, and the key moments that decide the ballot.
              </p>
              <label style={S.label}>Motion</label>
              <textarea style={S.textarea} rows={3} placeholder="Enter the motion to map the round..." value={motion} onChange={e => setMotion(e.target.value)} />
              <Field label="Your Side"><select style={S.select} value={side} onChange={e => setSide(e.target.value)}>{SIDES.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Btn color={colors.argument} onClick={generateSpeechStructure} disabled={anyLoading || !motion.trim()} loading={speechLoading}>Map the Round</Btn>
            </div>
            {speechLoading && <Skeleton />}
            {speechResult && (
              <div style={S.timeline}>
                <div style={{ ...S.timelineOverview, borderColor: `${colors.argument}30` }}>
                  <p style={S.overviewText}>{speechResult.overview}</p>
                </div>
                <div style={S.timelineLine}>
                  {speechResult.speeches.map((sp, i) => {
                    const isGov = sp.side === 'Government'
                    const col = isGov ? colors.primary : colors.turn
                    return (
                      <div key={i} className="timeline-card" style={{ ...S.timelineCard, borderLeftColor: col, marginLeft: isGov ? 0 : 40, marginRight: isGov ? 40 : 0 }}>
                        <div style={S.speechHeader}>
                          <span style={{ ...S.badge, color: col, background: `${col}15`, borderColor: `${col}30` }}>{sp.speaker}</span>
                          <span style={S.speechDuration}>{sp.duration}</span>
                        </div>
                        <h4 style={{ ...S.speechTitle, color: col }}>{sp.title}</h4>
                        <div style={S.speechBlock}><span style={S.speechLabel}>INTENTION</span><p style={S.bodyText}>{sp.intention}</p></div>
                        <div style={S.speechBlock}><span style={S.speechLabel}>CONTENT</span><p style={S.bodyText}>{sp.content}</p></div>
                        <div style={S.speechBlock}><span style={S.speechLabel}>KEY MOMENT</span><p style={{ ...S.bodyText, fontStyle: 'italic', color: col }}>{sp.keyMoment}</p></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CASUAL DEBATE ────────────────────────────────────────── */}
        {page === 'casual' && isAuthenticated && (
          <>
            <div style={S.panel}>
              <label style={S.label}>Topic</label>
              <textarea style={S.textarea} rows={2} placeholder="Is a hot dog a sandwich?..." value={casualTopic} onChange={e => setCasualTopic(e.target.value)} />
              <div style={S.row}>
                <Field label="Setting"><select style={S.select} value={casualSetting} onChange={e => setCasualSetting(e.target.value)}>{SETTINGS.map(s => <option key={s}>{s}</option>)}</select></Field>
                <Field label="Group Size"><select style={S.select} value={casualGroupSize} onChange={e => setCasualGroupSize(e.target.value)}>{GROUP_SIZES.map(s => <option key={s}>{s}</option>)}</select></Field>
              </div>
              <div style={S.row}>
                <Field label="Vibe"><select style={S.select} value={casualVibe} onChange={e => setCasualVibe(e.target.value)}>{VIBES.map(v => <option key={v}>{v}</option>)}</select></Field>
                <Field label="Category"><select style={S.select} value={casualCategory} onChange={e => setCasualCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
              </div>
              <Btn color={colors.ballot} onClick={generateCasual} disabled={anyLoading || !casualTopic.trim()} loading={casualLoading}>Start the Debate</Btn>
            </div>
            {casualLoading && <Skeleton />}
            {casualResult && (
              <div style={S.cardList}>
                <div style={{ ...S.casualFraming, borderColor: `${colors.ballot}30` }}><p style={S.casualFramingText}>{casualResult.topicFraming}</p></div>
                <div className="casual-sides" style={S.casualSides}>
                  <CasualSide data={casualResult.sideA} color={colors.primary} label="A" />
                  <div className="casual-vs" style={S.casualVs}>VS</div>
                  <CasualSide data={casualResult.sideB} color={colors.turn} label="B" />
                </div>
                {casualResult.provocations && casualResult.provocations.length > 0 && (
                  <div style={S.panel}>
                    <h3 style={{ ...S.sectionTitle, color: colors.accent }}>IF THE CONVERSATION STALLS...</h3>
                    {casualResult.provocations.map((p, i) => <p key={i} style={S.provocation}>{p}</p>)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── PHILOSOPHY ───────────────────────────────────────────── */}
        {page === 'philosophy' && (
          <div style={S.cardList}>
            {PHILOSOPHY_SECTIONS.map((sec, i) => (
              <div key={i} style={{ ...S.philCard, borderLeftColor: [colors.primary, colors.argument, colors.turn, colors.ballot, colors.accent][i % 5] }} onClick={() => setExpandedPhil(expandedPhil === i ? null : i)}>
                <div style={S.philHeader}>
                  <h3 style={{ ...S.philTitle, color: [colors.primary, colors.argument, colors.turn, colors.ballot, colors.accent][i % 5] }}>{sec.title}</h3>
                  <span style={S.philToggle}>{expandedPhil === i ? '−' : '+'}</span>
                </div>
                {expandedPhil === i && (
                  <div style={S.philContent}>
                    {sec.content.split('\n\n').map((p, j) => <p key={j} style={S.philParagraph}>{p}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── JUDGE ────────────────────────────────────────────────── */}
        {page === 'judge' && isAuthenticated && (
          <>
            <div style={S.panel}>
              <Field label="Format">
                <select style={S.select} value={judgeFormat} onChange={e => { setJudgeFormat(e.target.value); setJudgeNotes({}); setJudgeTags({}); setJudgeResult(null) }}>
                  <option value="2v2">2v2 (APDA)</option>
                  <option value="1v1">1v1</option>
                </select>
              </Field>
            </div>

            <div style={S.cardList}>
              {(judgeFormat === '2v2' ? APDA_SPEECHES_2V2 : SPEECHES_1V1).map((sp, i) => {
                const col = sp.side === 'gov' ? colors.primary : colors.turn
                return (
                  <div key={i} style={{ ...S.judgeCard, borderLeftColor: col }}>
                    <div style={S.judgeCardHeader}>
                      <span style={{ ...S.badge, color: col, background: `${col}15`, borderColor: `${col}30` }}>{sp.speaker}</span>
                      <span style={S.speechDuration}>{sp.title} · {sp.duration}</span>
                      <button
                        style={{ ...S.recBtn, ...(recording === sp.speaker ? { background: '#f43f5e', color: '#fff', borderColor: '#f43f5e' } : { borderColor: `${col}50`, color: col }) }}
                        onClick={() => toggleRecording(sp.speaker)}
                      >
                        {recording === sp.speaker ? '⏹ Stop' : '🎙 Record'}
                      </button>
                    </div>
                    <textarea
                      style={{ ...S.textarea, minHeight: 80, ...(recording === sp.speaker ? { borderColor: '#f43f5e' } : {}) }}
                      placeholder={recording === sp.speaker ? 'Listening... speak now' : `Notes for ${sp.speaker}...`}
                      value={judgeNotes[sp.speaker] || ''}
                      onChange={e => setJudgeNotes(prev => ({ ...prev, [sp.speaker]: e.target.value }))}
                    />
                    <div className="tag-row" style={S.tagRow}>
                      {JUDGE_TAGS.map(tag => {
                        const active = (judgeTags[sp.speaker] || []).includes(tag)
                        return (
                          <button key={tag} style={{ ...S.tag, ...(active ? { background: `${col}25`, color: col, borderColor: `${col}50` } : {}) }} onClick={() => toggleTag(sp.speaker, tag)}>
                            {tag}
                          </button>
                        )
                      })}
                      <button
                        style={{ ...S.tag, marginLeft: 'auto', background: `${col}15`, color: col, borderColor: `${col}40` }}
                        onClick={() => getSpeechFeedback(sp.speaker)}
                        disabled={!judgeNotes[sp.speaker] || feedbackLoading === sp.speaker}
                      >
                        {feedbackLoading === sp.speaker ? '...' : 'Get Feedback'}
                      </button>
                    </div>
                    {speechFeedback[sp.speaker] && (
                      <div style={{ ...S.feedbackBox, borderColor: `${col}30` }}>
                        <div style={S.feedbackHeader}>
                          <span style={{ ...S.feedbackGrade, color: col }}>{speechFeedback[sp.speaker].grade}</span>
                          <span style={S.monoLabel}>FEEDBACK</span>
                        </div>
                        <div style={S.feedbackSection}>
                          <span style={{ ...S.monoLabel, color: colors.ballot }}>STRENGTHS</span>
                          {speechFeedback[sp.speaker].strengths.map((s, j) => <p key={j} style={S.feedbackItem}>+ {s}</p>)}
                        </div>
                        <div style={S.feedbackSection}>
                          <span style={{ ...S.monoLabel, color: '#f43f5e' }}>IMPROVE</span>
                          {speechFeedback[sp.speaker].improvements.map((s, j) => <p key={j} style={S.feedbackItem}>→ {s}</p>)}
                        </div>
                        <p style={{ ...S.bodyText, fontStyle: 'italic', marginTop: 8 }}>{speechFeedback[sp.speaker].tacticalNote}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <Btn color={colors.accent} onClick={requestAdjudication} disabled={anyLoading} loading={judgeLoading} style={{ marginTop: 8 }}>Request AI Adjudication</Btn>
            {judgeLoading && <Skeleton />}
            {judgeResult && (
              <div style={S.cardList}>
                <div style={{ ...S.decisionBanner, borderColor: judgeResult.decision === 'Government' ? colors.primary : colors.turn }}>
                  <span style={{ ...S.decisionLabel, color: judgeResult.decision === 'Government' ? colors.primary : colors.turn }}>DECISION</span>
                  <h2 style={{ ...S.decisionText, color: judgeResult.decision === 'Government' ? colors.primary : colors.turn }}>{judgeResult.decision}</h2>
                  <span style={{ ...S.badge, color: '#999', background: '#1e1e2e', borderColor: '#2a2a3d' }}>{judgeResult.confidence}</span>
                </div>
                <div style={S.panel}>
                  <span style={{ ...S.speechLabel, color: colors.accent }}>KEY CLASH</span>
                  <p style={{ ...S.bodyText, fontStyle: 'italic' }}>{judgeResult.keyClash}</p>
                </div>
                <div style={S.panel}>
                  <span style={S.speechLabel}>REASONING</span>
                  {judgeResult.reasoning.split('\n\n').map((p, i) => <p key={i} style={{ ...S.bodyText, marginBottom: 12 }}>{p}</p>)}
                </div>
                {judgeResult.speechAnalysis && judgeResult.speechAnalysis.map((sa, i) => {
                  const sp = (judgeFormat === '2v2' ? APDA_SPEECHES_2V2 : SPEECHES_1V1).find(s => s.speaker === sa.speaker)
                  const col = sp && sp.side === 'gov' ? colors.primary : colors.turn
                  return (
                    <div key={i} style={{ ...S.panel, borderLeft: `3px solid ${col}` }}>
                      <span style={{ ...S.badge, color: col, background: `${col}15`, borderColor: `${col}30`, marginBottom: 8 }}>{sa.speaker}</span>
                      <p style={S.bodyText}>{sa.assessment}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
        {/* ── ADMIN ────────────────────────────────────────────── */}
        {page === 'admin' && isAuthenticated && adminToken && (
          <>
            <div style={S.panel}>
              <h2 style={{ color: colors.primary, fontFamily: FONT.mono, fontSize: 16, marginBottom: 16 }}>Team API Keys</h2>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Team name" value={adminNewTeam} onChange={e => setAdminNewTeam(e.target.value)} style={{ ...S.textarea, flex: 1, minWidth: 140, padding: '8px 10px', fontSize: 13 }} />
                <input type="email" placeholder="Coach email" value={adminNewEmail} onChange={e => setAdminNewEmail(e.target.value)} style={{ ...S.textarea, flex: 1, minWidth: 180, padding: '8px 10px', fontSize: 13 }} />
                <input type="number" placeholder="Daily limit" value={adminNewLimit} onChange={e => setAdminNewLimit(Number(e.target.value))} style={{ ...S.textarea, width: 90, padding: '8px 10px', fontSize: 13 }} />
                <button onClick={createAdminKey} style={{ padding: '8px 16px', background: colors.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Create Key</button>
              </div>
              <button onClick={fetchAdminKeys} style={{ padding: '6px 14px', background: '#1a1a2e', color: '#888', border: '1px solid #2a2a3e', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>Refresh</button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {adminKeys.map(k => (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: k.is_active ? '#e0e0e6' : '#555', minWidth: 120 }}>{k.team_name}</span>
                    <span style={{ color: '#555', fontSize: 11 }}>{k.coach_email}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: '#444', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(k.key); }}>{k.key.slice(0, 16)}... (click to copy)</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontFamily: FONT.mono, color: colors.primary, fontSize: 11 }}>{k.todayUsage || 0}/{k.daily_limit}</span>
                    <span style={{ fontFamily: FONT.mono, color: '#555', fontSize: 10 }}>total: {k.totalUsage || 0}</span>
                    {k.is_active ? (
                      <button onClick={() => revokeAdminKey(k.id)} style={{ padding: '3px 8px', background: '#f8717120', color: '#f87171', border: '1px solid #f8717140', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Revoke</button>
                    ) : (
                      <span style={{ fontSize: 10, color: '#f87171' }}>Revoked</span>
                    )}
                  </div>
                ))}
                {adminKeys.length === 0 && <p style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: 20 }}>No keys yet. Create one above, then click Refresh.</p>}
              </div>
            </div>
          </>
        )}
        {/* ARGUMENT MAP */}
        {page === 'mindmap' && isAuthenticated && (
          <>
            {(caseResult || blockResult) ? (
              <MindMap
                result={activeTab === 'case' ? caseResult : blockResult}
                motion={motion}
                colors={colors}
              />
            ) : (
              <div style={S.panel}>
                <p style={{ fontSize: 15, color: '#6b6b80', textAlign: 'center', lineHeight: 1.6, padding: 24 }}>Generate a case first, then come here to see it as an interactive argument map.</p>
                <button style={{ ...S.button, background: colors.primary, color: '#fff', border: 'none', maxWidth: 240, alignSelf: 'center' }} onClick={() => setPage('generator')}>Go to Case Generator</button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

function Skeleton() {
  const skelBar = (w, h = 12, mb = 10) => ({ height: h, width: w, background: 'linear-gradient(90deg, #1e1e2e 25%, #252535 50%, #1e1e2e 75%)', backgroundSize: '200% 100%', borderRadius: 6, marginBottom: mb, animation: 'shimmer 1.5s ease-in-out infinite' })
  return (
    <div style={{ padding: 24, background: '#1a1a28', borderRadius: 12, borderWidth: 1, borderStyle: 'solid', borderColor: '#1e1e2e', marginTop: 16 }}>
      <div style={skelBar('30%', 10, 12)} />
      <div style={skelBar('45%', 16, 18)} />
      <div style={skelBar('95%', 12, 8)} />
      <div style={skelBar('88%', 12, 8)} />
      <div style={skelBar('72%', 12, 20)} />
      <div style={skelBar('25%', 10, 12)} />
      <div style={skelBar('92%', 12, 8)} />
      <div style={skelBar('85%', 12, 8)} />
      <div style={skelBar('78%', 12, 8)} />
      <div style={skelBar('60%', 12, 0)} />
    </div>
  )
}

function FeedbackNote({ label, sectionKey, feedback, setFeedback }) {
  const [open, setOpen] = useState(false)
  const val = feedback[sectionKey] || ''
  return (
    <div style={S.feedbackNote}>
      <button style={S.feedbackNoteToggle} onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 12, color: val.trim() ? '#6ee7b7' : '#555566' }}>{val.trim() ? '●' : '○'}</span>
        <span style={S.feedbackNoteLabel}>{label}</span>
        <span style={{ marginLeft: 'auto', color: '#555', fontSize: 12 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <textarea
          style={{ ...S.textarea, fontSize: 12, minHeight: 50, marginTop: 6 }}
          placeholder={`Notes on ${label}...`}
          value={val}
          onChange={e => setFeedback(prev => ({ ...prev, [sectionKey]: e.target.value }))}
        />
      )}
    </div>
  )
}

function Field({ label, children }) {
  return <div style={S.field}><label style={S.label}>{label}</label>{children}</div>
}

function Btn({ color, outline, onClick, disabled, loading, children, style }) {
  const base = disabled
    ? { background: '#2a2a3d', color: '#555', cursor: 'not-allowed', borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent' }
    : outline
      ? { background: 'transparent', borderWidth: 1, borderStyle: 'solid', borderColor: `${color}60`, color }
      : { background: color, color: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: color }
  return (
    <button style={{ ...S.button, ...base, flex: 1, ...style }} onClick={onClick} disabled={disabled}>
      {loading ? <span style={S.loadingText}><span style={S.dot}>●</span> Generating...</span> : children}
    </button>
  )
}

function CaseDisplay({ result, sideName, formatName, isBlock, colors, setPage }) {
  if (!result) return null
  return (
    <div style={S.resultPanel}>
      <div style={S.resultHeader}>
        <span style={{ ...S.badge, color: isBlock ? colors.turn : colors.primary, background: `${isBlock ? colors.turn : colors.primary}15`, borderColor: `${isBlock ? colors.turn : colors.primary}30` }}>{isBlock ? 'Tight-block' : sideName}</span>
        <span style={{ ...S.badge, color: '#666', background: '#1e1e2e', borderColor: '#2a2a3d' }}>{formatName}</span>
      </div>
      {result.roundVision && (
        <div style={{ ...S.roundVision, borderColor: `${colors.primary}30` }}>
          <span style={{ ...S.monoLabel, color: colors.primary }}>ROUND VISION</span>
          <p style={{ ...S.bodyText, fontStyle: 'italic' }}>{result.roundVision}</p>
        </div>
      )}
      <Section title="MECHANISM" color={colors.primary}><p style={S.mechText}>{result.mechanism}</p></Section>
      <Divider label="CONSTRUCTIVE" />
      {result.arguments.map((arg, i) => (
        <Section key={i} title={arg.label.toUpperCase()} color={colors.argument}>
          <div style={S.argBlocks}>
            <Block label="Claim" text={arg.claim} color={colors.primary} />
            <Block label="Warrant" text={arg.warrant} color={colors.argument} />
            <Block label="Impact" text={arg.impact} color="#f43f5e" />
          </div>
        </Section>
      ))}
      {result.spikes && result.spikes.length > 0 && (
        <>
          <Divider label="PRE-EMPTS" />
          {result.spikes.map((spike, i) => (
            <div key={i} style={S.spikeCard}>
              <span style={{ ...S.monoLabel, color: colors.accent }}>{spike.label}</span>
              <p style={S.bodyText}>{spike.response}</p>
            </div>
          ))}
        </>
      )}
      <Divider label="REBUTTAL" />
      <Section title="STRONGEST OPPOSITION + TURN" color={colors.turn}>
        <div className="turn-grid" style={S.turnGrid}>
          <div style={S.turnBlock}><span style={{ ...S.monoLabel, color: colors.turn }}>THEIR ARGUMENT</span><p style={S.bodyText}>{result.turn.opposingArgument}</p></div>
          <div className="turn-arrow" style={{ ...S.turnArrow, color: colors.turn }}>&#x27F6;</div>
          <div style={S.turnBlock}><span style={{ ...S.monoLabel, color: colors.turn }}>THE TURN</span><p style={S.bodyText}>{result.turn.turn}</p></div>
        </div>
      </Section>
      <Divider label="CLOSING" />
      <Section title="BALLOT FRAMING" color={colors.ballot}><p style={{ ...S.ballotText, borderLeftColor: `${colors.ballot}40` }}>{result.ballotFraming}</p></Section>
      {setPage && (
        <div style={S.crossTabLinks}>
          <button style={{ ...S.crossTabBtn, color: colors.argument, borderColor: `${colors.argument}40` }} onClick={() => setPage('speeches')}>Map This Round →</button>
          <button style={{ ...S.crossTabBtn, color: colors.turn, borderColor: `${colors.turn}40` }} onClick={() => setPage('judge')}>Practice Judging →</button>
          <button style={{ ...S.crossTabBtn, color: colors.accent, borderColor: `${colors.accent}40` }} onClick={() => setPage('mindmap')}>Argument Map →</button>
        </div>
      )}
    </div>
  )
}

function Section({ title, color, children }) {
  return (
    <div className="result-section" style={{ borderLeft: `3px solid ${color}` }}>
      <h2 style={{ ...S.sectionTitle, color }}>{title}</h2>
      {children}
    </div>
  )
}

function Block({ label, text, color }) {
  return (
    <div style={S.block}>
      <div style={S.blockLabelRow}><span style={{ ...S.blockDot, background: color }} /><span style={S.monoLabel}>{label}</span></div>
      <p style={S.blockText}>{text}</p>
    </div>
  )
}

function Divider({ label }) {
  return <div style={S.divider}><span style={S.dividerLine} /><span style={S.dividerLabel}>{label}</span><span style={S.dividerLine} /></div>
}

function CasualSide({ data, color, label }) {
  return (
    <div style={{ ...S.casualSideCard, borderTopColor: color }}>
      <span style={{ ...S.badge, color, background: `${color}15`, borderColor: `${color}30` }}>Side {label}</span>
      <h3 style={{ ...S.casualSideName, color }}>{data.label}</h3>
      {data.points.map((p, i) => (
        <div key={i} style={S.casualPoint}><p style={S.casualHeadline}>{p.headline}</p><p style={S.casualTalkingPoint}>{p.talkingPoint}</p></div>
      ))}
    </div>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const S = {
  root: { minHeight: '100vh', maxWidth: 1080, margin: '0 auto', padding: '40px 20px 80px' },
  header: { marginBottom: 20, textAlign: 'center', position: 'relative' },
  logo: { fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: '#e0e0e6', fontFamily: FONT.sans },
  subtitle: { fontSize: 13, color: '#6b6b80', marginTop: 2, fontWeight: 400 },
  pageNav: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 28, flexWrap: 'wrap' },
  pageTab: { padding: '8px 16px', fontSize: 12, fontWeight: 600, fontFamily: FONT.sans, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'transparent', color: '#555566', borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' },
  pageTabActive: { background: '#1a1a28', borderColor: '#2a2a3d' },
  main: { display: 'flex', flexDirection: 'column', gap: 24 },
  panel: { display: 'flex', flexDirection: 'column', gap: 18, background: '#1a1a28', border: '1px solid #1e1e2e', borderRadius: 14, padding: 28 },
  label: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b6b80', marginBottom: 4, fontFamily: FONT.sans },
  textarea: { width: '100%', padding: '14px 16px', fontSize: 16, fontFamily: FONT.sans, background: '#111118', border: '1px solid #1e1e2e', borderRadius: 10, color: '#e0e0e6', resize: 'vertical', lineHeight: 1.6 },
  row: { display: 'flex', gap: 16 },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  select: { padding: '12px 14px', fontSize: 15, fontFamily: FONT.sans, background: '#111118', border: '1px solid #1e1e2e', borderRadius: 10, color: '#e0e0e6', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' },
  buttonRow: { display: 'flex', gap: 12, marginTop: 6 },
  button: { padding: '14px 24px', fontSize: 16, fontWeight: 600, fontFamily: FONT.sans, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' },
  buttonDisabled: { background: '#2a2a3d', color: '#555', cursor: 'not-allowed' },
  loadingText: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dot: { animation: 'pulse 1.2s ease-in-out infinite', fontSize: 10 },
  error: { padding: '12px 16px', background: '#1a0a0a', border: '1px solid #4a1a1a', borderRadius: 8, color: '#f87171', fontSize: 13 },
  tabBar: { display: 'flex', gap: 0 },
  tab: { flex: 1, padding: '10px 16px', fontSize: 12, fontWeight: 600, fontFamily: FONT.sans, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#15151f', color: '#555566', borderWidth: 1, borderStyle: 'solid', borderColor: '#1e1e2e', borderBottom: 'none', cursor: 'pointer', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  tabActive: { background: '#1a1a28' },
  resultPanel: { display: 'flex', flexDirection: 'column', gap: 0 },
  resultHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  badge: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 4, borderWidth: 1, borderStyle: 'solid', borderColor: '#2a2a3d', fontFamily: FONT.mono, display: 'inline-block' },
  roundVision: { padding: 16, background: '#15151f', borderWidth: 1, borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, fontFamily: FONT.sans },
  monoLabel: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555566', fontFamily: FONT.mono, display: 'block', marginBottom: 4 },
  divider: { display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0' },
  dividerLine: { flex: 1, height: 1, background: '#1e1e2e' },
  dividerLabel: { fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#3a3a4d', fontFamily: FONT.mono },
  argBlocks: { display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 10 },
  block: { display: 'flex', flexDirection: 'column', gap: 3 },
  blockLabelRow: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 1 },
  blockDot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  blockText: { fontSize: 14, lineHeight: 1.7, color: '#c8c8d4', paddingLeft: 12 },
  mechText: { fontSize: 15, lineHeight: 1.7, color: '#d4d4e0', fontWeight: 500 },
  turnGrid: { display: 'flex', gap: 16, alignItems: 'stretch' },
  turnBlock: { flex: 1, background: '#15151f', border: '1px solid #1e1e2e', borderRadius: 8, padding: 14 },
  turnArrow: { display: 'flex', alignItems: 'center', fontSize: 22, opacity: 0.5, flexShrink: 0 },
  ballotText: { fontSize: 15, lineHeight: 1.75, color: '#d4d4e0', fontWeight: 500, paddingLeft: 14, borderLeftWidth: 2, borderLeftStyle: 'solid', borderLeftColor: '#2a2a3d', paddingTop: 4, paddingBottom: 4, marginLeft: 4 },
  bodyText: { fontSize: 14, lineHeight: 1.65, color: '#c8c8d4' },
  cardList: { display: 'flex', flexDirection: 'column', gap: 12 },
  resCard: { padding: 18, background: '#1a1a28', borderWidth: '1px 1px 1px 3px', borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 10 },
  resHeader: { display: 'flex', gap: 8, marginBottom: 10 },
  resText: { fontSize: 15, fontWeight: 600, color: '#e0e0e6', lineHeight: 1.5 },
  resBg: { fontSize: 13, lineHeight: 1.6, color: '#888899', marginTop: 10, paddingLeft: 12, borderLeft: '2px solid #2a2a3d' },
  timeline: { display: 'flex', flexDirection: 'column', gap: 16 },
  timelineOverview: { padding: 16, background: '#15151f', borderWidth: 1, borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 10 },
  overviewText: { fontSize: 14, lineHeight: 1.7, color: '#c8c8d4', fontStyle: 'italic' },
  timelineLine: { display: 'flex', flexDirection: 'column', gap: 12 },
  timelineCard: { padding: 18, background: '#1a1a28', borderWidth: '1px 1px 1px 3px', borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 10 },
  speechHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  speechDuration: { fontSize: 11, color: '#555', fontFamily: FONT.mono },
  speechTitle: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  speechBlock: { marginBottom: 12 },
  speechLabel: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555566', fontFamily: FONT.mono, display: 'block', marginBottom: 4 },
  casualFraming: { padding: 18, background: '#15151f', borderWidth: 1, borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 12, textAlign: 'center' },
  casualFramingText: { fontSize: 16, lineHeight: 1.7, color: '#d4d4e0', fontWeight: 500, fontStyle: 'italic' },
  casualSides: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  casualVs: { fontSize: 13, fontWeight: 800, color: '#3a3a4d', alignSelf: 'center', flexShrink: 0, fontFamily: FONT.mono },
  casualSideCard: { flex: 1, background: '#1a1a28', borderWidth: '3px 1px 1px 1px', borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 10, padding: 18 },
  casualSideName: { fontSize: 16, fontWeight: 700, margin: '8px 0 14px' },
  casualPoint: { marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #1a1a2a' },
  casualHeadline: { fontSize: 14, fontWeight: 600, color: '#e0e0e6', marginBottom: 4 },
  casualTalkingPoint: { fontSize: 13, lineHeight: 1.6, color: '#9999aa' },
  provocation: { fontSize: 14, lineHeight: 1.6, color: '#c8c8d4', marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid #2a2a3d' },
  philCard: { padding: 18, background: '#1a1a28', borderWidth: '1px 1px 1px 3px', borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' },
  philHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  philTitle: { fontSize: 15, fontWeight: 700 },
  philToggle: { fontSize: 18, color: '#555', fontWeight: 300 },
  philContent: { marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e1e2e' },
  philParagraph: { fontSize: 14, lineHeight: 1.75, color: '#b0b0be', marginBottom: 12 },
  judgeCard: { padding: 16, background: '#1a1a28', borderWidth: '1px 1px 1px 3px', borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 },
  judgeCardHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: { padding: '3px 8px', fontSize: 10, fontWeight: 600, fontFamily: FONT.mono, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#1a1a2a', color: '#555566', borderWidth: 1, borderStyle: 'solid', borderColor: '#2a2a3d', borderRadius: 4, cursor: 'pointer', transition: 'all 0.1s' },
  caseFeedbackLayout: { display: 'flex', gap: 20, alignItems: 'flex-start' },
  caseColumn: { flex: 1, minWidth: 0 },
  feedbackColumn: { width: 280, flexShrink: 0, position: 'sticky', top: 20 },
  feedbackPanel: { background: '#1a1a28', borderWidth: 1, borderStyle: 'solid', borderColor: '#2a2a3d', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 },
  feedbackNote: { borderBottom: '1px solid #1e1e2e', paddingBottom: 6 },
  feedbackNoteToggle: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' },
  feedbackNoteLabel: { fontSize: 12, fontWeight: 600, color: '#888899', fontFamily: FONT.sans, textAlign: 'left' },
  buildCaseBtn: { marginTop: 10, padding: '5px 12px', fontSize: 12, fontWeight: 600, fontFamily: FONT.sans, background: 'transparent', borderWidth: 1, borderStyle: 'solid', borderColor: '#2a2a3d', borderRadius: 6, color: '#6b6b80', cursor: 'pointer', transition: 'all 0.15s', float: 'right' },
  historyDivider: { padding: '12px 0 6px', borderTop: '1px solid #1e1e2e', marginTop: 8 },
  historyLabel: { fontSize: 11, color: '#444', fontFamily: FONT.mono },
  crossTabLinks: { display: 'flex', gap: 10, padding: '16px 0 4px', justifyContent: 'center' },
  crossTabBtn: { padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: FONT.sans, background: 'transparent', borderWidth: 1, borderStyle: 'solid', borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' },
  spikeCard: { padding: 16, background: '#1a1a28', borderWidth: '1px 1px 1px 3px', borderStyle: 'solid', borderColor: '#2a2a3d', borderRadius: 10, marginBottom: 4 },
  topicChip: { padding: '6px 14px', fontSize: 13, fontWeight: 500, fontFamily: FONT.sans, background: '#1a1a2a', color: '#777788', borderWidth: 1, borderStyle: 'solid', borderColor: '#2a2a3d', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s' },
  recBtn: { marginLeft: 'auto', padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: FONT.mono, background: 'transparent', borderWidth: 1, borderStyle: 'solid', borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s' },
  feedbackBox: { padding: 14, background: '#15151f', borderWidth: 1, borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 8, marginTop: 4 },
  feedbackHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  feedbackGrade: { fontSize: 22, fontWeight: 800, fontFamily: FONT.sans },
  feedbackSection: { marginBottom: 8 },
  feedbackItem: { fontSize: 13, lineHeight: 1.5, color: '#b0b0be', paddingLeft: 8, marginBottom: 2 },
  decisionBanner: { padding: 24, background: '#15151f', borderWidth: 2, borderStyle: 'solid', borderColor: '#1e1e2e', borderRadius: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  decisionLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: FONT.mono },
  decisionText: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' },
}
