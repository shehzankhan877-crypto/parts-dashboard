'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import StatusBadge from '@/components/StatusBadge';

const ADMIN_PASSWORD = 'partsflow123'; // change this to whatever you want

const STATUSES = ['In Production','QC','Ready to Ship','Delivered','Delayed'];
const TIMELINE_MAP: Record<string,string[]> = {
  'In Production': ['Order Created','Manufacturing Started'],
  'QC':            ['Order Created','Manufacturing Started','Quality Check'],
  'Ready to Ship': ['Order Created','Manufacturing Started','Quality Check','Ready to Ship'],
  'Delivered':     ['Order Created','Manufacturing Started','Quality Check','Ready to Ship','Delivered'],
  'Delayed':       ['Order Created'],
};

function genId() { return 'TRACK-' + Math.floor(1000 + Math.random() * 9000); }

export default function AdminPage() {
  const [authed, setAuthed]   = useState(false);
  const [pw, setPw]           = useState('');
  const [pwError, setPwError] = useState('');
  const [orders, setOrders]   = useState<any[]>([]);
  const [form, setForm]       = useState({ customerName:'', partName:'', quantity:'', deliveryDate:'' });
  const [summary, setSummary] = useState('');

  async function fetchOrders() {
    const snap = await getDocs(collection(db, 'orders'));
    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => { if (authed) fetchOrders(); }, [authed]);

  function handleLogin() {
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError('');
    } else {
      setPwError('Incorrect password. Try again.');
    }
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

  function generateSummary() {
    if (orders.length === 0) { setSummary('No orders yet.'); return; }
    const counts: Record<string,number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    const parts = Object.entries(counts).map(([s,n]) => `${n} order${n>1?'s':''} ${s.toLowerCase()}`);
    setSummary(`Total ${orders.length} orders: ${parts.join(', ')}.`);
  }

  const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  // ── Password screen ──────────────────────────────────────────────────────
  if (!authed) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Access</h1>
          <p className="text-gray-500 text-sm mb-6">Enter your password to continue</p>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className={inp + ' mb-3'}
          />
          {pwError && <p className="text-red-500 text-sm mb-3">{pwError}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition"
          >
            Login
          </button>
        </div>
      </main>
    );
  }

  // ── Admin dashboard ──────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">PartsFlow — Internal Order Management</p>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="text-sm text-gray-500 hover:text-red-500 border rounded-lg px-4 py-2 transition"
          >
            Logout
          </button>
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

        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Order Summary</h2>
          <button onClick={generateSummary} className="bg-gray-900 hover:bg-gray-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition mb-3">
            Generate Summary
          </button>
          {summary && <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border">{summary}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-5 border-b"><h2 className="font-semibold text-gray-800">All Orders ({orders.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['Tracking ID','Customer','Part','Qty','Status','Delivery','Update',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{o.trackingId}</td>
                    <td className="px-4 py-3">{o.customerName}</td>
                    <td className="px-4 py-3">{o.partName}</td>
                    <td className="px-4 py-3">{o.quantity}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{o.deliveryDate}</td>
                    <td className="px-4 py-3">
                      <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} className="border rounded-lg px-2 py-1 text-xs focus:outline-none">
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteOrder(o.id)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No orders yet. Create your first order above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}