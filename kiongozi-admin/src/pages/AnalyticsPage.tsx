import { ChartLine } from '@phosphor-icons/react';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4">
      <ChartLine weight="duotone" size={40} className="text-muted-foreground mb-4 opacity-40" />
      <p className="text-[15px] font-semibold text-foreground mb-1">Analytics not yet connected</p>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
        The backend analytics endpoint is not built yet. Charts and trend data will appear here once it's ready.
      </p>
    </div>
  );
}
