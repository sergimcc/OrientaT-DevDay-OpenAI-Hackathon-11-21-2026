import type { Effort, ModelId } from '../agent/agent'

/** `anthropic`: Claude with the person's own key, from the panel. `openai`: OpenAI through the local
 *  server in web/ (npm run dev), which keeps the key in web/.env.local; the panel holds no key. */
export type Provider = 'anthropic' | 'openai'

export type Settings = {
  provider: Provider
  model: ModelId
  effort: Effort
  theme: 'system' | 'light' | 'dark'
}

export const DEFAULTS: Settings = { provider: 'openai', model: 'claude-opus-5-5', effort: 'medium', theme: 'system' }
export const MODELS: { id: ModelId; label: string; note: string }[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'el más capaz (recomendado)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'más rápido y barato' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'el más rápido y barato' },
]
export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'openai', label: 'OpenAI (servidor local)' },
  { id: 'anthropic', label: 'Claude (tu clave de API)' },
]
export const EFFORTS: { id: Effort; label: string }[] = [
  { id: 'low', label: 'Bajo' },
  { id: 'medium', label: 'Medio' },
  { id: 'high', label: 'Alto' },
  { id: 'xhigh', label: 'Muy alto' },
  { id: 'max', label: 'Máximo' },
]
export const THEMES: { id: Settings['theme']; label: string }[] = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Oscuro' },
]

const KEY = 'settings'
const API_KEY = 'anthropicApiKey'

/** Bumped when a default changes for everyone. 2: OpenAI through the local server became the provider. */
const VERSION = 2

export async function loadSettings(): Promise<Settings> {
  const { v, ...stored } = ((await chrome.storage.local.get(KEY))[KEY] ?? {}) as Partial<Settings> & { v?: number }
  const merged: Settings = { ...DEFAULTS, ...stored }
  // Settings saved before version 2 picked Anthropic only because it was the default: move them to OpenAI
  // once. Whoever chooses Anthropic in Ajustes afterwards keeps it.
  if ((v ?? 1) < 2) merged.provider = 'openai'
  if (!MODELS.some((m) => m.id === merged.model)) merged.model = DEFAULTS.model
  if (!PROVIDERS.some((p) => p.id === merged.provider)) merged.provider = DEFAULTS.provider
  return merged
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: { ...settings, v: VERSION } })
}

/** The person's own Anthropic API key. Kept in this browser only (chrome.storage.local). */
export async function loadApiKey(): Promise<string> {
  return ((await chrome.storage.local.get(API_KEY))[API_KEY] as string | undefined) ?? ''
}

export async function saveApiKey(key: string): Promise<void> {
  if (key) await chrome.storage.local.set({ [API_KEY]: key })
  else await chrome.storage.local.remove(API_KEY)
}
