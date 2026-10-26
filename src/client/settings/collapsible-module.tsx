import { useId, type ReactElement, type ReactNode } from 'react'
import { ModuleShell } from './module-shell.js'
import { useAccordionViewport } from './accordion-viewport.js'

export interface CollapsibleModuleProps {
  className: string
  title: ReactNode
  summary?: ReactNode
  interactiveSummary?: boolean
  open: boolean
  onToggle: () => void
  ariaLabel?: string
  children: ReactNode
}

export function CollapsibleModule({ className, title, summary, interactiveSummary = false, open, onToggle, ariaLabel, children }: CollapsibleModuleProps): ReactElement {
  const id = useId()
  const { panel, toggle } = useAccordionViewport(open, onToggle)

  return <ModuleShell
    className={`xmimo-ui-accordion ${className}`}
    title={title}
    summary={summary}
    interactiveSummary={interactiveSummary}
    collapsible
    open={open}
    onToggle={toggle}
    toggleId={`${id}-trigger`}
    controlsId={`${id}-panel`}
    ariaLabel={ariaLabel}
  >
    <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-trigger`}
      className={`xmimo-ui-accordion-collapse${open ? ' xmimo-ui-accordion-collapse-open' : ''}`}
      aria-hidden={!open} ref={element => { panel.current = element; if (element) element.inert = !open }}>
      <div className="xmimo-ui-accordion-content">{children}</div>
    </div>
  </ModuleShell>
}
