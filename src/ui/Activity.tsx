import { BrandMark } from './Brand'
import { IconCheck } from './Icons'
import { currentLabel } from './activityRows'
import type { ActivityGroup } from './activityRows'

/** The one line that says what the assistant is doing now. */
export function LiveStatus({ label }: { label: string }) {
  return (
    <div className="activity live" role="status">
      <BrandMark size={14} className="activity-mark" />
      <span key={label} className="activity-label">
        {label}
      </span>
    </div>
  )
}

/** A run of actions: live while the assistant works, then one closed line that opens to the list. */
export function Activity({ group, live }: { group: ActivityGroup; live: boolean }) {
  const current = currentLabel(group)
  if (live || current) return <LiveStatus label={current ?? 'Pensando'} />
  return (
    <details className="activity done">
      <summary>
        <IconCheck size={14} />
        <span className="activity-label">{group.items.length === 1 ? group.items[0]?.label : `${group.items.length} pasos`}</span>
      </summary>
      <ol>
        {group.items.map((item) => (
          <li key={item.id} className={item.status === 'error' ? 'warn' : undefined}>
            {item.label}
            {item.status === 'error' ? ' (no se pudo)' : ''}
          </li>
        ))}
      </ol>
    </details>
  )
}
