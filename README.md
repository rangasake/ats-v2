# 🚗 AFTS — Automated Vehicle Fitness Testing Station

A full-stack web application for managing vehicle fitness inspections, built with **Next.js**, **Google Sheets as the database**, and deployed on **Vercel**.

---

## 📋 Features

| Feature | Details |
|---|---|
| **Role-based Access** | Inspector, Supervisor, Admin |
| **Multi-step Form** | Common Data → Documents → Visual Test → Staff & Feedback |
| **Lane-type Filtering** | Show/hide checklist items per lane type (Admin configurable) |
| **Vehicle Search** | Auto-populate data from Google Sheets by Vehicle Number |
| **Supervisor Review** | Approve/Reject with Agent info & Booking ID |
| **A4 Print** | Full certificate printout |
| **Mobile-first UI** | Designed for phones and tablets |
| **Google Sheets DB** | No separate database needed |

---

## 🛠️ Tech Stack

- **Frontend & Backend**: Next.js 14 (JavaScript)
- **Database**: Google Sheets (via Google Sheets API)
- **Auth**: JWT stored in HttpOnly cookie
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

---

## 🚀 Setup Guide

### Step 1 — Google Sheets Setup

1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)
2. Note the **Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
3. Create the following tabs (exact names matter):
   - `Users`
   - `Vehicles`
   - `Inspections`
   - `LaneConfig`
   - `InsuranceCompanies`
   - `Staff`
   - `Agents`

4. Add the first row (headers) to each tab as shown in `lib/googleSheets.js` `initializeSheets()`, OR call the init endpoint once after deploying.

### Step 2 — Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Sheets API**
4. Create a **Service Account**: IAM & Admin → Service Accounts → Create
5. Create a key (JSON) and download it
6. Share your Google Sheet with the service account email (`...@....iam.gserviceaccount.com`) — give **Editor** access

### Step 3 — Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
JWT_SECRET=a_long_random_string_at_least_32_chars
```

### Step 4 — Add First Admin User

Manually add a row to the **Users** tab in your Google Sheet:

| username | password | role  | name       | active |
|----------|----------|-------|------------|--------|
| admin    | admin123 | Admin | Admin User | true   |

### Step 5 — Add Staff Members

Add rows to the **Staff** tab:

| name        | role      | active |
|-------------|-----------|--------|
| Ravi Kumar  | Inspector | true   |
| Suresh Babu | Incharge  | true   |

### Step 6 — Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 7 — Deploy to Vercel

1. Push to GitHub
2. Connect repo in [vercel.com](https://vercel.com)
3. Add all environment variables in Vercel project settings
4. Deploy!

---

## 📱 App Flow

```
Login
  ↓
Dashboard
  ↓
New Inspection
  ├── Step 1: Common Data (search vehicle / add new)
  ├── Step 2: Document Checklist (filtered by lane type)
  ├── Step 3: Visual Test Checklist (filtered by lane type)
  └── Step 4: Staff Info & Customer Feedback
              ↓ Submit (status → Pending)
Supervisor Queue
  └── Review → Approve/Reject + Agent info + Booking ID
              ↓ Approved
Print A4 Certificate
```

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| **Inspector** | Create/view own inspections |
| **Supervisor** | View all, approve/reject pending inspections |
| **Admin** | All above + manage users, staff, lane config |

---

## 🗂️ Project Structure

```
ats-app/
├── pages/
│   ├── index.js              # Login
│   ├── dashboard.js          # Main dashboard
│   ├── inspection/
│   │   ├── new.js            # Multi-step form
│   │   └── [id].js           # Inspection detail + print
│   ├── supervisor/
│   │   ├── index.js          # Review queue
│   │   └── review/[id].js    # Review form
│   ├── admin/
│   │   ├── users.js          # User management
│   │   ├── staff.js          # Staff management
│   │   └── lane-config.js    # Lane config
│   └── api/                  # API routes
├── components/
│   ├── layout/AppLayout.js
│   ├── forms/                # Step forms + PrintLayout
│   └── ui/                   # Reusable UI components
├── lib/
│   ├── constants.js          # All app constants
│   ├── googleSheets.js       # Sheets API wrapper
│   ├── auth.js               # JWT helpers
│   └── useAuth.js            # Auth context + hooks
└── styles/globals.css
```

---

## 🖨️ Print Certificate

- Only **Approved** inspections can be printed
- Click "Print Certificate" on the inspection detail page
- Prints A4 with all details, signatures, and disclaimer

---

## ⚙️ Lane Config (Admin)

Go to **Admin → Lane Configuration** to hide/show specific checklist items per lane type.

Example:
- `3T_AUTO_G` → hide Speed Governor, VLT Device, Fog Lamps
- `AMBULANCE` → show all items including Speed Governor, Warning Light

---

## 📞 Support

For issues, check the browser console and Vercel logs for API errors.
