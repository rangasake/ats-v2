import { INSPECTION_STATUS } from '../../lib/constants';

const CONFIG = {
  [INSPECTION_STATUS.DRAFT]:    { bg: 'bg-gray-200',   text: 'text-gray-600',   icon: '✏️' },
  [INSPECTION_STATUS.PENDING]:  { bg: 'bg-amber-400',  text: 'text-white',      icon: '⏳' },
  [INSPECTION_STATUS.APPROVED]: { bg: 'bg-green-500',  text: 'text-white',      icon: '✅' },
  [INSPECTION_STATUS.REJECTED]: { bg: 'bg-red-500',    text: 'text-white',      icon: '❌' },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG[INSPECTION_STATUS.DRAFT];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {status}
    </span>
  );
}
