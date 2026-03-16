import { INSPECTION_STATUS } from '../../lib/constants';

const CONFIG = {
  [INSPECTION_STATUS.DRAFT]:    { bg: 'bg-gray-100',   text: 'text-gray-600',  icon: '✏️' },
  [INSPECTION_STATUS.PENDING]:  { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⏳' },
  [INSPECTION_STATUS.APPROVED]: { bg: 'bg-green-100',  text: 'text-green-700', icon: '✅' },
  [INSPECTION_STATUS.REJECTED]: { bg: 'bg-red-100',    text: 'text-red-700',   icon: '❌' },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG[INSPECTION_STATUS.DRAFT];
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {status}
    </span>
  );
}
