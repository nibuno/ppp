import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  emptyPresentationSnapshot,
  closeAudienceWindow,
  getPresentationSnapshot,
  goToDesktopPage,
  listenToPresentationState,
  mergePresentationSnapshot,
  openAudienceWindow,
  pauseDesktopPresentation,
  prepareDesktopPresentation,
  presentationPdfQueryKey,
  presentationQueryKey,
  resetDesktopPresentation,
  startDesktopPresentation,
  type PresentationSnapshot,
} from '../desktop/presentation'

export function useDesktopPresentation() {
  const queryClient = useQueryClient()
  const snapshotQuery = useQuery({
    queryKey: presentationQueryKey,
    queryFn: getPresentationSnapshot,
    initialData: emptyPresentationSnapshot,
    refetchInterval: (query) =>
      query.state.data?.timerStatus === 'running' ? 250 : false,
  })

  useEffect(() => {
    const unlistenPromise = listenToPresentationState((incoming) => {
      queryClient.setQueryData<PresentationSnapshot>(
        presentationQueryKey,
        (current) => mergePresentationSnapshot(current, incoming),
      )
    })

    return () => {
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [queryClient])

  const commit = (snapshot: PresentationSnapshot) => {
    queryClient.setQueryData<PresentationSnapshot>(
      presentationQueryKey,
      (current) => mergePresentationSnapshot(current, snapshot),
    )
    return snapshot
  }

  const prepare = async (
    file: File,
    totalPages: number,
    durationSeconds: number,
  ) => {
    const snapshot = await prepareDesktopPresentation(
      file,
      totalPages,
      durationSeconds,
    )
    queryClient.removeQueries({ queryKey: presentationPdfQueryKey })
    return commit(snapshot)
  }

  return {
    snapshot: snapshotQuery.data,
    prepare,
    start: async () => commit(await startDesktopPresentation()),
    pause: async () => commit(await pauseDesktopPresentation()),
    reset: async () => commit(await resetDesktopPresentation()),
    goToPage: async (page: number) => commit(await goToDesktopPage(page)),
    openAudience: openAudienceWindow,
    closeAudience: closeAudienceWindow,
  }
}
