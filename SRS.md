# (SRS) - LIS Application

## 1. Introduction
This document outlines the features and data structures of the LIS application, derived from the current codebase implementation. The system facilitates management of employees, tasks, and HR processes.

## 2. Feature List

### 2.1 Authentication & User Management
*   **Login System**: Secure login users with email and password.
*   **Role-Based Access Control**:
    *   **Manager**: Full administrative access.
    *   **Employee**: Access to personal tasks, profile, and documents.
*   **Initial Setup**: One-time initialization for the first Manager account.
*   **Profile Management**: Users can update personal details and avatars.
*   **Push Notifications**: Subscription management for web push notifications.

### 2.2 Employee Management (Manager Side)
*   **Employee Directory**: List all employees.
*   **Employee Profiles**: Comprehensive view and editing of employee data.
*   **Employment Details**: Manage contracts, hire dates, trial periods, and ranks.
*   **Organization**: Assign employees to Departments and Positions.

### 2.3 Task Management
*   **Task Creation**: Managers can create and assign tasks. Employees can self-assign tasks.
*   **Task Lifecycle**:
    *   States: CREATED, ASSIGNED, IN_PROGRESS, BLOCKED, COMPLETED, REVIEWED.
*   **Attributes**:
    *   Difficulty levels: EASY, MEDIUM, HARD.
    *   Time periods: DAY, WEEK, MONTH, HOURS, CUSTOM.
*   **Team Tasks**: Assign tasks to entire teams.
*   **Validation**: Optional manager confirmation required for task completion.
*   **Tracking**: Track start time, completion time, and review time.
*   **Blockers**: Employees can flag tasks as blocked with a reason.

### 2.4 HR & Administrative Processes
*   **Document Management**:
    *   Upload and store PDF/Image documents.
    *   Categorize documents (Contract, ID, Diploma, Other).
    *   Track uploader identity.
*   **Formations (Training)**:
    *   Record training sessions.
    *   Track dates, organizations, and certificates obtained.
*   **Entretiens (Interviews/Reviews)**:
    *   Schedule and record interviews (Annual, Professional, Disciplinary).
    *   Store interview notes and status (SCHEDULED, COMPLETED).
*   **Sanctions**:
    *   Issue disciplinary sanctions (AVERTISSEMENT, BLAME, MISE_A_PIED, etc.).
    *   Record severity, reasons, and evidence files.
*   **Encouragements**: System for recording positive feedback and recognition.
*   **Progress Tracking**: Series of progress records for employees.

### 2.5 Team & Organization Management
*   **Department Management**: Create and manage company departments.
*   **Position Management**: Define job titles and positions.
*   **Team Management**: Group employees into teams and assign Team Leads.

### 2.6 Communication & Logs
*   **Activity Logs**: System-wide audit logging of actions.
*   **WhatsApp Integration**: Management of WhatsApp sessions for notifications/communication.

## 3. Data Models & Types

### 3.1 Employee Data
| Field | Type | Description |
| :--- | :--- | :--- |
| employeeId | UUID | Unique Identifier |
| userId | UUID | Link to User account |
| departmentId | UUID | Associated Department |
| positionId | UUID | Associated Position |
| rank | Integer | Employee seniority rank |
| phoneNumber | String | Contact number |
| town | String | City/Town of residence |
| address | Text | Full physical address |
| dateOfBirth | Date | Birth date |
| country | String | Country (Default: Cameroon) |
| hireDate | Date | Date of hiring |
| contractType | Enum | CDD, CDI, STAGE, FREELANCE, OTHER |
| trialEndDate | Date | End of probation period |
| avatar | String | URL or Base64 of profile picture |

### 3.2 Task Data
| Field | Type | Description |
| :--- | :--- | :--- |
| taskId | UUID | Unique Identifier |
| title | String | Task summary |
| description | Text | Detailed instructions |
| state | Enum | Current status (e.g., IN_PROGRESS) |
| difficulty | Enum | EASY, MEDIUM, HARD |
| dueDate | Date | Deadline |
| timePeriod | Enum | DAY, WEEK, MONTH, HOURS |
| hoursAllowed | Number | Allocated time (if applicable) |
| source | Enum | MANAGER_ASSIGNED, SELF_ASSIGNED |
| assignedTo | UUID | ID of assigned Employee |
| assignedToTeam | UUID | ID of assigned Team |
| blockReason | String | Reason if task is blocked |
| timestamps | Dates | assignedAt, startedAt, completedAt, reviewedAt |

### 3.3 Document Data
| Field | Type | Description |
| :--- | :--- | :--- |
| name | String | Document Title |
| description | Text | Optional details |
| filePath | String | Storage path |
| fileType | String | e.g., PDF, IMAGE |
| category | String | CONTRACT, ID, DIPLOMA, OTHER |
| uploadedBy | String | Role of uploader (EMPLOYEE / MANAGER) |

### 3.4 Sanction Data
| Field | Type | Description |
| :--- | :--- | :--- |
| type | Enum | AVERTISSEMENT, BLAME, MISE_A_PIED, etc. |
| title | String | Subject of sanction |
| reason | Text | Detailed justification |
| severity | String | LEGER, MOYEN, GRAVE |
| date | Date | Date of occurrence |
| issuedBy | UUID | Manager ID |

### 3.5 Formation (Training) Data
| Field | Type | Description |
| :--- | :--- | :--- |
| title | String | Name of training |
| organization | String | Training provider |
| startDate | Date | Start date |
| endDate | Date | Completion date |
| certificate | String | Certificate details/path |

### 3.6 Entretien (Interview) Data
| Field | Type | Description |
| :--- | :--- | :--- |
| type | Enum | ANNUEL, PROFESSIONNEL, EVALUATION, DISCIPLINAIRE |
| title | String | Subject |
| date | Date | Scheduled date |
| status | String | SCHEDULED, COMPLETED, CANCELLED |
| notes | Text | Outcome/Minutes |
