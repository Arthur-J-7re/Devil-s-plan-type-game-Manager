import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Coin({
  count,
  size = 'md',
  className,
}: {
  count: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-lg gap-2',
    xl: 'text-3xl gap-3 font-bold',
  };
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-8 w-8',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center font-mono tabular-nums text-yellow-400',
        sizes[size],
        className
      )}
    >
      <Coins className={iconSizes[size]} />
      <span>{count}</span>
    </span>
  );
}
