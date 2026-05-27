'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import StatusBadge from '@/components/StatusBadge';
import Timeline from '@/components/Timeline';

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
  const [orders, setOrders]       = useState<any[]>([]);
  const [form, setForm]           = useState({ customerName:'', partName:'', quantity:'', deliveryDate:'' });
  const [summary, setSummary]     = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function fetchOrders() {
    const snap = await getDocs(collection(db, 'orders'));
    setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => { fetchOrders(); }, []);

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

  function generateSummary() {
    if (orders.length === 0) { setSummary('No orders yet.'); return; }
    const counts: Record<string,number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    const parts = Object.entries(counts).map(([s,n]) => `${n} order${n>1?'s':''} ${s.toLowerCase()}`);
    setSummary(`Total ${orders.length} orders: ${parts.join(', ')}.`);
  }

  const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mb-6">PartsFlow — Internal Order Management</p>

        {/* Create Order */}
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

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Order Summary</h2>
          <button onClick={generateSummary} className="bg-gray-900 hover:bg-gray-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition mb-3">
            Generate Summary
          </button>
          {summary && <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4 border">{summary}</p>}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-5 border-b"><h2 className="font-semibold text-gray-800">All Orders ({orders.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>{['','Tracking ID','Customer','Part','Qty','Status','Delivery','Update'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(o => (
                  <>
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {expandedId === o.id ? '▲' : '▼'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600">{o.trackingId}</td>
                      <td className="px-4 py-3">{o.customerName}</td>
                      <td className="px-4 py-3">{o.partName}</td>
                      <td className="px-4 py-3">{o.quantity}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-gray-500">{o.deliveryDate}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} className="border rounded-lg px-2 py-1 text-xs focus:outline-none">
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>

                    {/* Expanded Timeline Row */}
                    {expandedId === o.id && (
                      <tr key={o.id + '-timeline'} className="bg-blue-50">
                        <td colSpan={8} className="px-6 py-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Order Timeline — {o.trackingId}
                          </p>
                          <Timeline completed={o.timeline ?? []} />
                        </td>
                      </tr>
                    )}
                  </>
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