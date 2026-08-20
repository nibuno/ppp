import { describe, expect, it } from 'vitest'
import {
  emptyPresentationSnapshot,
  mergePresentationSnapshot,
  type PresentationSnapshot,
} from './presentation'

function snapshot(
  overrides: Partial<PresentationSnapshot>,
): PresentationSnapshot {
  return { ...emptyPresentationSnapshot, ...overrides }
}

describe('mergePresentationSnapshot', () => {
  it('accepts a snapshot with a newer revision', () => {
    const current = snapshot({ revision: 2, currentPage: 2 })
    const incoming = snapshot({ revision: 3, currentPage: 3 })

    expect(mergePresentationSnapshot(current, incoming)).toBe(incoming)
  })

  it('rejects a delayed snapshot with an older revision', () => {
    const current = snapshot({ revision: 4, currentPage: 4 })
    const incoming = snapshot({ revision: 3, currentPage: 3 })

    expect(mergePresentationSnapshot(current, incoming)).toBe(current)
  })

  it('keeps the newest timer value within the same revision', () => {
    const current = snapshot({
      revision: 5,
      timerStatus: 'running',
      elapsedSeconds: 12,
    })
    const delayed = snapshot({
      revision: 5,
      timerStatus: 'running',
      elapsedSeconds: 11,
    })

    expect(mergePresentationSnapshot(current, delayed)).toBe(current)
  })
})
