# CLAUDE.md — Debug-me Revolution

## What is Debug-me?

Debug-me is a **Personal Life Operating System** — the central hub that manages every dimension of life: time, discipline, finances, relationships, health, and personal growth. The name means "debug my life" — treat life like software, find the bugs, and fix them.

## Vision & Ecosystem

Debug-me is the **core platform** in an ecosystem of connected apps. Each app is a "lens" that views life data from a different angle, while Debug-me holds the single source of truth.

```
              ┌─────────────────────────────┐
              │       Debug-me (Hub)        │
              │  Time · Tasks · Money ·     │
              │  Diary · Projects · Health  │
              └──────────┬──────────────────┘
                         │ shares data
        ┌────────────────┼────────────────────┐
        ▼                ▼                    ▼
   ┌─────────┐    ┌───────────┐      ┌──────────────┐
   │ Cuteped │    │  Fingrow  │      │  Health Desk │
   └─────────┘    └───────────┘      └──────────────┘
```

**Sub-projects live in `Project/` folder** — each has its own git repo (gitignored from Debug-me).

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 6 (port 5200)
- **Styling:** Tailwind CSS 4 (via @tailwindcss/vite plugin)
- **Database:** Firebase Firestore with persistentLocalCache + multi-tab support
- **Auth:** Firebase Auth
- **AI:** Google Gemini 2.0 Flash (via @google/genai)
- **Charts:** Recharts
- **Rich Text:** TipTap (diary)
- **Drag & Drop:** @dnd-kit
- **Icons:** Lucide React
- **Deploy:** Firebase Hosting (`debug-me-8036c.web.app`) + VPS Nginx (`45.77.168.37`)
- **Repo:** `https://github.com/ducklor-adv/Debug-Me`

---

## RULES — กฎเหล็ก (ต้องทำตามเสมอ)

### Data Layer Rules
1. **types.ts is the ONLY place for types** — ทุก interface, type, constant ต้องอยู่ใน types.ts ห้ามประกาศซ้ำในไฟล์อื่น
2. **firestoreDB.ts is the ONLY data layer** — ทุกการ read/write Firestore ต้องผ่าน lib/firestoreDB.ts เสมอ ห้ามเรียก Firestore SDK ตรงจาก component
3. **firebase.ts is the ONLY Firebase init** — ห้ามสร้าง Firebase app instance ใหม่ใน component (ยกเว้น ProjectManager ที่ต้องใช้ listDb แยกเพราะ persistentLocalCache conflict — นี่คือ known exception)

### State Management Rules (ปัจจุบัน)
4. **App.tsx เป็น state owner** — state หลัก (tasks, expenses, projects, habits ฯลฯ) อยู่ใน App.tsx ส่ง props ลงไป
5. **Component ใหม่ที่มี Firestore ของตัวเอง** (เช่น DiaryView, ProjectListView) — สามารถจัดการ state ภายใน component ได้เลย ไม่ต้องยกขึ้น App.tsx ถ้าไม่มี view อื่นต้องใช้ data นั้น
6. **Local UI state (isOpen, isEditing, selectedTab ฯลฯ)** — เก็บใน component ได้ ไม่ต้องยกขึ้น App.tsx

### Naming Convention
7. **Variable/function names** → English เสมอ (camelCase)
8. **Firestore field names** → English เสมอ
9. **UI labels/text ที่ user เห็น** → Thai
10. **Variable ที่เก็บค่า Thai string** → ใช้ชื่อ English ที่สื่อความหมาย เช่น `groupKey = 'งานหลัก'` ไม่ใช่ `const งานหลัก = ...`
11. **Comments** → English หรือ Thai ก็ได้ แต่ให้สั้นกระชับ

### Code Style
12. **Indentation** → 2 spaces (ไม่ใช่ tab)
13. **Import order** → React/libs → firebase → types → lib/ → services/ → components (แยกกลุ่มด้วยบรรทัดว่าง)
14. **TypeScript** → ไม่ได้เปิด strict mode แต่ควรใส่ type ให้ชัดเจน ห้ามใช้ `any` ยกเว้นจำเป็นจริงๆ
15. **ห้าม `console.log` ใน production** — ใช้ได้ตอน debug แต่ต้องลบก่อน commit
16. **ห้าม `// @ts-ignore`** — แก้ type ให้ถูกแทน

