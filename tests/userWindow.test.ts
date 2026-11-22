import { describe, expect, it } from 'vitest'
import { pickUserWindow } from '../src/agent/userWindow'

describe('pickUserWindow (Safari window mode)', () => {
  const windows = [
    { id: 1, type: 'normal', focused: false },
    { id: 2, type: 'normal', focused: false },
    { id: 9, type: 'popup', focused: true }, // the panel
  ]

  it('takes the most recently focused normal window, skipping the panel and popups', () => {
    expect(pickUserWindow(windows, [9, 2, 1], 9)).toBe(2)
  })

  it('ignores remembered windows that have closed', () => {
    expect(pickUserWindow(windows, [7, 1], 9)).toBe(1)
  })

  it('falls back to the focused normal window, then the first one', () => {
    expect(pickUserWindow([{ id: 1, type: 'normal' }, { id: 2, type: 'normal', focused: true }], [])).toBe(2)
    expect(pickUserWindow(windows, [], 9)).toBe(1)
  })

  it('never returns the excluded panel window', () => {
    expect(pickUserWindow([{ id: 9, type: 'normal', focused: true }], [9], 9)).toBeUndefined()
  })
})
