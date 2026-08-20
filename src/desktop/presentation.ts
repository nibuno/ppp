import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { TimerStatus } from '../types'

export const presentationQueryKey = ['presentation', 'snapshot'] as const
export const presentationPdfQueryKey = ['presentation', 'pdf'] as const
export const presentationStateChangedEvent = 'presentation-state-changed'

export type PresentationSnapshot = {
  currentPage: number
  totalPages: number
  durationSeconds: number
  elapsedSeconds: number
  remainingSeconds: number
  timerStatus: TimerStatus
  revision: number
  hasPdf: boolean
  fileName: string | null
}

export type DesktopCommandError = {
  code: string
  message: string
}

export const emptyPresentationSnapshot: PresentationSnapshot = {
  currentPage: 1,
  totalPages: 0,
  durationSeconds: 0,
  elapsedSeconds: 0,
  remainingSeconds: 0,
  timerStatus: 'idle',
  revision: 0,
  hasPdf: false,
  fileName: null,
}

export function isDesktopRuntime(): boolean {
  return isTauri()
}

export function mergePresentationSnapshot(
  current: PresentationSnapshot | undefined,
  incoming: PresentationSnapshot,
): PresentationSnapshot {
  if (!current || incoming.revision > current.revision) {
    return incoming
  }

  if (incoming.revision < current.revision) {
    return current
  }

  if (
    incoming.timerStatus === current.timerStatus &&
    incoming.elapsedSeconds < current.elapsedSeconds
  ) {
    return current
  }

  return incoming
}

export function describeDesktopError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'デスクトップ機能の処理に失敗しました。'
}

export async function getPresentationSnapshot(): Promise<PresentationSnapshot> {
  return invoke<PresentationSnapshot>('get_presentation_snapshot')
}

export async function prepareDesktopPresentation(
  file: File,
  totalPages: number,
  durationSeconds: number,
): Promise<PresentationSnapshot> {
  await invoke<PresentationSnapshot>('configure_presentation', {
    metadata: {
      totalPages,
      durationSeconds,
      fileName: file.name,
    },
  })

  const pdfBytes = new Uint8Array(await file.arrayBuffer())
  return invoke<PresentationSnapshot>('set_pdf_data', pdfBytes)
}

export async function getPresentationPdf(): Promise<ArrayBuffer> {
  const response = await invoke<ArrayBuffer | Uint8Array>('get_pdf_data')

  if (response instanceof Uint8Array) {
    return response.buffer.slice(
      response.byteOffset,
      response.byteOffset + response.byteLength,
    ) as ArrayBuffer
  }

  return response
}

export async function startDesktopPresentation(): Promise<PresentationSnapshot> {
  return invoke<PresentationSnapshot>('start_presentation')
}

export async function pauseDesktopPresentation(): Promise<PresentationSnapshot> {
  return invoke<PresentationSnapshot>('pause_presentation')
}

export async function resetDesktopPresentation(): Promise<PresentationSnapshot> {
  return invoke<PresentationSnapshot>('reset_presentation')
}

export async function goToDesktopPage(page: number): Promise<PresentationSnapshot> {
  return invoke<PresentationSnapshot>('go_to_page', { page })
}

export async function openAudienceWindow(): Promise<void> {
  return invoke<void>('open_audience_window')
}

export async function closeAudienceWindow(): Promise<void> {
  return invoke<void>('close_audience_window')
}

export function listenToPresentationState(
  onSnapshot: (snapshot: PresentationSnapshot) => void,
): Promise<UnlistenFn> {
  return listen<PresentationSnapshot>(presentationStateChangedEvent, (event) => {
    onSnapshot(event.payload)
  })
}
