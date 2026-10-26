/** Sound packs migrated from uisfx 0.4.0. */
export const SOUND_PACKS = ['minimal', 'soft', 'glass', 'arcade', 'mechanical', 'organic', 'dreamy', 'scifi', 'rubber', 'cinematic', 'studio', 'zen'] as const
export type SoundPack = typeof SOUND_PACKS[number]

export const SOUND_EFFECTS_MODES = ['all', 'off', 'click', 'task'] as const
export type SoundEffectsMode = typeof SOUND_EFFECTS_MODES[number]
export const SOUND_EFFECTS_SCOPES = ['all', 'click', 'task'] as const
export type SoundEffectsScope = typeof SOUND_EFFECTS_SCOPES[number]

export interface SoundEffectsModeFlags {
  enabled: boolean
  taskSounds: boolean
  clickSounds: boolean
}

export function resolveSoundEffectsMode(enabled: boolean, taskSounds: boolean, clickSounds: boolean): SoundEffectsMode {
  if (!enabled || (!taskSounds && !clickSounds)) return 'off'
  if (taskSounds && clickSounds) return 'all'
  return taskSounds ? 'task' : 'click'
}

export function resolveSoundEffectsScope(taskSounds: boolean, clickSounds: boolean): SoundEffectsScope {
  if (taskSounds === clickSounds) return 'all'
  return taskSounds ? 'task' : 'click'
}

export function getSoundEffectsModeFlags(mode: SoundEffectsMode): SoundEffectsModeFlags {
  return {
    enabled: mode !== 'off',
    taskSounds: mode === 'all' || mode === 'task',
    clickSounds: mode === 'all' || mode === 'click',
  }
}

export const DEFAULT_SOUND_SETTINGS = {
  soundEnabled: false,
  soundVolume: 0.7,
  soundPack: 'zen' as SoundPack,
  taskSounds: false,
  clickSounds: false,
}
