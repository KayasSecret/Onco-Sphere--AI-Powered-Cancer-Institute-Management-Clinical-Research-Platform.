# HELIX — Oncology Intelligence Platform — Agent Guidelines

## 1. Project Context & Design System
- **Stack**: React + Vite + Tailwind (frontend), FastAPI + SQLAlchemy (backend), MySQL `cancer_institute` (database).
- **Theme**: Light theme is default (`bg-surface-base: #F4F7FB`, `bg-surface-card: #FFFFFF`, `border-surface-border: #DDE3EE`). Dark theme is supported via `.dark` class on root.
- **Design Tokens**: Re-use tokens in `src/index.css` and `tailwind.config.js`:
  - Surfaces: `bg-surface-base`, `bg-surface-card`, `border-surface-border`, `bg-surface-hover`
  - Brand: `text-brand-navy`, `text-brand-blue`, `text-brand-blue-dark`, `bg-brand-blue`, `bg-brand-navy`
  - Ink: `text-ink-primary`, `text-ink-secondary`, `text-ink-disabled`, `text-ink-inverse`
  - Status: `text-status-active`, `bg-status-active-bg`, `text-status-attention`, `bg-status-attention-bg`, `text-status-critical`, `bg-status-critical-bg`, `text-status-inactive`, `bg-status-inactive-bg`

## 2. Visits Module Enums & Values
- **Visit Type**:
  - `Initial Consultation`
  - `Follow-up`
  - `Chemotherapy`
  - `Radiation Therapy`
  - `Surgery`
  - `Diagnostic`
  - `Emergency`
  - `Treatment Review`
  - `Post-operative Follow-up`
- **Visit Status**:
  - `Scheduled` (Blue)
  - `Checked In` (Cyan)
  - `In Consultation` (Amber)
  - `Completed` (Green)
  - `Cancelled` (Gray)
  - `No Show` (Red)

## 3. Database Rules
- The single source of truth database is MySQL `cancer_institute`.
- DO NOT create SQLite or alternate databases.
- Table creation and schema updates must use valid MySQL DDL (`AUTO_INCREMENT`, `NOW()`).

## 4. Navigation & Hierarchy
- Global Sidebar nav items in `AppLayout.jsx`:
  1. Onco Dashboard (`/dashboard`)
  2. Onco Register (`/patients`)
  3. Onco Receipt (`/reports`)
  4. Onco Access (`/admin-management`)
  5. Settings (`/settings`)
- Patient Visits are localized inside each patient profile (`/patients/:id`) under the **Visits** tab (5th tab, after Cancer Images).