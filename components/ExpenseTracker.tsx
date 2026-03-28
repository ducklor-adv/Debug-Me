import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Expense, ExpenseCategoryKey, EXPENSE_CATEGORIES, EXPENSE_GROUPS, GROUP_COLORS, PaymentMethod, PAYMENT_METHODS, ExpenseCategory } from '../types';
import { Plus, X, Trash2, CheckCircle2, Circle, RefreshCw, ChevronDown, DollarSign, TrendingUp, TrendingDown, Wallet, Edit3, ArrowUpCircle, ArrowDownCircle, Minus } from 'lucide-react';

interface ExpenseTrackerProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

const defaultCatMap = new Map(EXPENSE_CATEGORIES.map(c => [c.key, c]));
const todayStr = () => new Date().toISOString().split('T')[0];

function fmt(n: number): string {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function toMonthly(e: Expense): number {
  if (e.recurrence === 'yearly') return e.amount / 12;
  if (e.recurrence === 'quarterly') return e.amount / 3;
  if (e.recurrence === 'weekly') return e.amount * 4.33;
  if (e.recurrence === 'daily') return e.amount * 30;
  return e.amount;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ expenses, setExpenses }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [section, setSection] = useState<'statement' | 'list'>('statement');
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [drillCat, setDrillCat] = useState<string | null>(null); // category key to drill into

  // Custom categories (user can add/remove)
  const [customCats, setCustomCats] = useState<ExpenseCategory[]>(() => {
    const saved = localStorage.getItem('debugme-custom-cats');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddCat, setShowAddCat] = useState<string | null>(null); // group key to add to
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📌');

  const saveCustomCats = (cats: ExpenseCategory[]) => {
    setCustomCats(cats);
    localStorage.setItem('debugme-custom-cats', JSON.stringify(cats));
  };

  const addCustomCat = (group: string, flow: 'income' | 'expense') => {
    if (!newCatLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    saveCustomCats([...customCats, { key, label: newCatLabel.trim(), emoji: newCatEmoji, color: 'purple', flow, group, isCustom: true }]);
    setNewCatLabel('');
    setNewCatEmoji('📌');
    setShowAddCat(null);
  };

  const removeCustomCat = (key: string) => {
    saveCustomCats(customCats.filter(c => c.key !== key));
  };

  // Merged categories
  const allCats = [...EXPENSE_CATEGORIES, ...customCats];
  const catMap = new Map(allCats.map(c => [c.key, c]));
  const incomeCats = allCats.filter(c => c.flow === 'income');
  const expenseCats = allCats.filter(c => c.flow === 'expense');
  const [listFlow, setListFlow] = useState<'income' | 'expense'>('expense');
  const [listType, setListType] = useState<'recurring' | 'one-time'>('recurring');
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Form
  const [form, setForm] = useState({
    title: '',
    amount: '',
    flow: 'expense' as 'income' | 'expense',
    category: 'food' as ExpenseCategoryKey,
    type: 'one-time' as 'recurring' | 'one-time',
    date: todayStr(),
    recurrence: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    dueDay: 1,
    notes: '',
    method: 'transfer' as PaymentMethod,
    borrowFrom: '',
    borrowRepayDate: '',
    borrowRepayAmount: '',
  });

  // Borrow contacts (default + custom)
  const [borrowContacts, setBorrowContacts] = useState<string[]>(() => {
    const saved = localStorage.getItem('debugme-borrow-contacts');
    return saved ? JSON.parse(saved) : ['พ่อ', 'แม่', 'แฟน'];
  });
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState('');

  const addBorrowContact = () => {
    if (!newContact.trim() || borrowContacts.includes(newContact.trim())) return;
    const updated = [...borrowContacts, newContact.trim()];
    setBorrowContacts(updated);
    localStorage.setItem('debugme-borrow-contacts', JSON.stringify(updated));
    setForm({ ...form, borrowFrom: newContact.trim() });
    setNewContact('');
    setShowAddContact(false);
  };

  const resetForm = () => {
    setForm({ title: '', amount: '', flow: 'expense', category: 'food', type: 'recurring', date: todayStr(), recurrence: 'monthly', dueDay: 1, notes: '', method: 'transfer', borrowFrom: '', borrowRepayDate: '', borrowRepayAmount: '' });
    setShowAddContact(false);
    setEditingId(null);
    setShowForm(false);
    setLockedCat(null);
  };

  const openAdd = (flow: 'income' | 'expense') => {
    setActiveExpTab(EXPENSE_GROUPS[0].key);
    setForm({ title: '', amount: '', flow, category: '', type: 'one-time', date: todayStr(), recurrence: 'monthly', dueDay: 1, notes: '', method: 'transfer', borrowFrom: '', borrowRepayDate: '', borrowRepayAmount: '' });
    setEditingId(null);
    setShowForm(true);
  };

  // Track which tab is active (for when no category selected yet)
  const [activeExpTab, setActiveExpTab] = useState<string>(EXPENSE_GROUPS[0].key);

  const openAddDebt = () => {
    setActiveExpTab('ชำระหนี้');
    setForm({ title: '', amount: '', flow: 'expense', category: '', type: 'recurring', date: todayStr(), recurrence: 'monthly', dueDay: 1, notes: '', method: 'transfer', borrowFrom: '', borrowRepayDate: '', borrowRepayAmount: '' });
    setEditingId(null);
    setShowForm(true);
  };

  // Open add form with pre-selected category (from drill-down) — locks to that category
  const [lockedCat, setLockedCat] = useState<string | null>(null);

  const openAddWithCat = (catKey: string) => {
    const cat = catMap.get(catKey);
    const flow = cat?.flow || 'expense';
    setLockedCat(catKey);
    setForm({ title: '', amount: '', flow, category: catKey, type: 'one-time', date: todayStr(), recurrence: 'monthly', dueDay: 1, notes: '', method: 'transfer', borrowFrom: '', borrowRepayDate: '', borrowRepayAmount: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (exp: Expense) => {
    setForm({
      title: exp.title,
      amount: String(exp.amount),
      flow: exp.flow || 'expense',
      category: exp.category,
      type: exp.type,
      date: exp.date,
      recurrence: exp.recurrence || 'monthly',
      dueDay: exp.dueDay || 1,
      notes: exp.notes || '',
      method: exp.paymentMethod || 'transfer',
      borrowFrom: exp.borrowFrom || '',
      borrowRepayDate: exp.borrowRepayDate || '',
      borrowRepayAmount: exp.borrowRepayAmount ? String(exp.borrowRepayAmount) : '',
    });
    setEditingId(exp.id);
    setShowForm(true);
  };

  const saveExpense = () => {
    const amount = parseFloat(form.amount);
    if (!form.title.trim() || isNaN(amount) || amount <= 0) return;

    if (editingId) {
      setExpenses(prev => prev.map(e => e.id === editingId ? {
        ...e,
        title: form.title.trim(), amount, flow: form.flow,
        category: form.category, type: form.type, date: form.date,
        recurrence: form.type === 'recurring' ? form.recurrence : undefined,
        dueDay: form.type === 'recurring' ? form.dueDay : undefined,
        notes: form.notes.trim() || undefined,
        paymentMethod: form.method,
        borrowFrom: form.method === 'borrow' ? form.borrowFrom || undefined : undefined,
        borrowRepayDate: form.method === 'borrow' && form.borrowRepayDate ? form.borrowRepayDate : undefined,
        borrowRepayAmount: form.method === 'borrow' && form.borrowRepayAmount ? parseFloat(form.borrowRepayAmount) : undefined,
        borrowRepaid: form.method === 'borrow' ? false : undefined,
      } : e));
    } else {
      setExpenses(prev => [{
        id: `exp-${Date.now()}`,
        title: form.title.trim(), amount, flow: form.flow,
        category: form.category, type: form.type, date: form.date,
        recurrence: form.type === 'recurring' ? form.recurrence : undefined,
        dueDay: form.type === 'recurring' ? form.dueDay : undefined,
        notes: form.notes.trim() || undefined,
        paymentMethod: form.method,
        borrowFrom: form.method === 'borrow' ? form.borrowFrom || undefined : undefined,
        borrowRepayDate: form.method === 'borrow' && form.borrowRepayDate ? form.borrowRepayDate : undefined,
        borrowRepayAmount: form.method === 'borrow' && form.borrowRepayAmount ? parseFloat(form.borrowRepayAmount) : undefined,
        borrowRepaid: form.method === 'borrow' ? false : undefined,
        paid: false, createdAt: new Date().toISOString(),
      }, ...prev]);
    }
    resetForm();
  };

  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  // Pay modal for recurring items
  const [payModal, setPayModal] = useState<{ id: string; amount: string; method: PaymentMethod } | null>(null);

  const handlePayClick = (exp: Expense) => {
    if (exp.type === 'recurring') {
      // Check if already paid this month
      const monthKey = viewMonth;
      const alreadyPaid = exp.paidHistory?.[monthKey];
      if (alreadyPaid) {
        // Unpay this month
        setExpenses(prev => prev.map(e => {
          if (e.id !== exp.id) return e;
          const newHistory = { ...(e.paidHistory || {}) };
          delete newHistory[monthKey];
          return { ...e, paidHistory: Object.keys(newHistory).length > 0 ? newHistory : undefined };
        }));
      } else {
        // Open pay modal with estimated amount pre-filled
        setPayModal({ id: exp.id, amount: String(exp.amount), method: exp.paymentMethod || 'transfer' });
      }
    } else {
      // One-time: simple toggle
      setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, paid: !e.paid, paidAt: !e.paid ? new Date().toISOString() : undefined } : e));
    }
  };

  const confirmPay = () => {
    if (!payModal) return;
    const actualAmount = parseFloat(payModal.amount);
    if (isNaN(actualAmount) || actualAmount <= 0) return;
    const monthKey = viewMonth;
    setExpenses(prev => prev.map(e => {
      if (e.id !== payModal.id) return e;
      return {
        ...e,
        paidHistory: {
          ...(e.paidHistory || {}),
          [monthKey]: { amount: actualAmount, paidAt: new Date().toISOString(), method: payModal.method },
        },
      };
    }));
    setPayModal(null);
  };

  // Helper: is recurring item paid this month?
  const isRecurringPaid = (exp: Expense) => exp.type === 'recurring' && exp.paidHistory?.[viewMonth];
  const getActualAmount = (exp: Expense) => exp.paidHistory?.[viewMonth]?.amount;

  // Month nav
  const changeMonth = (delta: number) => {
    const [y, m] = viewMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const monthLabel = (() => {
    const [y, m] = viewMonth.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  })();

  // ===== Financial Statement =====
  const statement = useMemo(() => {
    const recurringIncome = expenses.filter(e => (e.flow || 'expense') === 'income' && e.type === 'recurring');
    const recurringExpense = expenses.filter(e => (e.flow || 'expense') === 'expense' && e.type === 'recurring');
    const oneTimeIncome = expenses.filter(e => (e.flow || 'expense') === 'income' && e.type === 'one-time' && e.date.startsWith(viewMonth));
    const oneTimeExpense = expenses.filter(e => (e.flow || 'expense') === 'expense' && e.type === 'one-time' && e.date.startsWith(viewMonth));

    // Use actual paid amount if available for this month, otherwise use estimated
    const monthlyAmount = (e: Expense) => e.paidHistory?.[viewMonth]?.amount ?? toMonthly(e);
    const recIncTotal = recurringIncome.reduce((s, e) => s + monthlyAmount(e), 0);
    const recExpTotal = recurringExpense.reduce((s, e) => s + monthlyAmount(e), 0);
    const otIncTotal = oneTimeIncome.reduce((s, e) => s + e.amount, 0);
    const otExpTotal = oneTimeExpense.reduce((s, e) => s + e.amount, 0);

    const totalIncome = recIncTotal + otIncTotal;
    const totalExpense = recExpTotal + otExpTotal;
    const net = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0;

    // Category breakdown for expenses
    const expByCat = new Map<ExpenseCategoryKey, number>();
    recurringExpense.forEach(e => expByCat.set(e.category, (expByCat.get(e.category) || 0) + toMonthly(e)));
    oneTimeExpense.forEach(e => expByCat.set(e.category, (expByCat.get(e.category) || 0) + e.amount));
    const expCategories = Array.from(expByCat.entries())
      .map(([key, amount]) => ({ cat: catMap.get(key)!, amount }))
      .filter(c => c.cat)
      .sort((a, b) => b.amount - a.amount);

    // Category breakdown for income
    const incByCat = new Map<ExpenseCategoryKey, number>();
    recurringIncome.forEach(e => incByCat.set(e.category, (incByCat.get(e.category) || 0) + toMonthly(e)));
    oneTimeIncome.forEach(e => incByCat.set(e.category, (incByCat.get(e.category) || 0) + e.amount));
    const incCategories = Array.from(incByCat.entries())
      .map(([key, amount]) => ({ cat: catMap.get(key)!, amount }))
      .filter(c => c.cat)
      .sort((a, b) => b.amount - a.amount);

    return {
      recIncTotal, recExpTotal, otIncTotal, otExpTotal,
      totalIncome, totalExpense, net, savingRate,
      expCategories, incCategories,
      recurringIncome, recurringExpense, oneTimeIncome, oneTimeExpense,
    };
  }, [expenses, viewMonth]);

  // List view
  const listItems = useMemo(() => {
    let list = expenses.filter(e => (e.flow || 'expense') === listFlow && e.type === listType);
    if (listType === 'one-time') {
      list = list.filter(e => e.date.startsWith(viewMonth));
      list.sort((a, b) => b.date.localeCompare(a.date));
    } else {
      list.sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));
    }
    return list;
  }, [expenses, listFlow, listType, viewMonth]);

  // Render line item — single row: checkbox | date | name | category | amount | actions
  const renderItem = (exp: Expense) => {
    const cat = catMap.get(exp.category);
    const isIncome = (exp.flow || 'expense') === 'income';
    const clr = GROUP_COLORS[cat?.color || 'orange'] || GROUP_COLORS.orange;
    const paidThisMonth = isRecurringPaid(exp);
    const actualAmt = getActualAmount(exp);
    const isPaid = exp.type === 'recurring' ? !!paidThisMonth : !!exp.paid;
    const displayAmt = paidThisMonth && actualAmt !== undefined ? actualAmt : exp.amount;
    const dateLabel = exp.type === 'recurring'
      ? (exp.recurrence === 'monthly' || exp.recurrence === 'quarterly' ? `${exp.dueDay}` : exp.recurrence === 'yearly' ? 'ปี' : exp.recurrence === 'weekly' ? '7d' : 'วัน')
      : new Date(exp.date).getDate().toString();

    return (
      <div key={exp.id} className={`flex items-center gap-2 px-3 py-2 ${isPaid ? 'opacity-60' : ''}`}>
        <button onClick={() => handlePayClick(exp)} className="shrink-0 active:scale-90">
          {isPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-amber-400" />}
        </button>
        <span className="text-[10px] font-mono text-slate-400 w-6 text-center shrink-0">{dateLabel}</span>
        <span className={`text-[12px] font-bold truncate flex-1 min-w-0 ${isPaid ? 'line-through text-slate-400' : 'text-slate-700'}`}>{exp.title}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${clr.badge}`}>{cat?.emoji} {cat?.label}</span>
        {exp.paymentMethod === 'borrow' && (
          <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full shrink-0 ${exp.borrowRepaid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            🤲{exp.borrowFrom ? ` ${exp.borrowFrom}` : ''}
          </span>
        )}
        <span className={`text-[12px] font-black tabular-nums shrink-0 w-[70px] text-right ${isIncome ? 'text-emerald-600' : 'text-slate-700'}`}>
          {isIncome ? '+' : '-'}{fmt(displayAmt)}
        </span>
        <button onClick={() => openEdit(exp)} className="p-0.5 hover:bg-slate-100 rounded text-slate-300 hover:text-blue-500 shrink-0"><Edit3 className="w-3 h-3" /></button>
        <button onClick={() => deleteExpense(exp.id)} className="p-0.5 hover:bg-rose-50 rounded text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-3 h-3" /></button>
      </div>
    );
  };

  const formCats = form.flow === 'income' ? incomeCats : expenseCats;

  return (
    <div className="space-y-3 animate-fadeIn pb-20">
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-2">
        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 active:scale-90"><ChevronDown className="w-4 h-4 rotate-90" /></button>
        <span className="text-sm font-black text-slate-700">{monthLabel}</span>
        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 active:scale-90"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
      </div>


      {/* Tab: Statement vs List */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setSection('statement')} className={`flex-1 py-2.5 text-sm font-bold transition-all relative ${section === 'statement' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-500'}`}>
          งบการเงิน
          {section === 'statement' && <div className="absolute bottom-0 left-4 right-4 h-[3px] bg-slate-800 rounded-full" />}
        </button>
        <button onClick={() => setSection('list')} className={`flex-1 py-2.5 text-sm font-bold transition-all relative ${section === 'list' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-500'}`}>
          รายการ
          {section === 'list' && <div className="absolute bottom-0 left-4 right-4 h-[3px] bg-slate-800 rounded-full" />}
        </button>
      </div>

      {section === 'statement' ? (() => {
        // Helper: get budget & actual for a category
        const getBudgetActual = (catKey: ExpenseCategoryKey, flow: 'income' | 'expense') => {
          const items = expenses.filter(e => (e.flow || 'expense') === flow && e.category === catKey);
          const budget = items.filter(e => e.type === 'recurring').reduce((s, e) => s + toMonthly(e), 0);
          const actual = items.reduce((s, e) => {
            if (e.type === 'recurring') return s + (e.paidHistory?.[viewMonth]?.amount ?? 0);
            if (e.type === 'one-time' && e.date.startsWith(viewMonth)) return s + e.amount;
            return s;
          }, 0);
          return { budget, actual, diff: actual - budget };
        };

        // Aggregate by list of categories
        const sumCats = (cats: ExpenseCategoryKey[], flow: 'income' | 'expense') => {
          let b = 0, a = 0;
          cats.forEach(k => { const r = getBudgetActual(k, flow); b += r.budget; a += r.actual; });
          return { budget: b, actual: a, diff: a - b };
        };

        // Line row
        const Row = ({ label, budget, actual, diff, bold, indent, catKey }: { label: string; budget: number; actual: number; diff: number; bold?: boolean; indent?: boolean; catKey?: string }) => (
          <div className={`flex items-center ${indent ? 'pl-4' : ''} ${bold ? 'font-black' : ''} ${catKey ? 'cursor-pointer hover:bg-slate-50 -mx-1 px-1 rounded transition-colors' : ''}`} onClick={catKey ? () => setDrillCat(catKey) : undefined}>
            <span className={`flex-1 ${bold ? 'text-xs text-slate-800' : 'text-[11px] text-slate-600'} truncate`}>{label}{catKey ? <ChevronDown className="w-3 h-3 -rotate-90 inline ml-1 text-slate-300" /> : null}</span>
            <span className={`w-[72px] text-[11px] ${bold ? 'font-black text-slate-700' : 'text-slate-500'} text-right tabular-nums`}>{budget ? fmt(Math.round(budget)) : '-'}</span>
            <span className={`w-[72px] text-[11px] ${bold ? 'font-black text-slate-800' : 'font-bold text-slate-700'} text-right tabular-nums`}>{actual ? fmt(Math.round(actual)) : '-'}</span>
            <span className={`w-[56px] text-[10px] font-bold text-right tabular-nums ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-300'}`}>{(budget || actual) ? (diff >= 0 ? '+' : '') + fmt(Math.round(diff)) : ''}</span>
          </div>
        );

        // Section header
        const Header = ({ label, bg, border, text }: { label: string; bg: string; border: string; text: string }) => (
          <div className={`${bg} ${border} border-b px-3 py-2 flex items-center`}>
            <span className={`flex-1 text-xs font-black ${text} uppercase tracking-widest`}>{label}</span>
            <span className="w-[72px] text-[9px] font-black text-slate-400 text-right">BUDGET</span>
            <span className="w-[72px] text-[9px] font-black text-slate-400 text-right">ACTUAL</span>
            <span className="w-[56px] text-[9px] font-black text-slate-400 text-right">DIFF</span>
          </div>
        );

        // Total row
        const TotalRow = ({ label, budget, actual, diff, color }: { label: string; budget: number; actual: number; diff: number; color: string }) => (
          <div className={`px-3 py-2 flex items-center border-t-2 ${color === 'green' ? 'border-emerald-200 bg-emerald-50' : color === 'red' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
            <span className={`flex-1 text-xs font-black ${color === 'green' ? 'text-emerald-700' : color === 'red' ? 'text-rose-700' : 'text-slate-700'}`}>{label}</span>
            <span className={`w-[72px] text-xs font-black text-right tabular-nums ${color === 'green' ? 'text-emerald-600' : color === 'red' ? 'text-rose-600' : 'text-slate-700'}`}>{fmt(Math.round(budget))}</span>
            <span className={`w-[72px] text-xs font-black text-right tabular-nums ${color === 'green' ? 'text-emerald-700' : color === 'red' ? 'text-rose-700' : 'text-slate-800'}`}>{fmt(Math.round(actual))}</span>
            <span className={`w-[56px] text-[10px] font-black text-right tabular-nums ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{diff !== 0 ? (diff > 0 ? '+' : '') + fmt(Math.round(diff)) : '-'}</span>
          </div>
        );

        // Income totals
        const inc = sumCats(['salary', 'side_income', 'invest_income', 'other_income'], 'income');
        // Expense group totals
        // Dynamic totals from all expense categories
        const allExpCatKeys = expenseCats.map(c => c.key);
        const totalAll = sumCats(allExpCatKeys, 'expense');
        const net = { budget: inc.budget - totalAll.budget, actual: inc.actual - totalAll.actual, diff: 0 };
        net.diff = net.actual - net.budget;

        return (
          <>
            {/* ════════ งบกำไรขาดทุน (P&L) ════════ */}
            <div className="bg-slate-800 text-white text-center py-2 rounded-t-xl text-xs font-black uppercase tracking-[0.2em]">
              งบกำไรขาดทุนส่วนบุคคล
            </div>

            {/* รายได้ */}
            <div className="bg-white rounded-b-xl border border-slate-200 overflow-hidden">
              <Header label="รายได้" bg="bg-emerald-50" border="border-emerald-100" text="text-emerald-700" />
              <div className="px-3 py-1 divide-y divide-slate-50">
                <Row label="401 เงินเดือน/ค่าจ้าง" {...getBudgetActual('salary', 'income')} indent />
                <Row label="402 รายได้เสริม/ฟรีแลนซ์" {...getBudgetActual('side_income', 'income')} indent />
                <Row label="403 ผลตอบแทนลงทุน" {...getBudgetActual('invest_income', 'income')} indent />
                <Row label="404 รายรับอื่นๆ" {...getBudgetActual('other_income', 'income')} indent />
              </div>
              <TotalRow label="รายได้รวม" {...inc} color="green" />
            </div>

            {/* ค่าใช้จ่าย — dynamic by EXPENSE_GROUPS */}
            {(() => {
              const groupColors: Record<string, { bg: string; border: string; text: string }> = {
                'จำเป็น': { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700' },
                'อื่นๆ': { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-700' },
                'ชำระหนี้': { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
                'ลงทุน': { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700' },
              };

              let grandBudget = 0, grandActual = 0;

              const groupSections = EXPENSE_GROUPS.map(grp => {
                const cats = expenseCats.filter(c => c.group === grp.key);
                let grpBudget = 0, grpActual = 0;
                cats.forEach(c => { const r = getBudgetActual(c.key, 'expense'); grpBudget += r.budget; grpActual += r.actual; });
                grandBudget += grpBudget;
                grandActual += grpActual;
                const grpDiff = grpActual - grpBudget;
                const gc = groupColors[grp.key] || groupColors['อื่นๆ'];

                return (
                  <div key={grp.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <Header label={`${grp.emoji} ${grp.label}`} bg={gc.bg} border={gc.border} text={gc.text} />
                    <div className="px-3 py-1 divide-y divide-slate-50">
                      {cats.map(c => {
                        const ba = getBudgetActual(c.key, 'expense');
                        return <div key={c.key}><Row label={`${c.emoji} ${c.label}`} budget={ba.budget} actual={ba.actual} diff={ba.diff} indent catKey={c.key} /></div>;
                      })}
                    </div>
                    <TotalRow label={`รวม${grp.label}`} budget={grpBudget} actual={grpActual} diff={grpDiff} color={grp.key === 'จำเป็น' ? 'red' : ''} />
                  </div>
                );
              });

              const grandDiff = grandActual - grandBudget;
              const opBudget = inc.budget - grandBudget;
              const opActual = inc.actual - grandActual;
              const opDiff = opActual - opBudget;

              return (
                <>
                  {groupSections}

                  {/* รวมรายจ่ายทั้งหมด */}
                  <div className="bg-rose-100 rounded-xl border border-rose-300 px-3 py-2.5 flex items-center">
                    <span className="flex-1 text-xs font-black text-rose-800">รวมรายจ่ายทั้งหมด</span>
                    <span className="w-[72px] text-xs font-black text-rose-700 text-right tabular-nums">{fmt(Math.round(grandBudget))}</span>
                    <span className="w-[72px] text-xs font-black text-rose-800 text-right tabular-nums">{fmt(Math.round(grandActual))}</span>
                    <span className={`w-[56px] text-[10px] font-black text-right tabular-nums ${grandDiff > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{grandDiff !== 0 ? (grandDiff > 0 ? '+' : '') + fmt(Math.round(grandDiff)) : '-'}</span>
                  </div>
                </>
              );
            })()}

            {/* ═══ เงินคงเหลือสุทธิ ═══ */}
            <div className={`rounded-xl border-2 p-4 ${net.budget >= 0 ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-black ${net.budget >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  เงินคงเหลือสุทธิ
                </span>
              </div>
              <div className="flex items-center">
                <span className="flex-1" />
                <div className="text-right mr-3">
                  <p className="text-[9px] font-bold text-slate-400">BUDGET</p>
                  <p className={`text-lg font-black ${net.budget >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{net.budget >= 0 ? '+' : ''}{fmt(Math.round(net.budget))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400">ACTUAL</p>
                  <p className={`text-lg font-black ${net.actual >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{net.actual >= 0 ? '+' : ''}{fmt(Math.round(net.actual))}</p>
                </div>
              </div>
            </div>

            {/* ════════ งบดุลส่วนบุคคล (Balance Sheet) ════════ */}
            <div className="bg-slate-800 text-white text-center py-2 rounded-t-xl text-xs font-black uppercase tracking-[0.2em] mt-4">
              งบดุลส่วนบุคคล (ประมาณการ)
            </div>
            <div className="bg-white rounded-b-xl border border-slate-200 overflow-hidden">
              {/* สินทรัพย์ */}
              <div className="bg-blue-50 px-3 py-2 border-b border-blue-100">
                <span className="text-xs font-black text-blue-700 uppercase tracking-widest">สินทรัพย์</span>
              </div>
              <div className="px-3 py-2 space-y-1 text-[11px] text-slate-600 border-b border-slate-100">
                <div className="flex justify-between"><span className="pl-3">เงินสดและเงินฝาก</span><span className="text-slate-400 italic">กรอกข้อมูลจริง</span></div>
                <div className="flex justify-between"><span className="pl-3">เงินลงทุน (หุ้น/กองทุน)</span><span className="text-slate-400 italic">กรอกข้อมูลจริง</span></div>
                <div className="flex justify-between"><span className="pl-3">ทรัพย์สิน (บ้าน/รถ/อื่นๆ)</span><span className="text-slate-400 italic">กรอกข้อมูลจริง</span></div>
                <div className="flex justify-between"><span className="pl-3">ลูกหนี้ (เงินที่ให้ยืม)</span><span className="text-slate-400 italic">กรอกข้อมูลจริง</span></div>
              </div>
              <div className="px-3 py-2 bg-blue-50 flex justify-between text-xs font-black text-blue-700">
                <span>รวมสินทรัพย์</span><span>-</span>
              </div>

              {/* หนี้สิน */}
              <div className="bg-amber-50 px-3 py-2 border-b border-amber-100 border-t border-amber-100">
                <span className="text-xs font-black text-amber-700 uppercase tracking-widest">หนี้สิน</span>
              </div>
              <div className="px-3 py-2 space-y-1 text-[11px] text-slate-600 border-b border-slate-100">
                <div className="flex justify-between"><span className="pl-3">หนี้บัตรเครดิต</span><span className="text-slate-400 italic">กรอกข้อมูลจริง</span></div>
                <div className="flex justify-between"><span className="pl-3">สินเชื่อส่วนบุคคล</span><span className="text-slate-400 italic">กรอกข้อมูลจริง</span></div>
                <div className="flex justify-between"><span className="pl-3">ผ่อนบ้าน/ผ่อนรถ</span><span className="text-slate-400 italic">กรอกข้อมูลจริง</span></div>
                <div className="flex justify-between"><span className="pl-3">เงินยืม (เพื่อน/ครอบครัว)</span><span className="text-slate-400 italic">กรอกข้อมูลจริง</span></div>
              </div>
              <div className="px-3 py-2 bg-amber-50 flex justify-between text-xs font-black text-amber-700">
                <span>รวมหนี้สิน</span><span>-</span>
              </div>

              {/* ส่วนของเจ้าของ */}
              <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 border-t border-emerald-100">
                <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">ความมั่งคั่งสุทธิ (Net Worth)</span>
              </div>
              <div className="px-3 py-3 bg-emerald-50 flex justify-between text-xs font-black text-emerald-700">
                <span>สินทรัพย์ - หนี้สิน</span><span>-</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center italic">* งบดุลเป็นโครงสร้าง — รองรับการกรอกข้อมูลจริงในอนาคต</p>
          </>
        );
      })() : (
        (() => {
          // Group all items for this month by date (daily ledger)
          const monthItems = expenses.filter(e => {
            if (e.type === 'one-time') return e.date.startsWith(viewMonth);
            // Recurring: show if paid this month
            if (e.type === 'recurring' && e.paidHistory?.[viewMonth]) return true;
            return false;
          }).sort((a, b) => {
            const dateA = a.type === 'recurring' ? (a.paidHistory?.[viewMonth]?.paidAt?.split('T')[0] || a.date) : a.date;
            const dateB = b.type === 'recurring' ? (b.paidHistory?.[viewMonth]?.paidAt?.split('T')[0] || b.date) : b.date;
            return dateB.localeCompare(dateA);
          });

          // Also show unpaid recurring items
          const unpaidRecurring = expenses.filter(e => e.type === 'recurring' && !e.paidHistory?.[viewMonth])
            .sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0));

          // Group paid items by date
          const byDate = new Map<string, Expense[]>();
          monthItems.forEach(e => {
            const d = e.type === 'recurring' ? (e.paidHistory?.[viewMonth]?.paidAt?.split('T')[0] || viewMonth + '-01') : e.date;
            byDate.set(d, [...(byDate.get(d) || []), e]);
          });
          const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

          // Daily totals
          const monthIncome = monthItems.filter(e => (e.flow || 'expense') === 'income').reduce((s, e) => {
            if (e.type === 'recurring') return s + (e.paidHistory?.[viewMonth]?.amount ?? 0);
            return s + e.amount;
          }, 0);
          const monthExpense = monthItems.filter(e => (e.flow || 'expense') === 'expense').reduce((s, e) => {
            if (e.type === 'recurring') return s + (e.paidHistory?.[viewMonth]?.amount ?? 0);
            return s + e.amount;
          }, 0);

          return (
            <>
              {/* Month summary bar */}
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">รายรับ</p>
                  <p className="text-sm font-black text-emerald-600">+{fmt(Math.round(monthIncome))}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">คงเหลือ</p>
                  <p className={`text-sm font-black ${monthIncome - monthExpense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(Math.round(monthIncome - monthExpense))}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">รายจ่าย</p>
                  <p className="text-sm font-black text-rose-600">-{fmt(Math.round(monthExpense))}</p>
                </div>
              </div>

              {/* Unpaid recurring */}
              {unpaidRecurring.length > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-amber-100">
                    <span className="text-[10px] font-black text-amber-700">ยังไม่จ่าย ({unpaidRecurring.length})</span>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {unpaidRecurring.map(renderItem)}
                  </div>
                </div>
              )}

              {/* Daily entries */}
              {sortedDates.length > 0 ? sortedDates.map(date => {
                const items = byDate.get(date)!;
                const dayInc = items.filter(e => (e.flow || 'expense') === 'income').reduce((s, e) => s + (e.type === 'recurring' ? (e.paidHistory?.[viewMonth]?.amount ?? 0) : e.amount), 0);
                const dayExp = items.filter(e => (e.flow || 'expense') === 'expense').reduce((s, e) => s + (e.type === 'recurring' ? (e.paidHistory?.[viewMonth]?.amount ?? 0) : e.amount), 0);
                const dt = new Date(date);
                return (
                  <div key={date} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-600">
                        {dt.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex gap-3">
                        {dayInc > 0 && <span className="text-[10px] font-bold text-emerald-600">+{fmt(Math.round(dayInc))}</span>}
                        {dayExp > 0 && <span className="text-[10px] font-bold text-rose-600">-{fmt(Math.round(dayExp))}</span>}
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {items.map(renderItem)}
                    </div>
                  </div>
                );
              }) : unpaidRecurring.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold">ยังไม่มีรายการเดือนนี้</p>
                  <p className="text-[10px] text-slate-300 mt-1">กด + เพื่อบันทึกรายรับ/รายจ่าย</p>
                </div>
              )}

              {/* Add button */}
              <button onClick={() => setShowAddPicker(true)} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> บันทึกรายการ
              </button>
            </>
          );
        })()
      )}

      {/* ===== Add Picker Popup ===== */}
      {showAddPicker && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowAddPicker(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-slate-700 text-center">บันทึกรายการ</h3>
            <button onClick={() => { setShowAddPicker(false); openAdd('income'); }} className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <ArrowUpCircle className="w-5 h-5" /> รายรับ
            </button>
            <button onClick={() => { setShowAddPicker(false); openAdd('expense'); }} className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <ArrowDownCircle className="w-5 h-5" /> รายจ่าย
            </button>
            <button onClick={() => { setShowAddPicker(false); openAddDebt(); }} className="w-full py-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              🏦 ชำระหนี้
            </button>
            <button onClick={() => setShowAddPicker(false)} className="w-full py-2.5 text-slate-400 font-bold text-sm">ยกเลิก</button>
          </div>
        </div>,
      document.body)}

      {/* ===== Add/Edit Modal ===== */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[70] bg-white overflow-y-auto">
            <div className={`flex items-center justify-between p-4 border-b ${form.flow === 'income' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {form.flow === 'income' ? <ArrowUpCircle className="w-5 h-5 text-emerald-500" /> : <ArrowDownCircle className="w-5 h-5 text-rose-500" />}
                {editingId ? 'แก้ไข' : 'เพิ่ม'}{form.flow === 'income' ? 'รายรับ' : 'รายจ่าย'}
              </h3>
              <button onClick={resetForm} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4 pb-24">
              {/* 1. Category — ตั้ง context ก่อน */}
              <div>
                {(() => {
                  const selectedCat = catMap.get(form.category);
                  const selectedGroup = form.flow === 'income' ? 'รายรับ' : (EXPENSE_GROUPS.find(g => expenseCats.filter(c => c.group === g.key).some(c => c.key === form.category))?.label || '');
                  const catLabel = selectedCat ? `${selectedGroup} / ${selectedCat.emoji} ${selectedCat.label}` : '';
                  const accentColor = form.flow === 'income' ? 'emerald' : 'rose';

                  return (
                    <>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
                        หมวดหมู่: {catLabel ? <span className={`text-${accentColor}-600 normal-case tracking-normal`}>{catLabel}</span> : <span className="text-amber-500 normal-case tracking-normal">โปรดเลือกหมวดหมู่</span>}
                      </label>
                    </>
                  );
                })()}

                {lockedCat ? (
                  /* Locked mode — from drill-down */
                  (() => {
                    const lc = catMap.get(lockedCat);
                    return lc ? (
                      <div className={`px-3 py-2.5 rounded-xl border-2 ${form.flow === 'income' ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
                        <span className="text-sm font-bold text-slate-700">{lc.emoji} {lc.label}</span>
                      </div>
                    ) : null;
                  })()
                ) : form.flow === 'income' ? (
                  /* Income — checkbox list */
                  <div className="space-y-1">
                    {incomeCats.map(c => (
                      <label key={c.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${form.category === c.key ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`} onClick={() => setForm({ ...form, category: c.key })}>
                        <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 ${form.category === c.key ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                          {form.category === c.key && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-sm ${form.category === c.key ? 'font-bold text-emerald-700' : 'text-slate-600'}`}>{c.emoji} {c.label}</span>
                        {c.isCustom && <button onClick={e => { e.stopPropagation(); removeCustomCat(c.key); }} className="ml-auto p-1 text-slate-300 hover:text-rose-500"><X className="w-3 h-3" /></button>}
                      </label>
                    ))}
                    {showAddCat === 'income' ? (
                      <div className="flex gap-1.5 items-center pt-1">
                        <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} className="w-10 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-sm" maxLength={2} />
                        <input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="ชื่อหมวด" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" onKeyDown={e => e.key === 'Enter' && addCustomCat('', 'income')} />
                        <button onClick={() => addCustomCat('', 'income')} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg">เพิ่ม</button>
                        <button onClick={() => setShowAddCat(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddCat('income')} className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 pt-1"><Plus className="w-3 h-3" /> เพิ่มหมวด</button>
                    )}
                  </div>
                ) : (
                  /* Expense — tab + checkbox */
                  (() => {
                    const activeGroup = form.category ? (EXPENSE_GROUPS.find(g => expenseCats.filter(c => c.group === g.key).some(c => c.key === form.category))?.key || activeExpTab) : activeExpTab;
                    const tabItems = expenseCats.filter(c => c.group === activeGroup);
                    return (
                      <div className="space-y-2">
                        {/* Tab bar */}
                        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
                          {EXPENSE_GROUPS.map(grp => {
                            const isActive = grp.key === activeGroup;
                            return (
                              <button key={grp.key} onClick={() => {
                                setActiveExpTab(grp.key);
                                // Don't auto-select — only switch tab
                                if (form.category && !expenseCats.filter(c => c.group === grp.key).some(c => c.key === form.category)) {
                                  setForm({ ...form, category: '' });
                                }
                              }} className={`shrink-0 px-3 py-2 text-[11px] font-bold transition-all relative whitespace-nowrap ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                                {grp.emoji} {grp.label.replace('ค่าใช้จ่าย', '').replace('เงิน', '').trim()}
                                {isActive && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-rose-500 rounded-full" />}
                              </button>
                            );
                          })}
                        </div>
                        {/* Checkbox items in active tab */}
                        <div className="space-y-0.5">
                          {tabItems.map(c => (
                            <label key={c.key} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${form.category === c.key ? 'bg-rose-50 border border-rose-200' : 'hover:bg-slate-50'}`} onClick={() => setForm({ ...form, category: c.key })}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${form.category === c.key ? 'bg-rose-500 border-rose-500' : 'border-slate-300'}`}>
                                {form.category === c.key && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <span className={`text-[12px] ${form.category === c.key ? 'font-bold text-rose-700' : 'text-slate-600'}`}>{c.emoji} {c.label}</span>
                              {c.isCustom && <button onClick={e => { e.stopPropagation(); removeCustomCat(c.key); }} className="ml-auto p-0.5 text-slate-300 hover:text-rose-500"><X className="w-3 h-3" /></button>}
                            </label>
                          ))}
                        </div>
                        {showAddCat === activeGroup ? (
                          <div className="flex gap-1.5 items-center">
                            <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} className="w-10 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-sm" maxLength={2} />
                            <input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="ชื่อหมวด" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" onKeyDown={e => e.key === 'Enter' && addCustomCat(activeGroup, 'expense')} />
                            <button onClick={() => addCustomCat(activeGroup, 'expense')} className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg">เพิ่ม</button>
                            <button onClick={() => setShowAddCat(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setShowAddCat(activeGroup)} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-0.5"><Plus className="w-3 h-3" /> เพิ่มหมวด</button>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* 2. Title */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">ชื่อรายการ</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={form.flow === 'income' ? 'เช่น เงินเดือน, Freelance...' : 'เช่น ค่าเช่า, Netflix, กาแฟ...'} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>

              {/* 3. Amount + Date in one row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">จำนวนเงิน (บาท)</label>
                  <input type="number" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">วันที่</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
              </div>

              {/* 4. Recurring checkbox + frequency */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setForm({ ...form, type: form.type === 'recurring' ? 'one-time' : 'recurring' })}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${form.type === 'recurring' ? (form.flow === 'income' ? 'bg-emerald-500 border-emerald-500' : 'bg-rose-500 border-rose-500') : 'border-slate-300 bg-white'}`}>
                    {form.type === 'recurring' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700">รายการประจำ</span>
                    <p className="text-[10px] text-slate-400">ติ๊กเพื่อตั้งเป็น Budget ประจำ</p>
                  </div>
                </label>

                {form.type === 'recurring' && (
                  <>
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {([
                        ['daily', 'ทุกวัน'],
                        ['weekly', 'ทุก 7 วัน'],
                        ['monthly', 'ทุกเดือน'],
                        ['quarterly', 'ทุก 3 เดือน'],
                        ['yearly', 'ทุกปี'],
                      ] as [string, string][]).map(([key, label]) => (
                        <button key={key} onClick={() => setForm({ ...form, recurrence: key as any })} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${form.recurrence === key ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {(form.recurrence === 'monthly' || form.recurrence === 'quarterly') && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">วันที่ครบกำหนด</label>
                        <select value={form.dueDay} onChange={e => setForm({ ...form, dueDay: parseInt(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>วันที่ {d}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">วิธีจ่าย</label>
                <div className="flex gap-1.5 flex-wrap">
                  {PAYMENT_METHODS.filter(m => m.key !== 'borrow').map(m => (
                    <button key={m.key} onClick={() => setForm({ ...form, method: m.key, borrowFrom: '' })} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${form.method === m.key ? 'bg-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                      {m.emoji} {m.label}
                    </button>
                  ))}
                  <button onClick={() => setForm({ ...form, method: 'borrow' })} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${form.method === 'borrow' ? 'bg-amber-500 text-white' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                    🤲 ยืม
                  </button>
                </div>
              </div>

              {/* Borrow section */}
              {form.method === 'borrow' && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-amber-700 mb-1.5 block">ยืมจากใคร</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {borrowContacts.map(name => (
                        <button key={name} onClick={() => setForm({ ...form, borrowFrom: name })} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${form.borrowFrom === name ? 'bg-amber-500 text-white' : 'bg-white border border-amber-200 text-amber-700'}`}>
                          {name}
                        </button>
                      ))}
                      <button onClick={() => setShowAddContact(true)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-dashed border-amber-300 text-amber-500 hover:bg-amber-50">
                        <Plus className="w-3 h-3 inline" />
                      </button>
                    </div>
                    {showAddContact && (
                      <div className="flex gap-2 mt-2">
                        <input value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="ชื่อคนให้ยืม" className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" autoFocus onKeyDown={e => e.key === 'Enter' && addBorrowContact()} />
                        <button onClick={addBorrowContact} className="px-3 py-1.5 bg-amber-500 text-white font-bold text-xs rounded-lg">เพิ่ม</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-amber-700 mb-1 block">วันที่จะคืน</label>
                      <input type="date" value={form.borrowRepayDate} onChange={e => setForm({ ...form, borrowRepayDate: e.target.value })} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-700 mb-1 block">จำนวนที่จะคืน</label>
                      <input type="number" inputMode="decimal" value={form.borrowRepayAmount} onChange={e => setForm({ ...form, borrowRepayAmount: e.target.value })} placeholder={form.amount || '0'} className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">หมายเหตุ</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ไม่บังคับ" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm flex justify-end gap-3 z-10">
              <button onClick={resetForm} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm rounded-xl">ยกเลิก</button>
              <button onClick={saveExpense} disabled={!form.title.trim() || !form.amount || !form.category} className={`px-5 py-2.5 font-bold text-sm rounded-xl shadow-lg text-white disabled:opacity-40 ${form.flow === 'income' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`}>
                {editingId ? 'บันทึก' : form.flow === 'income' ? 'เพิ่มรายรับ' : 'เพิ่มรายจ่าย'}
              </button>
            </div>
        </div>,
      document.body)}

      {/* ===== Drill-down popup — show items in a category ===== */}
      {drillCat && createPortal((() => {
        const cat = catMap.get(drillCat);
        if (!cat) return null;
        const items = expenses.filter(e => e.category === drillCat);
        const recurringItems = items.filter(e => e.type === 'recurring');
        const oneTimeItems = items.filter(e => e.type === 'one-time' && e.date.startsWith(viewMonth));
        const isDebtGroup = cat.group === 'ชำระหนี้';

        return (
          <div className="fixed inset-0 z-[70] bg-white overflow-y-auto">
            {/* Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${isDebtGroup ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
              <div>
                <h3 className="font-bold text-slate-800">{cat.emoji} {cat.label}</h3>
                <p className="text-[10px] text-slate-400">{recurringItems.length} ประจำ / {oneTimeItems.length} ครั้งเดียว</p>
              </div>
              <button onClick={() => setDrillCat(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-4 pb-24">
              {/* Recurring items */}
              {recurringItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">รายการประจำ (Budget)</p>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
                    {recurringItems.map(exp => {
                      const isPaidMonth = !!exp.paidHistory?.[viewMonth];
                      const actualAmt = exp.paidHistory?.[viewMonth]?.amount;
                      return (
                        <div key={exp.id} className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handlePayClick(exp)} className="shrink-0 active:scale-90">
                              {isPaidMonth ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-amber-400" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-bold ${isPaidMonth ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{exp.title}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {exp.recurrence && (
                                  <span className="text-[9px] font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
                                    {exp.recurrence === 'monthly' ? `วันที่ ${exp.dueDay}` : exp.recurrence === 'quarterly' ? 'ทุก 3 เดือน' : exp.recurrence === 'yearly' ? 'ทุกปี' : exp.recurrence === 'weekly' ? 'ทุกสัปดาห์' : 'ทุกวัน'}
                                  </span>
                                )}
                                {exp.paymentMethod && (
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                                    {PAYMENT_METHODS.find(m => m.key === exp.paymentMethod)?.emoji} {PAYMENT_METHODS.find(m => m.key === exp.paymentMethod)?.label}
                                  </span>
                                )}
                                {isDebtGroup && exp.notes && <span className="text-[9px] text-slate-400">{exp.notes}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-slate-700">{fmt(exp.amount)}</p>
                              {isPaidMonth && actualAmt !== undefined && actualAmt !== exp.amount && (
                                <p className="text-[9px] text-emerald-600">จ่ายจริง {fmt(actualAmt)}</p>
                              )}
                              {isPaidMonth && <p className="text-[9px] text-emerald-500">จ่ายแล้ว</p>}
                            </div>
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <button onClick={() => { setDrillCat(null); openEdit(exp); }} className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-blue-500"><Edit3 className="w-3 h-3" /></button>
                              <button onClick={() => deleteExpense(exp.id)} className="p-1 hover:bg-rose-50 rounded text-slate-300 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* One-time items this month */}
              {oneTimeItems.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">รายการเดือนนี้ (Actual)</p>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
                    {oneTimeItems.map(exp => (
                      <div key={exp.id} className="px-3 py-2.5 flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 w-8 shrink-0">{fmtDate(exp.date)}</span>
                        <span className="text-sm font-bold text-slate-700 flex-1 truncate">{exp.title}</span>
                        {exp.paymentMethod && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded-full shrink-0">
                            {PAYMENT_METHODS.find(m => m.key === exp.paymentMethod)?.emoji}
                          </span>
                        )}
                        <span className="text-sm font-black text-slate-700 shrink-0">{fmt(exp.amount)}</span>
                        <button onClick={() => { setDrillCat(null); openEdit(exp); }} className="p-1 hover:bg-slate-100 rounded text-slate-300 hover:text-blue-500 shrink-0"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => deleteExpense(exp.id)} className="p-1 hover:bg-rose-50 rounded text-slate-300 hover:text-rose-500 shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recurringItems.length === 0 && oneTimeItems.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400">ยังไม่มีรายการในหมวดนี้</p>
                </div>
              )}

              {/* Summary */}
              {isDebtGroup && recurringItems.length > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
                  <p className="text-[10px] font-black text-amber-700 uppercase mb-2">สรุปหนี้สิน</p>
                  <div className="space-y-1.5">
                    {recurringItems.map(exp => {
                      const isPaid = !!exp.paidHistory?.[viewMonth];
                      return (
                        <div key={exp.id} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">{exp.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{fmt(exp.amount)}/เดือน</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {isPaid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t border-amber-200 pt-1.5 mt-1.5 flex justify-between">
                      <span className="text-xs font-black text-amber-800">รวม/เดือน</span>
                      <span className="text-xs font-black text-amber-800">{fmt(Math.round(recurringItems.reduce((s, e) => s + toMonthly(e), 0)))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Add button */}
              <button onClick={() => { setDrillCat(null); openAddWithCat(drillCat!); }} className={`w-full py-3 font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isDebtGroup ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}>
                <Plus className="w-4 h-4" /> เพิ่มรายการ {cat.label}
              </button>
            </div>
          </div>
        );
      })(), document.body)}

      {/* Pay Modal — enter actual amount for recurring */}
      {payModal && createPortal((() => {
        const exp = expenses.find(e => e.id === payModal.id);
        if (!exp) return null;
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-base">บันทึกจ่ายจริง</h3>
                <button onClick={() => setPayModal(null)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"><X className="w-4 h-4" /></button>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{catMap.get(exp.category)?.emoji} {exp.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">ยอดตั้งไว้: {fmt(exp.amount)} บาท</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">ยอดจ่ายจริง ({monthLabel})</label>
                <input
                  type="number" inputMode="decimal"
                  value={payModal.amount}
                  onChange={e => setPayModal({ ...payModal, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">จ่ายผ่าน</label>
                <div className="flex gap-1.5 flex-wrap">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.key} onClick={() => setPayModal({ ...payModal, method: m.key })} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${payModal.method === m.key ? 'bg-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-600'}`}>
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setPayModal(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl">ยกเลิก</button>
                <button onClick={confirmPay} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200">จ่ายแล้ว</button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
};

export default ExpenseTracker;
