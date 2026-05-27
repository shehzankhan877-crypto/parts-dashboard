'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import StatusBadge from '@/components/StatusBadge';

const ADMIN_PASSWORD = 'admin';

const STATUSES = ['In Production','QC','Ready to Ship','Delivered','Delayed'];
const TIMELINE_MAP: Record<string,string[]> = {
  'In Production': ['Order Created','Manufacturing Started'],
  'QC':            ['Order Created','Manufacturing Started','Quality Check'],
  'Ready to Ship': ['Order Created','Manufacturing Started','Quality Check','Ready to Ship'],
  'Delivered':     ['Order Created','Manufacturing Started','Quality Check','Ready to Ship','Delivered'],
  'Delayed':       ['Order Created'],
};

const ALL_STAGES = ['Order Created','Manufacturing Started','Quality Check','Ready to Ship','Delivered'];

function genId() { return 'TRACK-' + Math.floor(1000 + Math.random() * 9000); }

const STATUS_META: Record<string, { emoji: string; color: string }> = {
  'In Production': { emoji: '🔧', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  'QC':            { emoji: '🔍', color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
  'Ready to Ship': { emoji: '📦', color: 'text-green-600 bg-green-50 border-green-100' },
  'Delivered':     { emoji: '✅', color: 'text-gray-500 bg-gray-50 border-gray-100' },
  'Delayed':       { emoji: '⚠️', color: 'text-red-600 bg-red-50 border-red-100' },
};

function OrderRow({ o, updateStatus, deleteOrder }: { o: any; updateStatus: (id: string, status: string) => void; deleteOrder: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const timeline: string[] = o.timeline ?? [];

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">
          <span className="mr-2 text-gray-300">{expanded ? '▲' : '▼'}</span>
          {o.trackingId}
        </td>
        <td className="px-4 py-3">{o.customerName}</td>
        <td className="px-4 py-3">{o.partName}</td>
        <td className="px-4 py-3">{o.quantity}</td>
        <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
        <td className="px-4 py-3 text-gray-500">{o.deliveryDate}</td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
            className="border rounded-lg px-2 py-1 text-xs focus:outline-none">
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <button onClick={() => deleteOrder(o.id)}
            className="text-red-400 hover:text-red-600 text-xs font-medium transition">
            Delete
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-blue-50">
          <td colSpan={8} className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Order Timeline — {o.trackingId}
            </p>
            <div className="flex items-center">
              {ALL_STAGES.map((stage, index) => {
                const done = timeline.includes(stage);
                const isLast = index === ALL_STAGES.length - 1;
                return (
                  <div key={stage} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
                        ${done ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                        {done ? '✓' : index + 1}
                      </div>
                      <span className={`text-xs text-center leading-tight max-w-16
                        ${done ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                        {stage}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-1 mb-5
                        ${timeline.includes(ALL_STAGES[index + 1]) ? 'bg-blue-400' : 'bg-gray-200'}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {[
                { label: 'Customer', value: o.customerName },
                { label: 'Part', value: o.partName },
                { label: 'Quantity', value: o.quantity },
                { label: 'Est. Delivery', value: o.deliveryDate },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-xl border px-4 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminPage() {
  const [authed, setAuthed]           = useState(false);
  const [pw, setPw]                   = useState('');
  const [pwError, setPwError]         = useState('');
  const [orders, setOrders]           = useState<any[]>([]);
  const [form, setForm]               = useState({ customerName:'', partName:'', quantity:'', deliveryDate:'' });
  const [summaryOpen, setSummaryOpen] = useState(false);

  async function fetchOrders() {
    const snap = await getDocs(collection(db, 'orders'));
    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => { if (authed) fetchOrders(); }, [authed]);

  function handleLogin() {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(''); }
    else setPwError('Incorrect password. Try again.');
  }

  async function createOrder() {
    const { customerName, partName, quantity, deliveryDate } = form;
    if (!customerName || !partName || !quantity || !deliveryDate) return alert('Fill all fields');
    await addDoc(collection(db, 'orders'), {
      trackingId: genId(), customerName, partName,
      quantity: Number(quantity), deliveryDate,
      status: 'In Production',
      timeline: ['Order Created','Manufacturing Started'],
    });
    setForm({ customerName:'', partName:'', quantity:'', deliveryDate:'' });
    fetchOrders();
  }

  async function updateStatus(id: string, status: string) {
    await updateDoc(doc(db, 'orders', id), { status, timeline: TIMELINE_MAP[status] ?? [] });
    fetchOrders();
  }

  async function deleteOrder(id: string) {
    if (!confirm('Delete this order?')) return;
    await deleteDoc(doc(db, 'orders', id));
    fetchOrders();
  }

  const counts: Record<string,number> = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
  const delayed   = counts['Delayed'] ?? 0;
  const delivered = counts['Delivered'] ?? 0;
  const active    = orders.length - delivered;
  const health    = orders.length === 0 ? null
    : delayed === 0 ? { label: 'All Good', color: 'text-green-600 bg-green-50 border-green-200', dot: 'bg-green-500' }
    : delayed <= 1  ? { label: 'Minor Delays', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400' }
    :                 { label: 'Needs Attention', color: 'text-red-600 bg-red-50 border-red-200', dot: 'bg-red-500' };

  const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (!authed) return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-sm">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
          <span className="text-white text-lg">🔒</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Access</h1>
        <p className="text-gray-500 text-sm mb-6">Enter your password to continue</p>
        <input type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Password" className={inp + ' mb-3'} />
        {pwError && <p className="text-red-500 text-sm mb-3">{pwError}</p>}
        <button onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition">
          Login
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">PartsFlow — Internal Order Management</p>
          </div>
          <button onClick={() => setAuthed(false)}
            className="text-sm text-gray-500 hover:text-red-500 border rounded-lg px-4 py-2 transition">
            Logout
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Orders', value: orders.length, val: 'text-gray-900' },
            { label: 'Active',       value: active,        val: 'text-blue-600' },
            { label: 'Delivered',    value: delivered,     val: 'text-green-600' },
            { label: 'Delayed',      value: delayed,       val: delayed > 0 ? 'text-red-500' : 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border p-4 text-center shadow-sm">
              <p className={`text-2xl font-bold ${s.val}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm mb-6 overflow-hidden">
          <button onClick={() => setSummaryOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">✦</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Portfolio Snapshot</p>
                <p className="text-xs text-gray-400">AI-generated order intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {health && (
                <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${health.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                  {health.label}
                </span>
              )}
              <span className="text-gray-400 text-xs">{summaryOpen ? '▲' : '▼'}</span>
            </div>
          </button>
          {summaryOpen && (
            <div className="border-t px-6 py-5">
              {orders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No orders to summarize yet.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {Object.entries(counts).map(([status, count]) => {
                      const meta = STATUS_META[status] ?? { emoji: '📋', color: 'text-gray-500 bg-gray-50 border-gray-100' };
                      return (
                        <div key={status} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${meta.color}`}>
                          <span className="text-sm font-medium flex items-center gap-2">
                            <span>{meta.emoji}</span> {status}
                          </span>
                          <span className="text-lg font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border text-sm text-gray-700 leading-relaxed">
                    {(() => {
                      const lines = [];
                      if (orders.length > 0)
                        lines.push(`You have <b>${orders.length} order${orders.length > 1 ? 's' : ''}</b> in the system.`);
                      if ((counts['Ready to Ship'] ?? 0) > 0)
                        lines.push(`<b>${counts['Ready to Ship']} order${counts['Ready to Ship'] > 1 ? 's are' : ' is'} ready to ship</b> — action needed.`);
                      if ((counts['QC'] ?? 0) > 0)
                        lines.push(`${counts['QC']} in quality check.`);
                      if ((counts['In Production'] ?? 0) > 0)
                        lines.push(`${counts['In Production']} currently in production.`);
                      if (delayed > 0)
                        lines.push(`⚠️ <b>${delayed} order${delayed > 1 ? 's are' : ' is'} delayed</b> — follow up recommended.`);
                      if (delivered > 0)
                        lines.push(`${delivered} successfully delivered.`);
                      return lines.map((l, i) => (
                        <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: l }} />
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Create New Order</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className={inp} placeholder="Customer Name" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
            <input className={inp} placeholder="Part Name" value={form.partName} onChange={e => setForm({...form, partName: e.target.value})} />
            <input className={inp} placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            <input className={inp} type="date" value={form.deliveryDate} onChange={e => setForm({...form, deliveryDate: e.target.value})} />
          </div>
          <button onClick={createOrder} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition">
            + Create Order
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-gray-800">All Orders ({orders.length})</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click any row to expand the order timeline</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {['Tracking ID','Customer','Part','Qty','Status','Delivery','Update',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <OrderRow key={o.id} o={o} updateStatus={updateStatus} deleteOrder={deleteOrder} />
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400 text-sm">
                      No orders yet. Create your first order above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}