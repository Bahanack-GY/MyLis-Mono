# Color Audit — Todo Change Colors

## Brand Palette (ONLY ALLOWED COLORS)
| Token | Value | Usage |
|-------|-------|-------|
| Teal full | `#33cbcc` | Primary actions, active states, success/positive |
| Teal light | `bg-[#33cbcc]/10` | Positive/success backgrounds |
| Teal medium | `bg-[#33cbcc]/20` | Active backgrounds |
| Navy full | `#283852` | Headers, primary text, dark buttons |
| Navy light | `bg-[#283852]/10` | Info/warning/secondary backgrounds |
| Navy medium | `bg-[#283852]/20` | Hover backgrounds |
| Navy text muted | `text-[#283852]/60` | Muted/secondary text |
| Grays | `gray-*` | Neutral backgrounds, borders, placeholder text |
| White / Black | — | Base colors |

## Semantic Mapping
| Old color meaning | Old classes | New classes |
|---|---|---|
| Success / Positive | `green-*`, `emerald-*` | `bg-[#33cbcc]/10 text-[#33cbcc]` |
| Info / Primary | `blue-*`, `indigo-*`, `violet-*` | `bg-[#283852]/10 text-[#283852]` |
| Warning | `amber-*`, `yellow-*`, `orange-*` | `bg-[#283852]/10 text-[#283852]` |
| Danger / Delete | `red-*`, `rose-*`, `pink-*` | `bg-[#283852]/10 text-[#283852]` for bg; `text-[#283852]/70` for text |
| Delete hover | `hover:bg-red-50 hover:text-red-500` | `hover:bg-[#283852]/10 hover:text-[#283852]` |
| Purple / Secondary | `purple-*` | `bg-[#283852]/10 text-[#283852]` |
| Focus rings | `focus:ring-red/blue/etc` | `focus:ring-[#33cbcc]/30` |
| Colored borders | `border-red/blue/green/etc` | Remove entirely (use `border-gray-200`) |

## Files to Fix

### Components (shared — fix first)
- [ ] `src/components/Sidebar.tsx` — logout hover red
- [ ] `src/components/accounting/FinancialCharts.tsx` — COLORS array
- [ ] `src/components/ClientActivitiesPanel.tsx` — health status colors
- [ ] `src/components/ClientHealthDashboard.tsx` — health status colors
- [ ] `src/components/ClientDetailSidebar.tsx` — subscription/one_time colors
- [ ] `src/components/ProjectDetailSidebar.tsx` — project status colors
- [ ] `src/components/BadgeEarnedModal.tsx` — confetti colors, amber badges
- [ ] `src/components/MeetingRecordingPrompt.tsx` — red/green text
- [ ] `src/components/TaskNatureManager.tsx` — red hover
- [ ] `src/components/BusinessExpenseTypeManager.tsx` — color palette, red hover
- [ ] `src/components/PaymentRemindersDashboard.tsx` — green/yellow
- [ ] `src/components/ConvertToClientModal.tsx` — emerald bg
- [ ] `src/components/os/OSContextMenu.tsx` — red delete item
- [ ] `src/components/os/OSStartMenu.tsx` — red hover
- [ ] `src/components/modals/TransferHistoryModal.tsx` — blue
- [ ] `src/components/modals/TransferEmployeeModal.tsx` — blue/amber
- [ ] `src/components/modals/CreateInvoiceModal.tsx` — red hover
- [ ] `src/components/modals/CreateRoleModal.tsx` — rose hover
- [ ] `src/components/modals/RolesModal.tsx` — rose hover/text
- [ ] `src/components/commercial/StageChangeModal.tsx` — all stage colors
- [ ] `src/components/commercial/LeadCreationWizard.tsx` — red/amber/blue

### Layouts
- [ ] `src/layouts/DashboardLayout.tsx`
- [ ] `src/layouts/ProjectDetailLayout.tsx`
- [ ] `src/layouts/DepartmentDetailLayout.tsx`
- [ ] `src/layouts/ClientDetailLayout.tsx`
- [ ] `src/layouts/EmployeeDetailLayout.tsx`

### Accounting Pages
- [ ] `src/pages/accounting/AccountantDashboard.tsx`
- [ ] `src/pages/accounting/JournalEntries.tsx`
- [ ] `src/pages/accounting/Reports.tsx`
- [ ] `src/pages/accounting/ChartOfAccounts.tsx`
- [ ] `src/pages/accounting/Payroll.tsx`
- [ ] `src/pages/accounting/Suppliers.tsx`
- [ ] `src/pages/accounting/CashFlow.tsx`
- [ ] `src/pages/accounting/TaxDeclarations.tsx`
- [ ] `src/pages/accounting/FiscalYears.tsx`
- [ ] `src/pages/accounting/AIReports.tsx`

### Main Pages
- [ ] `src/pages/Login.tsx`
- [ ] `src/pages/Expenses.tsx`
- [ ] `src/pages/Employees.tsx`
- [ ] `src/pages/EmployeeDetail.tsx`
- [ ] `src/pages/Departments.tsx`
- [ ] `src/pages/DepartmentDetail.tsx`
- [ ] `src/pages/ProjectDetail.tsx`
- [ ] `src/pages/ClientDetail.tsx`
- [ ] `src/pages/Clients.tsx`
- [ ] `src/pages/Invoices.tsx`
- [ ] `src/pages/Sanctions.tsx`
- [ ] `src/pages/MyPayslips.tsx`

### Employee Pages
- [ ] `src/pages/employee/Dashboard.tsx`
- [ ] `src/pages/employee/Tasks.tsx`
- [ ] `src/pages/employee/Planning.tsx`
- [ ] `src/pages/employee/Meetings.tsx`
- [ ] `src/pages/employee/Projects.tsx`
- [ ] `src/pages/employee/Profile.tsx`
- [ ] `src/pages/employee/Tickets.tsx`
- [ ] `src/pages/employee/BusinessExpenses.tsx`
- [ ] `src/pages/employee/Demands.tsx`
- [ ] `src/pages/employee/Messages.tsx`
- [ ] `src/pages/employee/Reports.tsx`

### Admin Pages
- [ ] `src/pages/admin/Planning.tsx`
- [ ] `src/pages/admin/Tasks.tsx`
- [ ] `src/pages/admin/Messages.tsx`
- [ ] `src/pages/admin/BusinessExpenses.tsx`
- [ ] `src/pages/admin/Demands.tsx`
- [ ] `src/pages/admin/Documents.tsx`
- [ ] `src/pages/admin/Reports.tsx`

### Commercial Pages
- [ ] `src/pages/commercial/SalesPipeline.tsx`
- [ ] `src/pages/commercial/ClientFollowUp.tsx`
- [ ] `src/pages/commercial/LeadsDatabase.tsx`
- [ ] `src/pages/commercial/LeadFollowUp.tsx`
- [ ] `src/pages/commercial/LeadProfileSidebar.tsx` (component)
