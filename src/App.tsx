import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Upcoming from './pages/Upcoming'
import Songs from './pages/Songs'
import Live from './pages/Live'
import Display from './pages/Display'
import Presentations from './pages/Presentations'
import PresentationEditor from './pages/PresentationEditor'

const upcoming: [string, string, number][] = [
  ['bible', 'Bible', 5],
  ['media', 'Media Library', 5],
  ['schedules', 'Service Schedules', 6],
  ['settings', 'Settings', 6],
]

export default function App() {
  return (
    <Routes>
      <Route path="/display" element={<Display />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="songs" element={<Songs />} />
        <Route path="live" element={<Live />} />
        <Route path="live/:id" element={<Live />} />
        <Route path="presentations" element={<Presentations />} />
        <Route path="presentations/:id" element={<PresentationEditor />} />
        {upcoming.map(([path, title, phase]) => (
          <Route key={path} path={path} element={<Upcoming title={title} phase={phase} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
