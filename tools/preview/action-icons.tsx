import type { ReactElement } from 'react'

interface ActionIconProps {
  size?: number
  className?: string
}

function Icon({ children, size = 17, className }: ActionIconProps & { children: ReactElement | ReactElement[] }): ReactElement {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}

export function CopyIcon(props: ActionIconProps): ReactElement {
  return <Icon {...props}><><rect x="9" y="9" width="10" height="10" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></></Icon>
}

export function CirclePlayIcon(props: ActionIconProps): ReactElement {
  return <Icon {...props}><><circle cx="12" cy="12" r="9" /><path d="m10 8 5 4-5 4V8Z" fill="currentColor" stroke="none" /></></Icon>
}

export function DatabaseIcon(props: ActionIconProps): ReactElement {
  return <Icon {...props}><><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></></Icon>
}

export function ShareIcon(props: ActionIconProps): ReactElement {
  return <Icon {...props}><><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></></Icon>
}

export function ThumbsUpIcon(props: ActionIconProps): ReactElement {
  return <Icon {...props}><path d="M7 10v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Zm0 10h9.5a2 2 0 0 0 1.9-1.4l2-6A2 2 0 0 0 18.5 10H15l.8-3.2A2.3 2.3 0 0 0 13.6 4L7 10v10Z" /></Icon>
}

export function ThumbsDownIcon(props: ActionIconProps): ReactElement {
  return <Icon {...props}><path d="M7 14V4H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3Zm0-10h9.5a2 2 0 0 1 1.9 1.4l2 6A2 2 0 0 1 18.5 14H15l.8 3.2a2.3 2.3 0 0 1-2.2 2.8L7 14V4Z" /></Icon>
}
