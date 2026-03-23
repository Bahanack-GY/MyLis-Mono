import { Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Employees from "./pages/Employees"
import Dashboard from "./pages/Dashboard"
import Tasks from "./pages/Tasks"
import Projects from "./pages/Projects"
import Departments from "./pages/Departments"
import Documents from "./pages/Documents"
import Tickets from "./pages/Tickets"
import Invoices from "./pages/Invoices"
import Demands from "./pages/Demands"
import Expenses from "./pages/Expenses"
import Clients from "./pages/Clients"
import ActivityPage from "./pages/Activity"
import Meetings from "./pages/Meetings"
import Notifications from "./pages/Notifications"
import Messages from "./pages/Messages"
import Profile from "./pages/Profile"
import Salaries from "./pages/Salaries"
import DashboardLayout from "./layouts/DashboardLayout"
import EmployeeDetailLayout from "./layouts/EmployeeDetailLayout"
import ProjectDetailLayout from "./layouts/ProjectDetailLayout"
import DepartmentDetailLayout from "./layouts/DepartmentDetailLayout"
import ClientDetailLayout from "./layouts/ClientDetailLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      {/* Routes for MANAGER and HEAD_OF_DEPARTMENT only */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'HEAD_OF_DEPARTMENT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/employees" element={<Employees />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/activity" element={<ActivityPage />} />
        </Route>
        <Route path="/employees/:id" element={<EmployeeDetailLayout />} />
        <Route path="/departments/:id" element={<DepartmentDetailLayout />} />
      </Route>

      {/* Routes for MANAGER, HEAD_OF_DEPARTMENT and ACCOUNTANT */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/demands" element={<Demands />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/salaries" element={<Salaries />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="/messages" element={<Messages />} />
        <Route path="/projects/:id" element={<ProjectDetailLayout />} />
        <Route path="/clients/:id" element={<ClientDetailLayout />} />
      </Route>

    </Routes>
  )
}

export default App
