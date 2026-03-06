export interface HabitTemplate {
  name: string;
  emoji: string;
  description: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  customDays?: number[];
  color: string;
  category: string;
}

export const HABIT_CATEGORIES = [
  { key: 'health', label: 'สุขภาพ', emoji: '💪' },
  { key: 'learning', label: 'การเรียนรู้', emoji: '📖' },
  { key: 'mindfulness', label: 'สติ & จิตใจ', emoji: '🧘' },
  { key: 'relationships', label: 'ความสัมพันธ์', emoji: '💕' },
  { key: 'finance', label: 'การเงิน', emoji: '💰' },
  { key: 'productivity', label: 'ประสิทธิภาพ', emoji: '🎯' },
];

export const HABIT_TEMPLATES: HabitTemplate[] = [
  // สุขภาพ
  { name: 'ดื่มน้ำ 8 แก้ว', emoji: '💧', description: 'ดื่มน้ำสะอาดอย่างน้อย 8 แก้วต่อวัน', frequency: 'daily', color: 'cyan', category: 'health' },
  { name: 'ออกกำลังกาย 30 นาที', emoji: '🏃', description: 'วิ่ง เวท หรือคาร์ดิโอ', frequency: 'daily', color: 'green', category: 'health' },
  { name: 'กินผักผลไม้', emoji: '🍎', description: 'กินผักผลไม้อย่างน้อย 5 ส่วนต่อวัน', frequency: 'daily', color: 'emerald', category: 'health' },
  { name: 'นอนก่อน 4 ทุ่ม', emoji: '😴', description: 'เข้านอนก่อน 22:00 เพื่อพักผ่อนเต็มที่', frequency: 'daily', color: 'indigo', category: 'health' },
  { name: 'ยืดเส้น / สเตรช', emoji: '🧘', description: 'ยืดเส้นยืดสายอย่างน้อย 10 นาที', frequency: 'daily', color: 'teal', category: 'health' },
  { name: 'ไม่กินขนมหลัง 2 ทุ่ม', emoji: '🚫', description: 'งดอาหารว่างหลัง 20:00', frequency: 'daily', color: 'rose', category: 'health' },
  // การเรียนรู้
  { name: 'อ่านหนังสือ 30 นาที', emoji: '📖', description: 'อ่านหนังสือที่ให้ความรู้หรือแรงบันดาลใจ', frequency: 'daily', color: 'amber', category: 'learning' },
  { name: 'เรียนภาษาใหม่', emoji: '🧠', description: 'ฝึกภาษาผ่านแอปหรือสื่อ 15 นาที', frequency: 'daily', color: 'violet', category: 'learning' },
  { name: 'ฟัง Podcast', emoji: '🎧', description: 'ฟัง podcast ที่ให้ความรู้ระหว่างเดินทาง', frequency: 'weekdays', color: 'blue', category: 'learning' },
  { name: 'เขียน Journal', emoji: '✍️', description: 'เขียนบันทึกสิ่งที่เรียนรู้วันนี้', frequency: 'daily', color: 'amber', category: 'learning' },
  // สติ & จิตใจ
  { name: 'นั่งสมาธิ 10 นาที', emoji: '🧘', description: 'นั่งสมาธิหรือฝึกหายใจลึก', frequency: 'daily', color: 'teal', category: 'mindfulness' },
  { name: 'เขียน 3 สิ่งที่ขอบคุณ', emoji: '🙏', description: 'บันทึกสิ่งดีๆ 3 อย่างที่เกิดขึ้นวันนี้', frequency: 'daily', color: 'rose', category: 'mindfulness' },
  { name: 'ไม่เล่นมือถือก่อนนอน', emoji: '📵', description: 'วางมือถือก่อนนอน 30 นาที', frequency: 'daily', color: 'indigo', category: 'mindfulness' },
  { name: 'ออกไปเดินข้างนอก', emoji: '🌿', description: 'เดินข้างนอกรับแสงแดด 15 นาที', frequency: 'daily', color: 'emerald', category: 'mindfulness' },
  // ความสัมพันธ์
  { name: 'โทรหาคนที่รัก', emoji: '📞', description: 'โทรหาครอบครัวหรือเพื่อนสนิท', frequency: 'daily', color: 'rose', category: 'relationships' },
  { name: 'ทำดีให้คนอื่น', emoji: '💕', description: 'ช่วยเหลือหรือพูดให้กำลังใจใครสักคน', frequency: 'daily', color: 'pink', category: 'relationships' },
  { name: 'ใช้เวลากับครอบครัว', emoji: '👨‍👩‍👧', description: 'ทำกิจกรรมร่วมกับครอบครัว', frequency: 'daily', color: 'amber', category: 'relationships' },
  // การเงิน
  { name: 'บันทึกรายรับ-รายจ่าย', emoji: '💰', description: 'จดบันทึกทุกรายการใช้จ่ายวันนี้', frequency: 'daily', color: 'amber', category: 'finance' },
  { name: 'ไม่ซื้อของไม่จำเป็น', emoji: '🛑', description: 'คิดก่อนซื้อ — จำเป็นจริงไหม?', frequency: 'daily', color: 'rose', category: 'finance' },
  { name: 'เช็คเป้าหมายการออม', emoji: '🏦', description: 'ทบทวนความคืบหน้าการออมเงิน', frequency: 'custom', customDays: [0], color: 'green', category: 'finance' },
  // ประสิทธิภาพ
  { name: 'วางแผนวันพรุ่งนี้', emoji: '📋', description: 'เขียน to-do list สำหรับวันพรุ่งนี้ก่อนนอน', frequency: 'daily', color: 'blue', category: 'productivity' },
  { name: 'ทำงานสำคัญก่อน', emoji: '🎯', description: 'ทำ task ที่สำคัญที่สุดเป็นอย่างแรก (Eat the Frog)', frequency: 'weekdays', color: 'emerald', category: 'productivity' },
  { name: 'จัดโต๊ะ / ห้อง', emoji: '🧹', description: 'ทำความสะอาดพื้นที่ทำงาน 5 นาที', frequency: 'daily', color: 'cyan', category: 'productivity' },
  { name: 'Review สัปดาห์', emoji: '📊', description: 'ทบทวนสิ่งที่ทำได้/ไม่ได้ในสัปดาห์นี้', frequency: 'custom', customDays: [0], color: 'violet', category: 'productivity' },
];
