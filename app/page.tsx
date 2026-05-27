'use client';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import StatusBadge from '@/components/StatusBadge';
import Timeline from '@/components/Timeline';

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

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-16 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">PartsFlow</h1>
      <p className="text-gray-500 mb-8">Track your manufacturing order</p>
      <div className="bg-white rounded-2xl shadow-sm border p-6 w-full max-w-md">
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
        <div className="bg-white rounded-2xl shadow-sm border p-6 w-full max-w-md mt-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Tracking ID</p>
              <p className="font-bold text-gray-900">{order.trackingId}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><p className="text-gray-400">Customer</p><p className="font-medium">{order.customerName}</p></div>
            <div><p className="text-gray-400">Part</p><p className="font-medium">{order.partName}</p></div>
            <div><p className="text-gray-400">Quantity</p><p className="font-medium">{order.quantity}</p></div>
            <div><p className="text-gray-400">Est. Delivery</p><p className="font-medium">{order.deliveryDate}</p></div>
          </div>
          <hr className="my-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">Progress</p>
          <Timeline completed={order.timeline ?? []} />
        </div>
      )}
    </main>
  );
}