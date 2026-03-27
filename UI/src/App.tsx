import { Routes, Route, Navigate } from "react-router-dom"
import DashboardLayout from "./layouts/DashboardLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"
import { RolePageSwitch } from "./components/RolePageSwitch"

// Shared pages
import Login from "./pages/Login"
import Formations from "./pages/Formations"
import Sanctions from "./pages/Sanctions"
import MyPayslips from "./pages/MyPayslips"

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
import AdminBusinessExpenses from "./pages/admin/BusinessExpenses"

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
import EmployeeBusinessExpenses from "./pages/employee/BusinessExpenses"

// Reports
import AdminReports from "./pages/admin/Reports"
import EmployeeReports from "./pages/employee/Reports"

// Admin-only pages
import Employees from "./pages/Employees"
import Departments from "./pages/Departments"
import ActivityPage from "./pages/Activity"
import Invoices from "./pages/Invoices"
import Expenses from "./pages/Expenses"
import Clients from "./pages/Clients"

// Admin-only layouts
import EmployeeDetailLayout from "./layouts/EmployeeDetailLayout"
import ProjectDetailLayout from "./layouts/ProjectDetailLayout"
import DepartmentDetailLayout from "./layouts/DepartmentDetailLayout"
import ClientDetailLayout from "./layouts/ClientDetailLayout"

// Commercial pages (MANAGER + HEAD_OF_DEPARTMENT)
import CommercialDashboard from "./pages/commercial/CommercialDashboard"
import LeadsDatabase from "./pages/commercial/LeadsDatabase"
import SalesPipeline from "./pages/commercial/SalesPipeline"
import ClientFollowUp from "./pages/commercial/ClientFollowUp"

// Accounting pages (MANAGER + ACCOUNTANT)
import AccountantDashboard from "./pages/accounting/AccountantDashboard"
import ChartOfAccounts from "./pages/accounting/ChartOfAccounts"
import JournalEntries from "./pages/accounting/JournalEntries"
import Reports from "./pages/accounting/Reports"
import FiscalYears from "./pages/accounting/FiscalYears"
import Payroll from "./pages/accounting/Payroll"
import TaxDeclarations from "./pages/accounting/TaxDeclarations"
import AIReports from "./pages/accounting/AIReports"

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
          <Route path="/my-payslips" element={<MyPayslips />} />
          <Route path="/business-expenses" element={
            <RolePageSwitch adminComponent={AdminBusinessExpenses} employeeComponent={EmployeeBusinessExpenses} />
          } />
          <Route path="/reports" element={
            <RolePageSwitch adminComponent={AdminReports} employeeComponent={EmployeeReports} />
          } />
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
          <Route path="/clients" element={<Clients />} />
        </Route>
        <Route path="/projects/:id" element={<ProjectDetailLayout />} />
        <Route path="/clients/:id" element={<ClientDetailLayout />} />
      </Route>

      {/* Commercial routes — MANAGER + HEAD_OF_DEPARTMENT + COMMERCIAL */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/commercial" element={<CommercialDashboard />} />
          <Route path="/commercial/leads" element={<LeadsDatabase />} />
          <Route path="/commercial/pipeline" element={<SalesPipeline />} />
        </Route>
      </Route>

      {/* Client Follow-Up — MANAGER + HEAD_OF_DEPARTMENT only */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'HEAD_OF_DEPARTMENT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/commercial/follow-up" element={<ClientFollowUp />} />
        </Route>
      </Route>

      {/* Accounting routes — MANAGER + ACCOUNTANT */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'ACCOUNTANT']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/accounting" element={<AccountantDashboard />} />
          <Route path="/accounting/accounts" element={<ChartOfAccounts />} />
          <Route path="/accounting/entries" element={<JournalEntries />} />
          <Route path="/accounting/reports" element={<Reports />} />
          <Route path="/accounting/fiscal-years" element={<FiscalYears />} />
          <Route path="/accounting/payroll" element={<Payroll />} />
          <Route path="/accounting/tax" element={<TaxDeclarations />} />
          <Route path="/accounting/ai-reports" element={<AIReports />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
