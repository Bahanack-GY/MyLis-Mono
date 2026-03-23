# MyLisApp — Fix Todo List

Generated from edge case analysis. Grouped by priority.

---

## Critical (Security / Data Integrity)

- [x] **[AUTH]** Remove JWT secret fallback `'secretKey'` — throw an error at startup if `JWT_SECRET` env var is missing
- [x] **[AUTH]** Guard the `/auth/register` endpoint — require MANAGER role
- [x] **[SECURITY]** Move SMTP credentials out of source code (`mail.service.ts`) into environment variables
- [ ] **[SECURITY]** Add authentication to `uploads/` static file serving — private documents (payslips, sanctions, education docs) are publicly accessible by URL
- [x] **[SECURITY]** Add rate limiting — global 30 req/min throttle + 10 req/min on `/auth/login`
- [x] **[SECURITY]** Reduce `useBodyParser` limit from `5gb` to `10mb` for JSON payloads
- [x] **[INVOICES]** Fix `generateInvoiceNumber` race condition — uses SERIALIZABLE transaction with row lock
- [x] **[INVOICES]** Wrap item `destroy` + `bulkCreate` in a transaction in `update()` to avoid leaving an invoice with no items on failure
- [x] **[DEMANDS]** Add `status === 'PENDING'` guard in `validate()` and `reject()` to prevent double-processing
- [x] **[SALARY]** Add duplicate payment guard in `payOne()` and `payBulk()` — checks for existing expense before creating

---

## High (Logic Bugs / Data Loss Risk)

- [ ] **[AUTH]** Invalidate JWT on employee dismissal — maintain a blocklist or use short-lived tokens with a refresh mechanism
- [x] **[EMPLOYEES]** Fix `create()` — removed silent try/catch swallowing; `findOne` returns null, no exception needed
- [x] **[TASKS]** Prevent state regression on completed tasks — blocks setting state back once `COMPLETED`
- [x] **[TASKS]** Guard `updateStateForUser` so ticket-linked task completion only notifies stakeholders once — checks `previousState !== 'COMPLETED'`
- [x] **[TICKETS]** Add `status === 'OPEN'` guard in `assign()` (manager path) to prevent double-assignment race condition
- [x] **[TICKETS]** Prevent duplicate task creation for a ticket — checks if a task with `ticketId` already exists before creating
- [x] **[TICKETS]** Add status validation in `close()` — throws if ticket is already `CLOSED`
- [x] **[INVOICES]** Add concurrency guard in `markPaid()` — re-fetches with row lock inside a transaction
- [ ] **[CHAT]** Fix `onlineUsers` map for cluster mode — use Redis adapter for Socket.IO (infrastructure change, now single instance so deferred)
- [x] **[CHAT]** Restrict `channel:join` WebSocket event — validates user is a member before joining the room
- [x] **[CHAT]** `seedChannels` concurrency — now single instance, `findOrCreate` already idempotent
- [x] **[DOCUMENTS]** Delete the physical file from `uploads/` when a document record is removed from the DB

---

## Medium (Functional Issues / UX Bugs)

- [ ] **[AUTH]** Add email confirmation or re-authentication before allowing email change in `updateProfile()`
- [ ] **[EMPLOYEES]** `remove()` should check for dependent records (tasks, invoices) or switch to soft-delete to avoid orphaned data
- [ ] **[TASKS]** Fix `getEmployeeStats` — use `completedAt` instead of `updatedAt` when bucketing completed tasks into weekday chart slots
- [ ] **[TASKS]** Fix overnight task duration in `getEmployeeStats` — handle multi-day tasks, not just single midnight wrap
- [ ] **[GAMIFICATION]** Roll back points when a completed task is deleted — subtract the awarded points from the employee total
- [ ] **[GAMIFICATION]** Clarify streak bonus thresholds — bonuses only fire at exact counts (3, 5, 7); consider cumulative bonuses instead
- [ ] **[DEMANDS]** Fix `totalPrice` parsing in `validate()` — ensure `totalPrice` is always stored as a plain decimal string (no locale formatting)
- [x] **[DEMANDS]** Store empty rejection reason as `null` instead of `''` so the frontend can distinguish "no reason given"
- [ ] **[SALARY]** Add a confirmation dialog before `payBulk` fires in `Salaries.tsx` — irreversible bulk action needs explicit user confirmation
- [ ] **[SALARY]** Restrict future payment dates in `PayOneModal` — prevent selecting months/years beyond the current month
- [x] **[NOTIFICATIONS]** Add pagination to `findForUser()` — returns latest 50 by default, max 200 via `?limit=` query param
- [ ] **[NOTIFICATIONS]** Batch SMTP sends in `createMany()` — avoid firing one SMTP connection per notification for bulk events
- [ ] **[CHAT]** Fix DM race condition — use a unique constraint on two-user DM channels to prevent duplicate DM channels being created simultaneously
- [ ] **[CHAT]** Fix unread count for users who have never read a channel — treat `lastReadAt === null` as join time, not beginning of time
- [ ] **[TASKS]** Fix `removeByUser` notification — ensure `assignedTo` is eager-loaded with `userId` before attempting to notify the assignee
- [x] **[HR]** Fix `findByDepartment` in `documents.service.ts` — now queries by `employeeId`, not `uploadedById`
- [x] **[HR]** Guard against `userId` being null before calling `notificationsService.create` in `sanctions.service.ts`
- [ ] **[CHAT]** Replace raw `LIKE` string match in `updateDemandCardStatus` with a proper indexed column (`demandId` field on the message model)

---

## Low (Polish / Minor Improvements)

- [ ] **[AUTH]** Apply `ValidationPipe` globally and create typed DTOs with `class-validator` for all controllers — remove `any` typed inputs
- [ ] **[EMPLOYEES]** Add `limit` cap on `getLeaderboard()` — prevent unbounded DB queries
- [ ] **[ADMIN]** Add server-side pagination to all list endpoints (employees, invoices, demands, documents, notifications)
- [ ] **[FRONTEND]** Queue gamification modals (`PointsEarnedModal`, `BadgeEarnedModal`) — show them sequentially if multiple fire at once
- [ ] **[FRONTEND]** Fix `resolveFileUrl` — handle relative paths without a leading `/` to avoid malformed URLs
- [ ] **[FRONTEND]** `Demands.tsx` — handle partial upload failure gracefully: if one item image upload fails, surface an error and allow retry rather than creating the demand with missing image URLs
- [ ] **[GAMIFICATION]** Prevent badge from becoming permanently unobtainable after task deletion brings count below a milestone — re-check on next completion
- [ ] **[EXPENSES]** Fix year-end boundary in `getStats` — ensure `endDate` covers the full last day when `date` is stored as a timestamp
- [ ] **[ROLES]** Audit all routes for `HEAD_OF_DEPARTMENT` role coverage — ensure HOD is consistently included or excluded alongside `MANAGER` in every guard
- [ ] **[NOTIFICATIONS]** Add per-user email notification opt-out preference
- [ ] **[CHAT]** Decouple file attachment upload (HTTP) from message send (WebSocket) — confirm file upload success before allowing message submission with attachment
