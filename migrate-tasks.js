/**
 * Migration Script — Reset all tasks to Project Portfolio
 *
 * วิธีใช้:
 * 1. เปิด Debug-Me app ที่ localhost:5173 แล้ว login
 * 2. เปิด Browser Console (F12 → Console)
 * 3. Copy ทั้งหมดแล้ว paste ลง console แล้วกด Enter
 * 4. รอจนเห็น "Migration complete!" แล้ว refresh หน้า
 */

// Import Firebase modules from the app's existing bundle
const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js');
const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js');
const { getFirestore, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js');

const firebaseConfig = {
  apiKey: "AIzaSyAvVyJCNS3GPvSeY-RfhoplxaucnG7lHOo",
  authDomain: "debug-me-8036c.firebaseapp.com",
  projectId: "debug-me-8036c",
  storageBucket: "debug-me-8036c.firebasestorage.app",
  messagingSenderId: "357813357110",
  appId: "1:357813357110:web:757261c744f6a6a6552697",
};

// Use existing app or create new
let app;
try { app = initializeApp(firebaseConfig, 'migrate'); } catch { app = initializeApp(firebaseConfig); }
const auth = getAuth(app);
const db = getFirestore(app);

// Check auth
const user = auth.currentUser;
if (!user) {
  // Try getting from the main app instance
  const mainAuth = getAuth();
  const mainUser = mainAuth.currentUser;
  if (!mainUser) {
    console.error('❌ ยังไม่ได้ login! กรุณา login ก่อนแล้วลองใหม่');
    throw new Error('Not authenticated');
  }
  console.log('✅ Found user:', mainUser.email);
  var uid = mainUser.uid;
} else {
  console.log('✅ Found user:', user.email);
  var uid = user.uid;
}

// ===== NEW TASKS — All projects as งานหลัก =====
const now = new Date().toISOString();
const newTasks = [
  {
    id: `proj-${Date.now()}-01`,
    title: "Debug-Me",
    description: "Core platform — debug ชีวิต creator แล้ว spawn apps จาก real pain points\nระบบรวม Task, Schedule, Focus Timer, Habit, Expense, Analytics, AI Coach\n\nTech: React 19 + TypeScript + Vite + Tailwind + Firebase + Gemini AI\nStatus: Production\nRepo: ducklor-adv/Debug-Me.git",
    priority: "High",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-02`,
    title: "Truck-Kub",
    description: "ระบบโลจิสติกส์ขนส่งผลไม้ตู้เย็นข้ามแดน TH→LA→VN→CN\nI'AM Blueprint Tool, 29 actions, 12 roles, 16 entities, 247 fields\n\nTech: React 18 + TypeScript + Vite + Tailwind + Firebase + i18next\nStatus: Blueprint phase\nRepo: ducklor-adv/Truckkub.git\nFolder: Project/Truck-Kub/",
    priority: "High",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-03`,
    title: "Trackmydesk (TMD)",
    description: "ระบบ track activity พนักงาน, ปฏิทิน, จัดการเอกสาร, admin panel\nรองรับหลายภาษา + export PDF/XLSX\n\nTech: React 19 + TypeScript + Ant Design + Recharts\nStatus: Production\nFolder: Project/Trackmydesk-fresh/",
    priority: "High",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-04`,
    title: "Cuteped",
    description: "แชทคู่รัก + AI 'คิวท์-เป็ด' กามเทพในร่างเป็ดเบรกก่อนพิมพ์คำทำร้ายจิตใจ\nVideo Call, Mood Tracker, Secret Vault, Chat Analyzer\n\nTech: React 19 + Firebase + Gemini AI + Framer Motion\nStatus: มี App แล้ว\nRelation: Data sync กับ Debug-Me (Mood + Calendar)\nFolder: Project/cuteped/",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-05`,
    title: "Fingame",
    description: "แพลตฟอร์มการเงิน + ตลาดมือสอง + ระบบ MLM (ACF)\nFinpoint transactions, ประกัน, real-time dashboard\n\nTech: React + Node.js/Express + PostgreSQL + Socket.io\nStatus: Production\nFolder: Project/Fingame/",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-06`,
    title: "PNC",
    description: "IT Service Management (ITSM) + AI Ticket Triage ด้วย Gemini 3\nจัดการ asset/vendor, CRM integration\n\nTech: React 19 + TypeScript + Ant Design + Gemini API\nStatus: Production\nFolder: Project/PNC/",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-07`,
    title: "DooGrade",
    description: "ระบบจัดการเกรดนักเรียน import Excel, upload PDF\nเก็บข้อมูลห้องเรียน\n\nTech: Python Flask + SQLite + HTML/CSS/JS\nStatus: Production\nFolder: Project/DooGrade/",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-08`,
    title: "C-Root",
    description: "'สร้างรากไปดูดเงิน' — AI Automated Affiliate Content\nROI Gate ก่อนสร้าง content ทุกครั้ง, 5 platforms, 18 niches\n\nTech: OpenClaw Skills + Static HTML\nStatus: Research phase\nRelation: Data sync กับ Debug-Me (Revenue + ROI)\nFolder: Project/C-Root/",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-09`,
    title: "Health Desk",
    description: "ระบบสุขภาพชุมชนสำหรับ อสม.\nAI พยากรณ์ความเสี่ยงสุขภาพ, รายงานอัตโนมัติ, Mobile PWA\n\nTech: HTML5/CSS3 (planned: Node.js + PostgreSQL + Python/TensorFlow)\nStatus: Design phase\nFolder: Project/Health Desk/",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-10`,
    title: "Taokaeyai",
    description: "React + TypeScript web app template/framework\nพร้อม routing + charting\n\nTech: React 19 + React Router + Recharts + Tailwind\nStatus: Framework ready\nFolder: Project/Taokaeyai/",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-11`,
    title: "Layered Time Theory",
    description: "ทฤษฎีจักรวาลวิทยาทางเลือก + วิเคราะห์ข้อมูลดาราศาสตร์\nPaper ArXiv พร้อมส่ง (67% evidence support)\n\nTech: Python (NumPy/Pandas/SciPy) + LaTeX\nStatus: Research + Paper ready\nFolder: Project/Layered Time Theory/ + Project/layered_time_arxiv_package/",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-12`,
    title: "FingrowV5",
    description: "น่าจะ version ใหม่ของ Fingame/Fingrow platform\n\nStatus: ไม่ชัดเจน\nFolder: Project/FingrowV5/",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-13`,
    title: "Smart Menu",
    description: "งานหลัก — ยังไม่มี description\n\nStatus: Idea\nFolder: ยังไม่มี",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-14`,
    title: "EASY PLAN",
    description: "ใช้ AI ออกแบบบ้านสำหรับ อบต.\n\nStatus: Idea\nFolder: ยังไม่มี",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-15`,
    title: "Mindmap Agent",
    description: "Agent สร้าง mind map อัตโนมัติ\n\nStatus: Idea\nFolder: ยังไม่มี",
    priority: "Medium",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-16`,
    title: "APP บริหารตู้เย็น",
    description: "บริหารตู้เย็น/ค่าใช้จ่าย\nต่อยอดไปบริหารตู้เสื้อผ้า\n\nStatus: Idea\nFolder: ยังไม่มี",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-17`,
    title: "Bueaty book",
    description: "จองคิวร้านเสริมสวย\n\nStatus: Idea\nFolder: ยังไม่มี",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-18`,
    title: "Growcraft",
    description: "ปลูกพืชแบบ craft\n\nStatus: Idea\nFolder: ยังไม่มี",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-19`,
    title: "ผัสสะ",
    description: "Custom newspaper — เลือกรับข่าวสารเฉพาะที่ตัวเองสนใจ\n\nStatus: Idea\nFolder: ยังไม่มี",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-20`,
    title: "I-LOVE-YOU-BENNIE-WANG",
    description: "Google Cloud Storage integration + Google Auth\n\nStatus: ไม่ชัดเจน\nFolder: Project/I-LOVE-YOU-BENNIE-WANG/",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-21`,
    title: "Finny",
    description: "Video clips + images (AI-generated content)\nไม่ใช่ app — เป็น media assets\n\nStatus: Media collection\nFolder: Project/Finny/",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
  {
    id: `proj-${Date.now()}-22`,
    title: "Budtboy",
    description: "Folder ว่าง ยังไม่มีไฟล์\n\nStatus: Empty\nFolder: Project/Budtboy/",
    priority: "Low",
    completed: false,
    category: "งานหลัก",
    dayTypes: ["workday", "saturday", "sunday"],
  },
];

// Read existing data first
const mainAuth2 = getAuth();
const mainDb = getFirestore();
const ref = doc(mainDb, 'users', uid, 'config', 'appData');
const snap = await getDoc(ref);
const existing = snap.exists() ? snap.data() : {};

console.log(`📋 Old tasks: ${existing.tasks?.length || 0}`);
console.log(`📋 New tasks: ${newTasks.length}`);

// Save — replace tasks but keep everything else
const updated = {
  ...existing,
  tasks: newTasks,
  projects: [], // Reset projects too — will auto-create from tasks
};

await setDoc(ref, updated);
console.log('✅ Migration complete! Refresh the page (F5) to see changes.');
console.log('📌 ทุก task ตั้งเป็น "งานหลัก" — ไปแยกหลัก/รองได้ใน app');
