import { Routes, Route, Navigate } from "react-router-dom"
import DashboardLayout from "./layouts/DashboardLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"
import { RolePageSwitch } from "./components/RolePageSwitch"

// Shared pages
import Login from "./pages/Login"
import Formations from "./pages/Formations"
import Sanctions from "./pages/Sanctions"

// Admin pages (dual-view)
import AdminDashboard from "./pages/admin/Dashboard"
import AdminTasks from "./pages/admin/Tasks"
import AdminProjects from "./pages/admin/Projects"
import AdminTickets from "./pages/admin/Tickets"
import AdminMeetings from "./pages/admin/Meetings"
import AdminDemands from "./pages/admin/Demands"
import AdminDocuments from "./pages/admin/Documents"
import AdminMessages from "./pages/admin/Messages"
import AdminNotifications from "./pages/admin/Notifications"
import AdminProfile from "./pages/admin/Profile"
import AdminPlanning from "./pages/admin/Planning"

// Employee pages (dual-view)
import EmployeeDashboard from "./pages/employee/Dashboard"
import EmployeeTasks from "./pages/employee/Tasks"
import EmployeeProjects from "./pages/employee/Projects"
import EmployeeTickets from "./pages/employee/Tickets"
import EmployeeMeetings from "./pages/employee/Meetings"
import EmployeeDemands from "./pages/employee/Demands"
import EmployeeDocuments from "./pages/employee/Documents"
import EmployeeMessages from "./pages/employee/Messages"
import EmployeeNotifications from "./pages/employee/Notifications"
import EmployeeProfile from "./pages/employee/Profile"
import EmployeePlanning from "./pages/employee/Planning"

// Admin-only pages
import Employees from "./pages/Employees"
import Departments from "./pages/Departments"
import ActivityPage from "./pages/Activity"
import Invoices from "./pages/Invoices"
import Expenses from "./pages/Expenses"
import Salaries from "./pages/Salaries"
import Clients from "./pages/Clients"

// Admin-only layouts
import EmployeeDetailLayout from "./layouts/EmployeeDetailLayout"
import ProjectDetailLayout from "./layouts/ProjectDetailLayout"
import DepartmentDetailLayout from "./layouts/DepartmentDetailLayout"
import ClientDetailLayout from "./layouts/ClientDetailLayout"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Routes for all authenticated users — dual-view pages */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={
            <RolePageSwitch adminComponent={AdminDashboard} employeeComponent={EmployeeDashboard} />
          } />
          <Route path="/tasks" element={
            <RolePageSwitch adminComponent={AdminTasks} employeeComponent={EmployeeTasks} />
          } />
          <Route path="/planning" element={
            <RolePageSwitch adminComponent={AdminPlanning} employeeComponent={EmployeePlanning} />
          } />
          <Route path="/projects" element={
            <RolePageSwitch adminComponent={AdminProjects} employeeComponent={EmployeeProjects} />
          } />
          <Route path="/tickets" element={
            <RolePageSwitch adminComponent={AdminTickets} employeeComponent={EmployeeTickets} />
          } />
          <Route path="/meetings" element={
            <RolePageSwitch adminComponent={AdminMeetings} employeeComponent={EmployeeMeetings} />
          } />
          <Route path="/demands" element={
            <RolePageSwitch adminComponent={AdminDemands} employeeComponent={EmployeeDemands} />
          } />
          <Route path="/documents" element={
            <RolePageSwitch adminComponent={AdminDocuments} employeeComponent={EmployeeDocuments} />
          } />
          <Route path="/notifications" element={
            <RolePageSwitch adminComponent={AdminNotifications} employeeComponent={EmployeeNotifications} />
          } />
          <Route path="/profile" element={
            <RolePageSwitch adminComponent={AdminProfile} employeeComponent={EmployeeProfile} />
          } />
          <Route path="/formations" element={<Formations />} />
          <Route path="/sanctions" element={<Sanctions />} />
        </Route>

        {/* Messages — outside DashboardLayout (full screen) */}
        <Route path="/messages" element={
          <RolePageSwitch adminComponent={AdminMessages} employeeComponent={EmployeeMessages} />
        } />
      </Route>

      {/* Routes for MANAGER and HEAD_OF_DEPARTMENT only */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'HEAD_OF_DEPARTMENT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/employees" element={<Employees />} />
          <Route path="/departments" element={<Departments />} />
        </Route>
        <Route path="/employees/:id" element={<EmployeeDetailLayout />} />
        <Route path="/departments/:id" element={<DepartmentDetailLayout />} />
      </Route>

      {/* Activity — MANAGER only */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/activity" element={<ActivityPage />} />
        </Route>
      </Route>

      {/* Routes for MANAGER, HEAD_OF_DEPARTMENT and ACCOUNTANT */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/salaries" element={<Salaries />} />
          <Route path="/clients" element={<Clients />} />
        </Route>
        <Route path="/projects/:id" element={<ProjectDetailLayout />} />
        <Route path="/clients/:id" element={<ClientDetailLayout />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
