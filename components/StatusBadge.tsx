type Status = 'In Production' | 'QC' | 'Ready to Ship' | 'Delivered' | 'Delayed';

const colors: Record<Status, string> = {
  'In Production': 'bg-blue-100 text-blue-700',
  'QC':            'bg-yellow-100 text-yellow-700',
  'Ready to Ship': 'bg-green-100 text-green-700',
  'Delivered':     'bg-gray-100 text-gray-600',
  'Delayed':       'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
      colors[status] ?? 'bg-gray-100 text-gray-600'
    }`}>
      {status}
    </span>
  );
}