import type { TalkNotesByPage } from '../types'

const headingPattern = /^#\s+(\d+)\s*$/gm

export function parseTalkNotes(markdown: string): TalkNotesByPage {
  const notes: TalkNotesByPage = {}
  const headings = [...markdown.matchAll(headingPattern)]

  headings.forEach((heading, index) => {
    const page = Number(heading[1])
    const bodyStart = heading.index + heading[0].length
    const nextHeading = headings[index + 1]
    const bodyEnd = nextHeading ? nextHeading.index : markdown.length
    const body = markdown.slice(bodyStart, bodyEnd).trim()

    if (Number.isInteger(page) && page > 0) {
      notes[page] = body
    }
  })

  return notes
}
