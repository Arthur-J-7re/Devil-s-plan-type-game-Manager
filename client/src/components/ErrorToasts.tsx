import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '@/lib/store';

export function ErrorToasts() {
  const errors = useStore((s) => s.errors);
  const clearErrors = useStore((s) => s.clearErrors);

  useEffect(() => {
    if (errors.length === 0) return;
    const t = setTimeout(clearErrors, 4000);
    return () => clearTimeout(t);
  }, [errors, clearErrors]);

  if (errors.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {errors.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive shadow-lg"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>{e.message}</span>
        </div>
      ))}
    </div>
  );
}
