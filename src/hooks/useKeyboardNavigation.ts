import { useEffect } from 'react'

type KeyboardNavigationOptions = {
  enabled: boolean
  onNext: () => void
  onPrevious: () => void
  onFirst: () => void
  onLast: () => void
  onToggleFullscreen: () => void
  onResetTimer: () => void
  onToggleTimer: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

export function useKeyboardNavigation({
  enabled,
  onNext,
  onPrevious,
  onFirst,
  onLast,
  onToggleFullscreen,
  onResetTimer,
  onToggleTimer,
}: KeyboardNavigationOptions) {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }

      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          event.preventDefault()
          onNext()
          break
        case 'ArrowLeft':
          event.preventDefault()
          onPrevious()
          break
        case 'Home':
          event.preventDefault()
          onFirst()
          break
        case 'End':
          event.preventDefault()
          onLast()
          break
        case 'f':
        case 'F':
          event.preventDefault()
          onToggleFullscreen()
          break
        case 'r':
        case 'R':
          event.preventDefault()
          onResetTimer()
          break
        case 'p':
        case 'P':
          event.preventDefault()
          onToggleTimer()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    enabled,
    onFirst,
    onLast,
    onNext,
    onPrevious,
    onResetTimer,
    onToggleFullscreen,
    onToggleTimer,
  ])
}
