import type { ReactElement } from 'react'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { ANNOUNCEMENT_SOURCES, type AnnouncementSourceId } from '../../types/settings.js'
import type { Translate } from '../localization.js'
import { SettingFieldHeading } from './field-heading.js'
import { FieldInfo } from './controls/field-info.js'

export interface AnnouncementSettingsProps {
  t: Translate
  sources: AnnouncementSourceId[]
  writable: boolean
  overridden: boolean
  onChange: (sources: AnnouncementSourceId[]) => void
  onReset: () => void
}

export const ANNOUNCEMENT_SOURCE_OPTIONS = [
  { id: 'dsh-pet', label: 'settings.announcementsPet', hint: 'settings.announcementsPetHint', href: 'https://github.com/PC2005-cloud/dsh-pet' },
  { id: 'dsh-whale-musume', label: 'settings.announcementsWhale', hint: 'settings.announcementsWhaleHint', href: 'https://github.com/Sutera-Diffusus/dsh-whale-musume' },
  { id: 'question-titles', label: 'settings.announcementsQuestions', hint: 'settings.announcementsQuestionsHint', href: null },
  { id: 'approvals', label: 'settings.announcementsApprovals', hint: 'settings.announcementsApprovalsHint', href: null },
  { id: 'job-results', label: 'settings.announcementsJobs', hint: 'settings.announcementsJobsHint', href: null },
] as const

export function AnnouncementSettings({ t, sources, writable, overridden, onChange, onReset }: AnnouncementSettingsProps): ReactElement {
  return <section className="xmimo-tts-format">
    <SettingFieldHeading label={t('settings.announcementsTitle')}
      suffix={<FieldInfo label={t('settings.announcementsTitle')} text={t('settings.announcementsHint')} />}
      overriddenLabel={t('settings.overridden')}
      resetLabel={t('settings.reset')} overridden={overridden} resettable disabled={!writable} onReset={onReset} />
    {ANNOUNCEMENT_SOURCE_OPTIONS.map(option => <div key={option.id} className="xmimo-tts-announcement-source">
      <div>
        {option.href ? <a href={option.href} target="_blank" rel="noopener noreferrer">{t(option.label)} ↗</a> : <span>{t(option.label)}</span>}
        <small>{t(option.hint)}</small>
      </div>
      <Switch checked={sources.includes(option.id)} disabled={!writable} label={t(option.label)}
        onChange={checked => onChange(ANNOUNCEMENT_SOURCES.filter(id => id === option.id ? checked : sources.includes(id)))} />
    </div>)}
  </section>
}
