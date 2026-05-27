const ALL_STAGES = [
  'Order Created',
  'Manufacturing Started',
  'Quality Check',
  'Ready to Ship',
  'Delivered',
];

export default function Timeline({ completed }: { completed: string[] }) {
  return (
    <div className="space-y-2 mt-4">
      {ALL_STAGES.map((stage) => {
        const done = completed.includes(stage);
        return (
          <div key={stage} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${done ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {done ? '✓' : '○'}
            </div>
            <span className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}