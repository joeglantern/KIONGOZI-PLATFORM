import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-3 text-center">
      <div className="p-4 rounded-2xl bg-accent text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
