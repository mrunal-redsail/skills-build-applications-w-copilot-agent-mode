import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Activity as ActivityIcon, ArrowUpRight, Dumbbell, LayoutDashboard, Plus, Trophy, Users, Zap } from 'lucide-react'
import logo from '../../../docs/octofitapp-small.png'
import './octofit.css'

const sections = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/activities', label: 'Activities', icon: ActivityIcon },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/teams', label: 'Teams', icon: Users },
  { path: '/workouts', label: 'Workouts', icon: Dumbbell },
  { path: '/students', label: 'Students', icon: Users },
]

const activityTypes = ['Running', 'Walking', 'Strength', 'Cycling', 'Yoga']

async function api(path, options) {
  const response = await fetch(`/api/${path}`, options)
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to reach the API')
  return result
}

async function loadData() {
  const [users, teams, activities, leaderboard, workouts] = await Promise.all(
    ['users', 'teams', 'activities', 'leaderboard', 'workouts'].map((path) => api(path)),
  )
  return { users, teams, activities, leaderboard, workouts }
}

function ActivityList({ activities }) {
  return <div className="activity-list">
    {activities.length === 0 && <p className="empty">No activities yet.</p>}
    {activities.map((activity) => <div className="activity-row" key={activity._id}>
      <span className="activity-symbol"><ActivityIcon size={18} /></span>
      <span className="activity-info"><strong>{activity.type}</strong><small>{activity.user?.name || 'Student'} · {new Date(activity.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span>
      <span className="activity-duration">{activity.duration} min</span>
    </div>)}
  </div>
}

function LogForm({ users, onSaved }) {
  const [user, setUser] = useState('')
  const [type, setType] = useState('Running')
  const [duration, setDuration] = useState('30')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await api('activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, type, duration: Number(duration) }),
      })
      setMessage('Activity logged.')
      await onSaved()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return <form className="log-form" onSubmit={submit}>
    <div className="section-heading"><div><span className="eyebrow">NEW ENTRY</span><h2>Log an activity</h2></div><Plus size={20} /></div>
    <label>Student<select value={user} onChange={(event) => setUser(event.target.value)} required><option value="">Select a student</option>{users.map((student) => <option key={student._id} value={student._id}>{student.name}</option>)}</select></label>
    <label>Activity<select value={type} onChange={(event) => setType(event.target.value)}>{activityTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Duration (minutes)<input type="number" min="1" max="600" value={duration} onChange={(event) => setDuration(event.target.value)} required /></label>
    <button className="primary-button" disabled={saving || users.length === 0} type="submit"><Plus size={17} /> {saving ? 'Saving...' : 'Add activity'}</button>
    {message && <p className="form-message" role="status">{message}</p>}
  </form>
}

function RegisterForm({ teams, onSaved }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [grade, setGrade] = useState('9')
  const [team, setTeam] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await api('users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, grade: Number(grade), team }),
      })
      setName('')
      setEmail('')
      setMessage('Student added.')
      await onSaved()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return <form className="log-form" onSubmit={submit}>
    <div className="section-heading"><div><span className="eyebrow">NEW PROFILE</span><h2>Add a student</h2></div><Plus size={20} /></div>
    <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
    <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
    <label>Grade<select value={grade} onChange={(event) => setGrade(event.target.value)}>{[9, 10, 11, 12].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label>Team<select value={team} onChange={(event) => setTeam(event.target.value)} required><option value="">Select a team</option>{teams.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
    <button className="primary-button" disabled={saving || teams.length === 0} type="submit"><Plus size={17} /> {saving ? 'Saving...' : 'Add student'}</button>
    {message && <p className="form-message" role="status">{message}</p>}
  </form>
}

function AppContent() {
  const [data, setData] = useState({ users: [], teams: [], activities: [], leaderboard: [], workouts: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    try {
      setData(await loadData())
      setError('')
    } catch (issue) {
      setError(issue.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    loadData().then((result) => {
      if (active) { setData(result); setError(''); setLoading(false) }
    }, (issue) => {
      if (active) { setError(issue.message); setLoading(false) }
    })
    return () => { active = false }
  }, [])

  const { users, teams, activities, leaderboard, workouts } = data
  const totalMinutes = activities.reduce((sum, item) => sum + item.duration, 0)
  const teamTotals = teams.map((team) => ({ ...team, points: leaderboard.filter((entry) => entry.user?.team === team._id).reduce((sum, entry) => sum + entry.points, 0) })).sort((first, second) => second.points - first.points)

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img src={logo} alt="" /><div><strong>octofit<span>.</span></strong><small>MERGINGTON HIGH</small></div></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav aria-label="Main navigation">{sections.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={19} strokeWidth={1.8} />{label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><span className="status-dot" /> DEMO WORKSPACE</div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="mobile-brand"><img src={logo} alt="" /> octofit<span>.</span></div><span>Mergington High School</span><span className="topbar-right">2026 / 27 SCHOOL YEAR</span></header>
      <main className="content">
        {error && <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={refresh}>Retry</button></div>}
        {loading ? <p className="empty">Loading your workspace...</p> : <Routes>
          <Route path="/" element={<>
            <div className="page-heading"><div><span className="eyebrow">THE DAILY PULSE</span><h1>Overview<span className="heading-dot">.</span></h1><p>A snapshot of movement across your school.</p></div><span className="date-pill">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
            <div className="stats-grid"><div className="stat"><span>STUDENTS</span><strong>{users.length.toString().padStart(2, '0')}</strong><small>On the move <ArrowUpRight size={15} /></small></div><div className="stat"><span>ACTIVITIES</span><strong>{activities.length.toString().padStart(2, '0')}</strong><small>Logged so far <ArrowUpRight size={15} /></small></div><div className="stat"><span>ACTIVE MINUTES</span><strong>{totalMinutes}</strong><small>Every minute counts <ArrowUpRight size={15} /></small></div><div className="stat accent-stat"><span>TEAMS</span><strong>{teams.length.toString().padStart(2, '0')}</strong><small>Better together <Zap size={15} /></small></div></div>
            <div className="dashboard-grid"><section className="surface"><div className="section-heading"><div><span className="eyebrow">LATEST UPDATES</span><h2>Recent activity</h2></div><NavLink to="/activities" className="text-action">View all <ArrowUpRight size={16} /></NavLink></div><ActivityList activities={activities.slice(0, 5)} /></section><LogForm users={users} onSaved={refresh} /></div>
            <div className="dashboard-grid bottom-grid"><section className="surface"><div className="section-heading"><div><span className="eyebrow">THE STANDINGS</span><h2>Top students</h2></div><NavLink to="/leaderboard" className="text-action">Full board <ArrowUpRight size={16} /></NavLink></div><Ranking rows={leaderboard.slice(0, 3)} /></section><section className="surface"><div className="section-heading"><div><span className="eyebrow">GET MOVING</span><h2>Try a workout</h2></div><NavLink to="/workouts" className="text-action">Explore <ArrowUpRight size={16} /></NavLink></div><div className="featured-workout"><span className="workout-mark"><Dumbbell size={24} /></span><div><strong>{workouts[0]?.title || 'No workouts yet'}</strong><p>{workouts[0]?.description}</p><small>{workouts[0]?.duration} MIN · {workouts[0]?.level?.toUpperCase()}</small></div></div></section></div>
          </>} />
          <Route path="/activities" element={<><PageTitle eyebrow="THE MOVEMENT LOG" title="Activities" subtitle="Keep track of every session, big or small." /><div className="dashboard-grid"><section className="surface"><div className="section-heading"><h2>All activity</h2><span className="count-label">{activities.length} ENTRIES</span></div><ActivityList activities={activities} /></section><LogForm users={users} onSaved={refresh} /></div></>} />
          <Route path="/leaderboard" element={<><PageTitle eyebrow="THE STANDINGS" title="Leaderboard" subtitle="A little friendly competition goes a long way." /><section className="surface wide-surface"><div className="section-heading"><h2>Student standings</h2><span className="count-label">1 MINUTE = 1 POINT</span></div><Ranking rows={leaderboard} /></section></>} />
          <Route path="/teams" element={<><PageTitle eyebrow="BETTER TOGETHER" title="Teams" subtitle="Every effort adds up for the whole team." /><div className="team-grid">{teamTotals.map((team, index) => <div className="team-tile" key={team._id} style={{ '--team-color': team.color }}><div className="team-top"><span className="team-emblem">{team.name[0]}</span><span>0{index + 1} / 0{teams.length}</span></div><h2>{team.name}</h2><p>{users.filter((user) => user.team?._id === team._id).length} members</p><strong>{team.points} <small>PTS</small></strong></div>)}</div></>} />
          <Route path="/workouts" element={<><PageTitle eyebrow="FIND YOUR PACE" title="Workouts" subtitle="Ideas for your next move." /><div className="workout-grid">{workouts.map((workout, index) => <div className="workout-tile" key={workout._id}><span className="workout-number">0{index + 1} / WORKOUT</span><span className="workout-mark"><Dumbbell size={24} /></span><h2>{workout.title}</h2><p>{workout.description}</p><div className="workout-meta"><span>{workout.level}</span><span>{workout.duration} min</span></div></div>)}</div></>} />
          <Route path="/students" element={<><PageTitle eyebrow="THE COMMUNITY" title="Students" subtitle="Meet the people putting in the work." /><div className="dashboard-grid"><section className="surface"><div className="section-heading"><h2>Student roster</h2><span className="count-label">{users.length} STUDENTS</span></div><div className="student-list">{users.map((student) => <div className="student-row" key={student._id}><span className="avatar">{student.name.split(' ').map((part) => part[0]).join('')}</span><div><strong>{student.name}</strong><small>Grade {student.grade}</small></div><span className="team-chip" style={{ '--team-color': student.team?.color }}>{student.team?.name || 'No team'}</span></div>)}</div></section><RegisterForm teams={teams} onSaved={refresh} /></div></>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>}
      </main>
    </div>
  </div>
}

function PageTitle({ eyebrow, title, subtitle }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}<span className="heading-dot">.</span></h1><p>{subtitle}</p></div></div>
}

function Ranking({ rows }) {
  return <div className="ranking-list">{rows.length === 0 && <p className="empty">No students yet.</p>}{rows.map((entry, index) => <div className="ranking-row" key={entry._id}><span className="rank">{String(index + 1).padStart(2, '0')}</span><span className="avatar">{entry.user?.name?.split(' ').map((part) => part[0]).join('')}</span><strong>{entry.user?.name || 'Student'}</strong><span className="points">{entry.points} <small>PTS</small></span></div>)}</div>
}

export default function OctofitApp() {
  return <BrowserRouter><AppContent /></BrowserRouter>
}