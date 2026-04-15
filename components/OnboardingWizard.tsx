import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Sun, Moon, CheckSquare, BookOpen, Wallet, PenLine, FolderKanban } from 'lucide-react';
import TimePicker from './TimePicker';
import { LIFESTYLE_TEMPLATES } from '../data/lifestyleTemplates';

interface OnboardingResult {
  lifestyleTemplateId: string;
  wakeTime: string;
  minSleep: number;
  enabledModules: string[];
}

interface OnboardingWizardProps {
  onComplete: (result: OnboardingResult) => void;
}

const OCCUPATIONS = LIFESTYLE_TEMPLATES.map(t => ({
  key: t.id,
  label: t.name,
  emoji: t.emoji,
  desc: t.desc,
  wake: t.wake,
}));

const MODULES = [
  { key: 'planner', label: 'Planner', desc: 'วางตารางวัน', icon: BookOpen, default: true },
  { key: 'tasks', label: 'Tasks', desc: 'จัดการงานที่ต้องทำ', icon: CheckSquare, default: true },
  { key: 'expenses', label: 'Expenses', desc: 'รายรับ-รายจ่าย', icon: Wallet, default: false },
  { key: 'diary', label: 'Diary', desc: 'ไดอารี่ บันทึกประจำวัน', icon: PenLine, default: false },
  { key: 'projects', label: 'Projects', desc: 'จัดการโปรเจกต์', icon: FolderKanban, default: false },
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [occupation, setOccupation] = useState('');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [minSleep, setMinSleep] = useState(7);
  const [enabledModules, setEnabledModules] = useState<Set<string>>(
    new Set(MODULES.filter(m => m.default).map(m => m.key))
  );

  const toggleModule = (key: string) => {
    setEnabledModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleComplete = () => {
    onComplete({
      lifestyleTemplateId: occupation,
      wakeTime,
      minSleep,
      enabledModules: Array.from(enabledModules),
    });
  };

  // Auto-set wake time based on lifestyle choice
  const handlePickOccupation = (occ: { key: string; wake: string }) => {
    setOccupation(occ.key);
    setWakeTime(occ.wake);
  };

  const canNext = step === 0 || step === 4 || (step === 1 && occupation) || step === 2 || (step === 3 && enabledModules.size > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-emerald-100/50 border border-emerald-100 w-full max-w-md overflow-hidden">

        {/* Progress bar */}
        <div className="flex gap-1 p-3">
          {[0,1,2,3,4].map(i => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-emerald-500' : 'bg-slate-100'}`} />
          ))}
        </div>

        <div className="px-6 pb-6 pt-2">

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6 py-8">
              <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-lg">
                <img src="/logo.png" alt="Debug-Me" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">Debug-Me</h1>
                <p className="text-sm text-slate-500 mt-2">ระบบจัดการชีวิต ที่ช่วยคุณ<br/>วางแผน ติดตาม และปรับปรุงทุกวัน</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold">มาเริ่มตั้งค่ากันเลย</span>
              </div>
            </div>
          )}

          {/* Step 1: Occupation */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <h2 className="text-lg font-black text-slate-800">เลือกสไตล์ชีวิตของคุณ</h2>
                <p className="text-xs text-slate-400 mt-1">เราจะสร้างตารางเริ่มต้นให้เหมาะกับคุณ</p>
              </div>
              <div className="space-y-2">
                {OCCUPATIONS.map(occ => (
                  <button
                    key={occ.key}
                    onClick={() => handlePickOccupation(occ)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                      occupation === occ.key
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-2xl">{occ.emoji}</span>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${occupation === occ.key ? 'text-emerald-700' : 'text-slate-700'}`}>{occ.label}</p>
                      <p className="text-[10px] text-slate-400">{occ.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Wake time + min sleep hours */}
          {step === 2 && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h2 className="text-lg font-black text-slate-800">เวลาตื่น และเวลานอนขั้นต่ำ</h2>
                <p className="text-xs text-slate-400 mt-1">ใช้คำนวณตารางวันถัดไปแบบต่อเนื่อง</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <Sun className="w-8 h-8 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-amber-700 mb-1">ปกติตื่นกี่โมง?</p>
                    <TimePicker value={wakeTime} onChange={setWakeTime} />
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  <Moon className="w-8 h-8 text-indigo-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-indigo-700 mb-1">ต้องการนอนขั้นต่ำ (ชั่วโมง)</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMinSleep(Math.max(4, minSleep - 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-indigo-200 text-indigo-600 font-bold"
                      >−</button>
                      <input
                        type="number"
                        min={4}
                        max={12}
                        value={minSleep}
                        onChange={(e) => setMinSleep(Math.max(4, Math.min(12, parseInt(e.target.value) || 7)))}
                        className="w-16 text-center text-lg font-black text-indigo-700 bg-white border border-indigo-200 rounded-lg py-1"
                      />
                      <button
                        onClick={() => setMinSleep(Math.min(12, minSleep + 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-indigo-200 text-indigo-600 font-bold"
                      >+</button>
                      <span className="text-xs text-indigo-500 font-bold">ชม.</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400">
                  ตื่น {wakeTime} — นอนขั้นต่ำ {minSleep} ชม. ({24 - minSleep} ชั่วโมงต่อวันใช้ได้)
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Modules */}
          {step === 3 && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <h2 className="text-lg font-black text-slate-800">เลือกฟีเจอร์ที่สนใจ</h2>
                <p className="text-xs text-slate-400 mt-1">เปิด/ปิดทีหลังได้ใน Settings</p>
              </div>
              <div className="space-y-2">
                {MODULES.map(mod => {
                  const Icon = mod.icon;
                  const enabled = enabledModules.has(mod.key);
                  return (
                    <button
                      key={mod.key}
                      onClick={() => toggleModule(mod.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                        enabled
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left flex-1">
                        <p className={`text-sm font-bold ${enabled ? 'text-emerald-700' : 'text-slate-700'}`}>{mod.label}</p>
                        <p className="text-[10px] text-slate-400">{mod.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${enabled ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                        {enabled && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-6 py-8">
              <div className="text-6xl">🎉</div>
              <div>
                <h2 className="text-xl font-black text-slate-800">พร้อมแล้ว!</h2>
                <p className="text-sm text-slate-500 mt-2">เริ่มวางแผนวันแรกกันเลย</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-left space-y-1">
                <p className="text-[10px] text-emerald-600 font-bold">สรุปการตั้งค่า:</p>
                <p className="text-xs text-slate-600">สไตล์ชีวิต: {OCCUPATIONS.find(o => o.key === occupation)?.emoji} {OCCUPATIONS.find(o => o.key === occupation)?.label}</p>
                <p className="text-xs text-slate-600">ตื่น {wakeTime} — นอนขั้นต่ำ {minSleep} ชม.</p>
                <p className="text-xs text-slate-600">เปิดใช้: {Array.from(enabledModules).map(k => MODULES.find(m => m.key === k)?.label).join(', ')}</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
              </button>
            )}
            <button
              onClick={() => step === 4 ? handleComplete() : setStep(step + 1)}
              disabled={!canNext}
              className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-40"
            >
              {step === 4 ? 'เริ่มใช้งาน' : step === 0 ? 'เริ่มเลย' : 'ถัดไป'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
