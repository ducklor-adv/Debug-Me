import { TimeSlot } from '../types';

export interface LifestyleTemplate {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  wake: string;   // default wake time for this lifestyle
  slots: Omit<TimeSlot, 'id'>[];  // id is added at seed time
}

/** Build slots with sequential IDs from a lifestyle template */
export function seedLifestyleSlots(template: LifestyleTemplate, prefix = 'ls'): TimeSlot[] {
  return template.slots.map((s, i) => ({ ...s, id: `${prefix}-${template.id}-${i + 1}` }));
}

export const LIFESTYLE_TEMPLATES: LifestyleTemplate[] = [
  {
    id: 'employee',
    name: 'พนักงานประจำ',
    emoji: '💼',
    desc: 'ตื่นเช้า deep work กลับบ้าน ครอบครัว',
    wake: '06:00',
    slots: [
      { startTime: '06:00', endTime: '07:00', groupKey: 'กิจวัตร' },
      { startTime: '07:00', endTime: '08:30', groupKey: 'ธุระส่วนตัว' },
      { startTime: '08:30', endTime: '12:00', groupKey: 'งานหลัก' },
      { startTime: '12:00', endTime: '13:00', groupKey: 'พักผ่อน' },
      { startTime: '13:00', endTime: '17:30', groupKey: 'งานหลัก' },
      { startTime: '17:30', endTime: '18:30', groupKey: 'ธุระส่วนตัว' },
      { startTime: '18:30', endTime: '19:30', groupKey: 'กิจวัตร' },
      { startTime: '19:30', endTime: '21:00', groupKey: 'ครอบครัว' },
      { startTime: '21:00', endTime: '22:00', groupKey: 'พัฒนาตัวเอง' },
      { startTime: '22:00', endTime: '23:00', groupKey: 'สงบใจ' },
    ],
  },
  {
    id: 'freelance',
    name: 'ฟรีแลนซ์',
    emoji: '💻',
    desc: 'ยืดหยุ่น นอนสาย งานกลางวัน+ค่ำ',
    wake: '08:00',
    slots: [
      { startTime: '08:00', endTime: '09:00', groupKey: 'กิจวัตร' },
      { startTime: '09:00', endTime: '12:00', groupKey: 'งานหลัก' },
      { startTime: '12:00', endTime: '13:00', groupKey: 'พักผ่อน' },
      { startTime: '13:00', endTime: '16:00', groupKey: 'งานหลัก' },
      { startTime: '16:00', endTime: '17:00', groupKey: 'ออกกำลังกาย' },
      { startTime: '17:00', endTime: '18:30', groupKey: 'กิจวัตร' },
      { startTime: '18:30', endTime: '22:00', groupKey: 'งานรอง' },
      { startTime: '22:00', endTime: '23:00', groupKey: 'พัฒนาตัวเอง' },
    ],
  },
  {
    id: 'housewife',
    name: 'แม่บ้าน',
    emoji: '🏠',
    desc: 'งานบ้าน ลูก ช้อปปิ้ง ครอบครัว',
    wake: '05:30',
    slots: [
      { startTime: '05:30', endTime: '06:30', groupKey: 'กิจวัตร' },
      { startTime: '06:30', endTime: '08:00', groupKey: 'งานบ้าน' },
      { startTime: '08:00', endTime: '11:00', groupKey: 'งานบ้าน' },
      { startTime: '11:00', endTime: '12:00', groupKey: 'ธุระส่วนตัว' },
      { startTime: '12:00', endTime: '13:00', groupKey: 'พักผ่อน' },
      { startTime: '13:00', endTime: '15:00', groupKey: 'งานบ้าน' },
      { startTime: '15:00', endTime: '17:00', groupKey: 'ครอบครัว' },
      { startTime: '17:00', endTime: '19:00', groupKey: 'งานบ้าน' },
      { startTime: '19:00', endTime: '21:00', groupKey: 'ครอบครัว' },
      { startTime: '21:00', endTime: '22:00', groupKey: 'พัฒนาตัวเอง' },
    ],
  },
  {
    id: 'retiree',
    name: 'คนเกษียณ',
    emoji: '🌅',
    desc: 'กิจวัตรผ่อนคลาย ออกกำลัง งานอดิเรก',
    wake: '05:30',
    slots: [
      { startTime: '05:30', endTime: '06:30', groupKey: 'กิจวัตร' },
      { startTime: '06:30', endTime: '07:30', groupKey: 'ออกกำลังกาย' },
      { startTime: '07:30', endTime: '09:00', groupKey: 'กิจวัตร' },
      { startTime: '09:00', endTime: '11:00', groupKey: 'พัฒนาตัวเอง' },
      { startTime: '11:00', endTime: '12:00', groupKey: 'ธุระส่วนตัว' },
      { startTime: '12:00', endTime: '13:00', groupKey: 'พักผ่อน' },
      { startTime: '13:00', endTime: '15:00', groupKey: 'พักผ่อน' },
      { startTime: '15:00', endTime: '17:00', groupKey: 'เข้าสังคม' },
      { startTime: '17:00', endTime: '18:30', groupKey: 'กิจวัตร' },
      { startTime: '18:30', endTime: '20:00', groupKey: 'ครอบครัว' },
      { startTime: '20:00', endTime: '21:30', groupKey: 'สงบใจ' },
    ],
  },
  {
    id: 'student',
    name: 'นักศึกษา',
    emoji: '🎓',
    desc: 'เรียน อ่านหนังสือ สังคม',
    wake: '07:00',
    slots: [
      { startTime: '07:00', endTime: '08:00', groupKey: 'กิจวัตร' },
      { startTime: '08:00', endTime: '12:00', groupKey: 'งานหลัก' },
      { startTime: '12:00', endTime: '13:00', groupKey: 'พักผ่อน' },
      { startTime: '13:00', endTime: '17:00', groupKey: 'งานหลัก' },
      { startTime: '17:00', endTime: '18:00', groupKey: 'ออกกำลังกาย' },
      { startTime: '18:00', endTime: '19:00', groupKey: 'กิจวัตร' },
      { startTime: '19:00', endTime: '22:00', groupKey: 'พัฒนาตัวเอง' },
      { startTime: '22:00', endTime: '23:00', groupKey: 'เข้าสังคม' },
    ],
  },
  {
    id: 'entrepreneur',
    name: 'เจ้าของกิจการ',
    emoji: '🚀',
    desc: 'ประชุม วางแผน networking',
    wake: '05:30',
    slots: [
      { startTime: '05:30', endTime: '06:30', groupKey: 'กิจวัตร' },
      { startTime: '06:30', endTime: '07:30', groupKey: 'ออกกำลังกาย' },
      { startTime: '07:30', endTime: '08:30', groupKey: 'กิจวัตร' },
      { startTime: '08:30', endTime: '10:00', groupKey: 'พัฒนาตัวเอง' },
      { startTime: '10:00', endTime: '12:00', groupKey: 'งานหลัก' },
      { startTime: '12:00', endTime: '13:00', groupKey: 'เข้าสังคม' },
      { startTime: '13:00', endTime: '17:00', groupKey: 'งานหลัก' },
      { startTime: '17:00', endTime: '19:00', groupKey: 'เข้าสังคม' },
      { startTime: '19:00', endTime: '20:00', groupKey: 'กิจวัตร' },
      { startTime: '20:00', endTime: '21:30', groupKey: 'ครอบครัว' },
      { startTime: '21:30', endTime: '22:30', groupKey: 'สงบใจ' },
    ],
  },
];

export function getLifestyleTemplate(id?: string): LifestyleTemplate | undefined {
  return LIFESTYLE_TEMPLATES.find(t => t.id === id);
}