### Code Quality
17. **Component ใหม่ต้องไม่เกิน 500 บรรทัด** — ถ้าเกิน ให้แตกเป็น sub-component
18. **ทุก function ใหม่ใน lib/ และ services/** — ควรมี JSDoc comment อธิบายสั้นๆ ว่าทำอะไร

---

## DO NOT — ห้ามทำเด็ดขาด

- **ห้ามเพิ่ม dependency ใหม่** โดยไม่ได้ถาม Joe ก่อน
- **ห้ามแก้ types.ts** โดยไม่ตรวจว่ากระทบไฟล์ไหนบ้าง (grep ก่อน)
- **ห้ามสร้าง Firebase app instance ใหม่** ใน component (ใช้ db จาก firebase.ts)
- **ห้ามเก็บ binary/base64 ใน Firestore** — Firestore doc limit 1MB, ใช้ Firebase Storage แทน
- **ห้ามแก้ firestore.rules** โดยไม่บอก Joe — security rules กระทบทุก user
- **ห้ามลบ code ที่ทำงานอยู่** เพื่อ refactor โดยไม่ถามก่อน — ทำ additive change เสมอ
- **ห้ามเพิ่ม props ใหม่ใน App.tsx** ถ้า data นั้นใช้แค่ใน component เดียว — จัดการ state ภายใน component แทน
- **ห้ามแก้ไฟล์ใน Project/** เมื่อกำลังทำงาน Debug-me core — sub-projects แยก repo
- **ห้าม commit ไฟล์ `.env`, API key, credentials** — ใช้ `.env` + `.gitignore` เท่านั้น
- **ห้าม `console.log` ค้างใน code** — ลบให้หมดก่อน commit

---

## Refactoring Roadmap (แผนแตกไฟล์)

Component ใหญ่ที่ต้องแตก — **ยังไม่ทำ แต่เมื่อแก้ไขให้ค่อยๆ แยกออก**:

```
DailyPlanner.tsx (2086 lines) → แตกเป็น:
  - TemplateSelector.tsx     — เลือก/สร้าง schedule template
  - TimeSlotList.tsx         — แสดง slot list + drag reorder
  - SlotEditor.tsx           — แก้ไข slot เดี่ยว
  - WeekView.tsx             — 7-day planner view

TaskManager.tsx (1547 lines) → แตกเป็น:
  - GroupBubbles.tsx         — bubble UI แสดง task groups
  - TaskCard.tsx             — card แสดง task เดี่ยว
  - TaskFilters.tsx          — filter/sort controls

ExpenseTracker.tsx (1479 lines) → รอ redesign ก่อนแตก

Dashboard.tsx (1119 lines) → แตกเป็น:
  - CurrentSlotCard.tsx      — hero card ตอนนี้ทำอะไร
  - UpcomingSlots.tsx         — remaining slots list
  - WeeklyBillsSection.tsx    — weekly expenses dropdown
  - GroupPopup.tsx            — popup งานด่วน/นัดหมาย
```

**วิธีแตก:** เมื่อแก้ไข component ใหญ่ ให้แยก section ที่แก้ออกเป็นไฟล์ใหม่ (ค่อยๆ ทำ ไม่ต้อง refactor ทั้งหมดรอบเดียว)

---

## Pattern: เพิ่ม Firestore Collection ใหม่

ทำตามลำดับนี้:

```
1. types.ts        — เพิ่ม interface (เช่น DiaryEntry)
2. firestoreDB.ts  — เพิ่ม CRUD functions (save, delete, subscribe, query)
3. Component       — สร้าง component ใหม่ใน components/
                     จัดการ state ภายใน ถ้าใช้แค่ view เดียว
                     หรือเพิ่ม state ใน App.tsx ถ้าหลาย view ต้องใช้
4. App.tsx          — เพิ่ม lazy import + case ใน renderContent()
5. Nav             — เพิ่มใน NAV_ITEMS (bottom) หรือ sidebar
```

**ตัวอย่างจริง:** ดู DiaryView.tsx — มี Firestore collection ของตัวเอง (`diaryEntries`), จัดการ state ภายใน, ไม่ยกขึ้น App.tsx

## Pattern: เพิ่ม Feature ใน Dashboard

```
1. เพิ่ม state ใน Dashboard.tsx (local UI state)
2. เพิ่ม props ใน DashboardProps ถ้าต้องการ data จาก App.tsx
3. ส่ง props จาก App.tsx ใน renderContent() case 'dashboard'
4. ถ้า section ใหม่เกิน 50 บรรทัด → แยกเป็น sub-component
```

## Pattern: Popup/Modal

```
1. State: const [showXxx, setShowXxx] = useState(false)
2. Trigger: <button onClick={() => setShowXxx(true)}>
3. Modal: fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center
4. Content: bg-white rounded-2xl max-w-sm max-h-[70vh] overflow-hidden shadow-2xl
5. Close: onClick overlay = close, X button = close
```

---

## Project Structure

```
Debug-me-Revolution/
├── CLAUDE.md              ← You are here (กฎเหล็ก)
├── App.tsx                ← Main app — state owner, nav, routing
├── types.ts               ← ALL TypeScript interfaces & constants
├── firebase.ts            ← Firebase config (Auth + Firestore)
├── index.tsx / index.html / index.css
├── vite.config.ts         ← Vite config (port 5200)
│
├── components/            ← All UI views
│   ├── Dashboard.tsx          — Today overview + popups
│   ├── TaskManager.tsx        — Task groups & management
│   ├── DailyPlanner.tsx       — Schedule templates & time slots
│   ├── ExpenseTracker.tsx     — Income/expense/balance sheet
│   ├── DiaryView.tsx          — Journal with TipTap rich text
│   ├── ProjectManager.tsx     — Project list + Kanban + Timeline
│   ├── Analytics.tsx          — Productivity charts
│   ├── CalendarView.tsx       — Calendar
│   ├── FocusTimer.tsx         — Pomodoro timer
│   ├── Login.tsx              — Firebase auth UI
│   ├── TaskEditModal.tsx      — Task editor modal
│   ├── ProjectTimeline.tsx    — Project timeline view
│   ├── ProjectAIChat.tsx      — AI chat for projects
│   ├── AIImportModal.tsx      — AI data import
│   ├── TimePicker.tsx         — Time input
│   └── UndoToast.tsx          — Undo notification
│
├── lib/
│   └── firestoreDB.ts     ← ALL Firestore CRUD (appData, records, focus, diary)
│
├── services/
│   ├── geminiService.ts       ← Gemini AI functions
│   ├── aiPromptGenerator.ts   ← AI prompt templates
│   ├── behaviorAnalysis.ts    ← User behavior analysis
│   ├── locationService.ts     ← GPS service
│   └── notificationService.ts ← Push notifications
│
├── hooks/                 ← Custom React hooks
├── data/                  ← Static data (habit templates)
├── public/                ← Static assets
├── dist/                  ← Production build
│
└── Project/               ← ECOSYSTEM sub-projects (gitignored)
    ├── Truck-Kub/         ├── cuteped/        ├── C-Root/
    ├── Trackmydesk-fresh/ ├── Fingame/        ├── PNC/
    ├── DooGrade/          ├── Health Desk/    ├── FingrowV5/
    ├── Taokaeyai/         ├── Finny/          ├── Budtboy/
    └── Layered Time Theory/ + layered_time_arxiv_package/
```

## Firestore Data Model

```
users/{uid}/
├── config/appData          ← Single doc: tasks, groups, milestones,
│                              scheduleTemplates, projects, expenses, balanceItems
├── dailyRecords/{id}       ← Task completion records
├── focusSessions/{id}      ← Pomodoro session logs
└── diaryEntries/{id}       ← Journal entries (TipTap JSON)

public/
└── agentFamilyBoard        ← Project list data (no auth required)
```

## Navigation Structure

**Bottom Nav (mobile — 5 items):**
TODAY | Planner | Tasks | Expenses | Projects

**Sidebar (desktop):**
Diary | Analyst | Calendar

## Life Categories (หมวดหมู่ชีวิต)

- 💼 career — งานหลัก, งานรอง
- 💪 health — สุขภาพ, พักผ่อน
- 🏠 home — กิจวัตร, งานบ้าน, ธุระส่วนตัว
- ❤️ relationship — ครอบครัว, เข้าสังคม
- 🧠 mind — พัฒนาตัวเอง, สงบใจ
- ⏸️ break — คั่นเวลา
- 🌙 sleep — นอน
- Quick-access (no category): งานด่วน ⚡, นัดหมาย 📅

## Environment Setup

- **Node.js** → v24.x (ใช้ v24.14.0)
- **npm** → v11.x
- **`.env` ที่ต้องมี:**
  - `GEMINI_API_KEY` — Google Gemini API key (สำหรับ AI features)
- **Firebase config** → อยู่ใน `firebase.ts` (ใช้ env vars หรือ hardcode ตาม environment)
- **ไม่มี linter/prettier** ตั้งค่าไว้ — ใช้ convention ใน CLAUDE.md แทน

---

## Testing

- **ยังไม่มี test framework** — แผนจะใช้ Vitest
- **เมื่อเพิ่ม feature ใหม่ใน `lib/` หรือ `services/`** ควรเขียน unit test ด้วย (เมื่อ Vitest พร้อม)
- **ห้าม break existing behavior** — ถ้าแก้ logic ที่มีอยู่ ต้อง manual test ก่อน commit
- **Manual test checklist ก่อน deploy:**
  1. เปิด Dashboard — ดู current slot, countdown ถูกต้อง
  2. เปิด Planner — สร้าง/แก้ slot ได้
  3. เปิด Tasks — เพิ่ม/ลบ/เช็ค task ได้
  4. เปิด Expenses — เพิ่มรายจ่ายได้
  5. เปิด Diary — สร้าง/แก้ entry ได้

---

## Security & Safety

- **API keys / secrets** → เก็บใน `.env` เท่านั้น ห้าม hardcode ใน source code
- **`.env` อยู่ใน `.gitignore`** — ห้าม commit ขึ้น repo เด็ดขาด
- **Firebase Security Rules** → ห้ามแก้โดยไม่บอก Joe (กระทบทุก user)
- **Firestore access** → ทุก read/write ต้องผ่าน `firestoreDB.ts` เพื่อควบคุม access pattern
- **User input** → sanitize ก่อนเขียนลง Firestore (โดยเฉพาะ rich text จาก TipTap)
- **ห้ามเก็บ sensitive data ใน localStorage** — ใช้ Firebase Auth token เท่านั้น

---

## Workflow & Process

### ก่อนเขียนโค้ด
1. **อ่าน code ที่เกี่ยวข้องก่อน** — ห้ามแก้ไฟล์ที่ยังไม่ได้อ่าน
2. **grep หา impact** — ถ้าแก้ types.ts หรือ firestoreDB.ts ต้องเช็คว่ากระทบไฟล์ไหนบ้าง
3. **วางแผนก่อนทำ** — ถ้างานซับซ้อน ให้สรุปแผนให้ Joe ดูก่อน

### ระหว่างเขียน
- ทำ **additive change** เสมอ — อย่าลบ code ที่ทำงานอยู่
- แก้ทีละจุด commit ทีละจุด — อย่ารวมหลาย feature ใน commit เดียว
- ถ้า component เริ่มยาว → แยก sub-component ออกไปเลย

### หลังเขียนเสร็จ
1. ลบ `console.log` ทั้งหมด
2. เช็คว่าไม่มี TypeScript error (`npm run build`)
3. Manual test ตาม checklist
4. Review diff ก่อน commit

---

## Error Handling

- **Firestore operations** → ใช้ try-catch ครอบ แล้ว log error (ไม่ต้อง throw ถ้า UI handle ได้)
- **User-facing errors** → แสดงเป็น Thai message สั้นๆ ใน toast/inline (ไม่ต้อง show stack trace)
- **Network errors** → app รองรับ offline ผ่าน Firestore persistentLocalCache อยู่แล้ว ไม่ต้อง handle เพิ่ม
- **AI (Gemini) errors** → catch แล้วแสดง fallback message ไม่ต้อง crash app

---

## Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server → http://localhost:5200
npm run build        # Production build → dist/
npm run preview      # Preview production build
```

## Deploy

```bash
npm run build && firebase deploy --only hosting
# Production: https://debug-me-8036c.web.app
```

## Known Issues & Backlog

- No test framework — need Vitest setup + unit tests for lib/ and services/
- Firebase Storage not configured — Diary attachments can't persist yet (Phase 3)
- Large components need splitting (see Refactoring Roadmap above)
- `pw-free-online.exe` should be removed from repo
