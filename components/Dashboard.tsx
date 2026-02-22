import React, { useState } from 'react';
import { Task, Habit } from '../types';
import { CheckCircle2, Circle, Trophy, Zap, Flame, CheckCircle, Clock, Camera, Mic, Video, Phone, User as UserIcon, MapPin, Edit3, X, ChevronRight } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  habits: Habit[];
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, habits }) => {
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [showEditView, setShowEditView] = useState(false);

  const completedTasksCount = tasks.filter(t => t.completed).length;
  const activeHabits = habits.filter(h => h.completedToday).length;

  const currentUrgentTask = tasks.find(t => !t.completed && t.priority === 'High');
  const remainingTasks = tasks.filter(t => !t.completed && t !== currentUrgentTask);

  const handleMarkAsDoneClick = () => {
    setShowDoneModal(true);
  };

  const handleConfirmDone = () => {
    setShowDoneModal(false);
  };

  const handleSaveDetails = () => {
    setShowDoneModal(false);
    setShowEditView(true);
  };

  const priorityStyle = (p: string) => {
    if (p === 'High') return 'bg-rose-100 text-rose-600 border-rose-200';
    if (p === 'Medium') return 'bg-amber-100 text-amber-600 border-amber-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  return (
    <div className="animate-fadeIn w-full min-h-full bg-emerald-50">

      {/* MODALS */}
      {showDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-emerald-100 transform animate-fadeIn">
            <h3 className="text-xl font-bold text-slate-800 mb-2">ข้อมูลเพิ่มเติม?</h3>
            <p className="text-sm text-slate-500 mb-6">คุณมีข้อมูลรายละเอียด, รูปภาพ, วิดีโอ หรือเสียงที่ต้องการบันทึกก่อนจะปิดกิจกรรมนี้ไหมครับ?</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleSaveDetails} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-emerald-300">
                มี, ต้องการบันทึกข้อมูล
              </button>
              <button onClick={handleConfirmDone} className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-semibold text-sm transition-colors">
                ไม่มี, ปิดกิจกรรมเลย
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-auto animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Edit3 className="w-5 h-5 text-emerald-500" /> Edit & Attach Details</h3>
              <button onClick={() => setShowEditView(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 block">Notes / รายละเอียดเพิ่มเติม</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 h-28 resize-none shadow-inner" placeholder="พิมพ์รายละเอียดที่เจอมา..."></textarea>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Quick Attachments / เครื่องมือด่วน</label>
                <div className="grid grid-cols-3 gap-3">
                  <button className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-600 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Camera className="w-6 h-6" /> <span className="text-[10px] font-bold">ถ่ายรูป</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Mic className="w-6 h-6" /> <span className="text-[10px] font-bold">อัดเสียง</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-600 hover:text-emerald-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Video className="w-6 h-6" /> <span className="text-[10px] font-bold">วิดีโอ</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 text-slate-600 hover:text-sky-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Phone className="w-6 h-6" /> <span className="text-[10px] font-bold">เบอร์โทร</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 text-slate-600 hover:text-violet-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <UserIcon className="w-6 h-6" /> <span className="text-[10px] font-bold">ผู้ติดต่อ</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-slate-600 hover:text-amber-600 rounded-xl border border-emerald-100 transition-all active:scale-95 shadow-sm">
                    <MapPin className="w-6 h-6" /> <span className="text-[10px] font-bold">พิกัด GPS</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowEditView(false)} className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-sm rounded-xl transition-colors">ย้อนกลับ</button>
              <button onClick={() => { setShowEditView(false); }} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-300 transition-colors">
                บันทึกข้อมูล & สำเร็จ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NOW: Current Task ===== */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-500 p-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-300" />
            <span className="text-xs font-bold tracking-widest uppercase text-emerald-100">ตอนนี้ทำอะไร</span>
          </div>

          {currentUrgentTask ? (
            <div className="bg-white rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  NOW
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-600">
                  <span>60:00</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-amber-500">45:30</span>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{currentUrgentTask.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">{currentUrgentTask.description}</p>

              <div className="flex gap-3">
                <button onClick={handleSaveDetails} className="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-95">
                  <Edit3 className="w-4 h-4" /> แก้ไข
                </button>
                <button onClick={handleMarkAsDoneClick} className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-300">
                  <CheckCircle className="w-5 h-5" /> เสร็จแล้ว
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">เก่งมาก!</h3>
              <p className="text-sm text-slate-500">ทำงาน priority สูงเสร็จหมดแล้ว</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== Stats ===== */}
      <div className="px-4 -mt-4 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800">{completedTasksCount}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tasks Done</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800">{activeHabits}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Habits Kept</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Next Up + Remaining ===== */}
      <div className="px-4 pt-6 pb-16 max-w-lg mx-auto space-y-4">

        {/* Next Up - ตัวใหญ่ */}
        {remainingTasks.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-500 mb-3">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Next Up</span>
            </div>
            <h4 className="text-lg font-bold text-slate-800 leading-tight mb-2">{remainingTasks[0].title}</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Circle className="w-3 h-3" /> {remainingTasks[0].category}</span>
              <div className="flex items-center gap-2">
                {remainingTasks[0].dueDate && <span className="text-xs text-slate-400">{remainingTasks[0].dueDate}</span>}
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${priorityStyle(remainingTasks[0].priority)}`}>{remainingTasks[0].priority}</span>
              </div>
            </div>
          </div>
        )}

        {/* ที่เหลือ - ตัวเล็กๆ */}
        {remainingTasks.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 divide-y divide-emerald-100">
            <div className="px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">อีก {remainingTasks.length - 1} รายการ</span>
            </div>
            {remainingTasks.slice(1).map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.priority === 'High' ? 'bg-rose-400' : task.priority === 'Medium' ? 'bg-amber-400' : 'bg-slate-300'}`}></div>
                <span className="text-sm text-slate-700 font-medium truncate flex-1">{task.title}</span>
                <span className="text-[11px] text-slate-400 shrink-0">{task.dueDate || ''}</span>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
};

export default Dashboard;
