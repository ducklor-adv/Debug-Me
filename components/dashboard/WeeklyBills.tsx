import React from 'react';
import { Expense, EXPENSE_CATEGORIES } from '../../types';
import { Wallet, ChevronUp, ChevronDown } from 'lucide-react';

interface WeeklyBillsProps {
  expenses: Expense[];
  isOpen: boolean;
  onToggle: () => void;
}

/** Get expenses due this week */
function getWeeklyBills(expenses: Expense[]) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  const wStart = toStr(startOfWeek);
  const wEnd = toStr(endOfWeek);

  const bills = expenses.filter(exp => {
    if (exp.flow !== 'expense') return false;
    if (exp.paid) return false;
    if (exp.type === 'one-time') return exp.date >= wStart && exp.date <= wEnd;
    if (exp.type === 'recurring' && exp.dueDay) {
      const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      if (exp.paidHistory?.[thisMonth]) return false;
      const dueDate = new Date(today.getFullYear(), today.getMonth(), exp.dueDay);
      return toStr(dueDate) >= wStart && toStr(dueDate) <= wEnd;
    }
    return false;
  });

  return { bills, total: bills.reduce((sum, e) => sum + e.amount, 0), wStart, wEnd };
}

/** Weekly bills button + expandable list for Dashboard */
const WeeklyBills: React.FC<WeeklyBillsProps> = ({ expenses, isOpen, onToggle }) => {
  const { bills, total, wStart, wEnd } = getWeeklyBills(expenses);

  return (
    <>
      {/* Button */}
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all active:scale-95 shadow-sm min-w-[210px] justify-center ${
          bills.length > 0
            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
            : 'bg-yellow-600/60 text-white/80 hover:bg-yellow-500'
        }`}
      >
        <Wallet className="w-4 h-4" />
        <span className="text-xs font-bold">
          {bills.length > 0 ? `รายจ่าย ฿${total.toLocaleString()}` : 'ไม่มีรายจ่าย'}
        </span>
        {bills.length > 0 && <span className="text-[10px] font-black bg-white/25 px-1.5 py-0.5 rounded-full">{bills.length}</span>}
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded List */}
      {isOpen && bills.length > 0 && (
        <div className="mb-3 bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black text-rose-700">ต้องจ่ายสัปดาห์นี้</p>
              <p className="text-[9px] text-rose-400">{wStart} — {wEnd}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-black text-rose-600">฿{total.toLocaleString()}</p>
              <p className="text-[9px] text-rose-400">{bills.length} รายการ</p>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {bills.map(bill => {
              const cat = EXPENSE_CATEGORIES.find(c => c.key === bill.category);
              return (
                <div key={bill.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50">
                  <span className="text-base">{cat?.emoji || '💸'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{bill.title}</p>
                    <p className="text-[9px] text-slate-400">
                      {bill.type === 'recurring' ? `ทุกเดือน วันที่ ${bill.dueDay}` : bill.date}
                    </p>
                  </div>
                  <span className="text-xs font-black text-rose-600 shrink-0">฿{bill.amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isOpen && bills.length === 0 && (
        <div className="mb-3 bg-white/10 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-white/60">ไม่มีรายการที่ต้องจ่ายสัปดาห์นี้ 🎉</p>
        </div>
      )}
    </>
  );
};

export default WeeklyBills;
