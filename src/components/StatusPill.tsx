/**
 * StatusPill - Reusable status indicator component
 * 
 * Variants:
 * - draft: Gray pill for draft/inactive states
 * - live: Green pill for live/published/active states
 * - custom: Custom colors via props
 */

interface StatusPillProps {
  status: 'draft' | 'live' | 'published' | 'active' | 'inactive';
  label?: string;
  className?: string;
}

export function StatusPill({ status, label, className = '' }: StatusPillProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'live':
      case 'published':
      case 'active':
        return {
          bgColor: 'bg-[#1F8A5B20]',
          textColor: 'text-[#34D399]',
          dotColor: 'bg-[#1F8A5B]',
          defaultLabel: status === 'active' ? 'Live' : 'Published'
        };
      case 'draft':
      case 'inactive':
      default:
        return {
          bgColor: 'bg-[#262A33]',
          textColor: 'text-[#C3C8D2]',
          dotColor: 'bg-[#8E95A3]',
          defaultLabel: 'Draft'
        };
    }
  };

  const config = getStatusConfig();
  const displayLabel = label ?? config.defaultLabel;

  return (
    <span data-ev-id="ev_a910b91c1d"
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}>

      <span data-ev-id="ev_b42e57dc3b" className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {displayLabel}
    </span>);

}