import { Routes, Route, Navigate } from "react-router-dom"
import DashboardLayout from "./layouts/DashboardLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import Tickets from "./pages/Tickets"
import Meetings from "./pages/Meetings"
import Documents from "./pages/Documents"
import Tasks from "./pages/Tasks"
import Projects from "./pages/Projects"
import Formations from "./pages/Formations"
import Sanctions from "./pages/Sanctions"
import Notifications from "./pages/Notifications"
import Messages from "./pages/Messages"
import Demands from "./pages/Demands"
function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/formations" element={<Formations />} />
          <Route path="/sanctions" element={<Sanctions />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/demands" element={<Demands />} />
        </Route>
        <Route path="/messages" element={<Messages />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
