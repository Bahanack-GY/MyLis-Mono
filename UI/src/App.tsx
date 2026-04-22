import { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import DashboardLayout from "./layouts/DashboardLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import PublicRoute from "./components/PublicRoute"
import { RolePageSwitch } from "./components/RolePageSwitch"

// Shared pages
const Login = lazy(() => import("./pages/Login"))
const Formations = lazy(() => import("./pages/Formations"))
const Sanctions = lazy(() => import("./pages/Sanctions"))
const MyPayslips = lazy(() => import("./pages/MyPayslips"))

// Admin pages (dual-view)
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"))
const AdminTasks = lazy(() => import("./pages/admin/Tasks"))
const AdminProjects = lazy(() => import("./pages/admin/Projects"))
const AdminTickets = lazy(() => import("./pages/admin/Tickets"))
const AdminMeetings = lazy(() => import("./pages/admin/Meetings"))
const AdminDemands = lazy(() => import("./pages/admin/Demands"))
const AdminDocuments = lazy(() => import("./pages/admin/Documents"))
const AdminMessages = lazy(() => import("./pages/admin/Messages"))
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"))
const AdminProfile = lazy(() => import("./pages/admin/Profile"))
const AdminPlanning = lazy(() => import("./pages/admin/Planning"))
const AdminBusinessExpenses = lazy(() => import("./pages/admin/BusinessExpenses"))

// Employee pages (dual-view)
const EmployeeDashboard = lazy(() => import("./pages/employee/Dashboard"))
const EmployeeTasks = lazy(() => import("./pages/employee/Tasks"))
const EmployeeProjects = lazy(() => import("./pages/employee/Projects"))
const EmployeeTickets = lazy(() => import("./pages/employee/Tickets"))
const EmployeeMeetings = lazy(() => import("./pages/employee/Meetings"))
const EmployeeDemands = lazy(() => import("./pages/employee/Demands"))
const EmployeeDocuments = lazy(() => import("./pages/employee/Documents"))
const EmployeeMessages = lazy(() => import("./pages/employee/Messages"))
const EmployeeNotifications = lazy(() => import("./pages/employee/Notifications"))
const EmployeeProfile = lazy(() => import("./pages/employee/Profile"))
const EmployeePlanning = lazy(() => import("./pages/employee/Planning"))
const EmployeeBusinessExpenses = lazy(() => import("./pages/employee/BusinessExpenses"))

// Reports
const AdminReports = lazy(() => import("./pages/admin/Reports"))
const EmployeeReports = lazy(() => import("./pages/employee/Reports"))

// Admin-only pages
const WhatsAppPage = lazy(() => import("./pages/admin/WhatsApp"))
const Employees = lazy(() => import("./pages/Employees"))
const Departments = lazy(() => import("./pages/Departments"))
const ActivityPage = lazy(() => import("./pages/Activity"))
const Invoices = lazy(() => import("./pages/Invoices"))
const Expenses = lazy(() => import("./pages/Expenses"))
const Clients = lazy(() => import("./pages/Clients"))

// Admin-only layouts
const EmployeeDetailLayout = lazy(() => import("./layouts/EmployeeDetailLayout"))
const ProjectDetailLayout = lazy(() => import("./layouts/ProjectDetailLayout"))
const DepartmentDetailLayout = lazy(() => import("./layouts/DepartmentDetailLayout"))
const ClientDetailLayout = lazy(() => import("./layouts/ClientDetailLayout"))

// Commercial pages (MANAGER + HEAD_OF_DEPARTMENT)
const CommercialDashboard = lazy(() => import("./pages/commercial/CommercialDashboard"))
const LeadsDatabase = lazy(() => import("./pages/commercial/LeadsDatabase"))
const SalesPipeline = lazy(() => import("./pages/commercial/SalesPipeline"))
const ClientFollowUp = lazy(() => import("./pages/commercial/ClientFollowUp"))
const LeadFollowUp = lazy(() => import("./pages/commercial/LeadFollowUp"))

// Accounting pages (MANAGER + ACCOUNTANT)
const AccountantDashboard = lazy(() => import("./pages/accounting/AccountantDashboard"))
const ChartOfAccounts = lazy(() => import("./pages/accounting/ChartOfAccounts"))
const JournalEntries = lazy(() => import("./pages/accounting/JournalEntries"))
const Reports = lazy(() => import("./pages/accounting/Reports"))
const FiscalYears = lazy(() => import("./pages/accounting/FiscalYears"))
const Payroll = lazy(() => import("./pages/accounting/Payroll"))
const TaxDeclarations = lazy(() => import("./pages/accounting/TaxDeclarations"))
const AIReports = lazy(() => import("./pages/accounting/AIReports"))
const Suppliers = lazy(() => import("./pages/accounting/Suppliers"))
const CashFlow = lazy(() => import("./pages/accounting/CashFlow"))
const FundMovements = lazy(() => import("./pages/accounting/FundMovements"))
const MonthlyRankings = lazy(() => import("./pages/admin/MonthlyRankings"))

function App() {
  return (
    <Suspense fallback={null}>
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
            <Route path="/employees/rankings" element={<MonthlyRankings />} />
          </Route>
          <Route path="/employees/:id" element={<EmployeeDetailLayout />} />
          <Route path="/departments/:id" element={<DepartmentDetailLayout />} />
        </Route>

        {/* Activity + WhatsApp — MANAGER only */}
        <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
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
            <Route path="/commercial/suivi" element={<LeadFollowUp />} />
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
            <Route path="/accounting/suppliers" element={<Suppliers />} />
            <Route path="/accounting/cash-flow" element={<CashFlow />} />
          </Route>
        </Route>

        {/* Fund Movements — CEO + ACCOUNTANT */}
        <Route element={<ProtectedRoute allowedRoles={['CEO', 'ACCOUNTANT']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/accounting/fund-movements" element={<FundMovements />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
