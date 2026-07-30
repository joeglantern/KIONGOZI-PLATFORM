import { getInitials, cn } from '../../lib/utils'

interface AvatarProps {
  name?: string | null
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-9 h-9 text-[12px]',
  lg: 'w-11 h-11 text-[14px]',
}

export function UserAvatar({ name, src, size = 'sm', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={cn('rounded-full object-cover bg-accent shrink-0', sizes[size], className)}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div className={cn(
      'rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0 font-bold text-brand',
      sizes[size], className
    )}>
      {getInitials(name)}
    </div>
  )
}
