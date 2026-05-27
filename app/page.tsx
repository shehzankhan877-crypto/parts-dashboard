'use client';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import StatusBadge from '@/components/StatusBadge';

const ALL_STAGES = ['Order Created','Manufacturing Started','Quality Check','Ready to Ship','Delivered'];

export default function Home() {
  const [trackingId, setTrackingId] = useState('');
  const [order, setOrder]           = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  async function handleTrack() {
    if (!trackingId.trim()) return;
    setLoading(true); setError(''); setOrder(null);
    try {
      const q = query(
        collection(db, 'orders'),
        where('trackingId', '==', trackingId.toUpperCase())
      );
      const snap = await getDocs(q);
      if (snap.empty) setError('No order found. Check your tracking ID.');
      else setOrder(snap.docs[0].data());
    } catch { setError('Something went wrong. Try again.'); }
    setLoading(false);
  }

  const timeline: string[] = order?.timeline ?? [];

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-16 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">PartsFlow</h1>
      <p className="text-gray-500 mb-8">Track your manufacturing order</p>

      <div className="bg-white rounded-2xl shadow-sm border p-6 w-full max-w-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">Enter Tracking ID</label>
        <input
          value={trackingId}
          onChange={e => setTrackingId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleTrack()}
          placeholder="e.g. TRACK-8472"
          className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />
        <button
          onClick={handleTrack}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Track Order'}
        </button>
        {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
      </div>

      {order && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 w-full max-w-lg mt-4">

          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Tracking ID</p>
              <p className="font-bold text-gray-900">{order.trackingId}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {/* Order details */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            <div><p className="text-gray-400">Customer</p><p className="font-medium">{order.customerName}</p></div>
            <div><p className="text-gray-400">Part</p><p className="font-medium">{order.partName}</p></div>
            <div><p className="text-gray-400">Quantity</p><p className="font-medium">{order.quantity}</p></div>
            <div><p className="text-gray-400">Est. Delivery</p><p className="font-medium">{order.deliveryDate}</p></div>
          </div>

          <hr className="mb-5" />

          {/* Horizontal timeline */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Order Progress</p>
          <div className="flex items-center">
            {ALL_STAGES.map((stage, index) => {
              const done = timeline.includes(stage);
              const isLast = index === ALL_STAGES.length - 1;
              return (
                <div key={stage} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
                      ${done
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                      {done ? '✓' : index + 1}
                    </div>
                    <span className={`text-xs text-center leading-tight w-14
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

        </div>
      )}
    </main>
  );
}