'use server'

import * as Sentry from '@sentry/nextjs'

export type SheetFetchResult =
  | { ok: true; csv: string; sheetId: string; gid: number }
  | { ok: false; error: string }

// Pulls the sheet/tab id out of a Google Sheets URL.
// Accepts standard edit/view URLs like:
//   https://docs.google.com/spreadsheets/d/<ID>/edit#gid=<GID>
//   https://docs.google.com/spreadsheets/d/<ID>/edit?gid=<GID>
//   https://docs.google.com/spreadsheets/d/<ID>/edit
// Falls back to gid=0 when the tab id is not present.
function parseSheetUrl(raw: string): { sheetId: string; gid: number } | null {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.hostname !== 'docs.google.com') return null
  const idMatch = parsed.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!idMatch) return null
  const sheetId = idMatch[1]

  // gid can live in either the query (?gid=) or the fragment (#gid=).
  let gid = 0
  const fromQuery = parsed.searchParams.get('gid')
  if (fromQuery !== null) {
    const n = Number(fromQuery)
    if (Number.isInteger(n) && n >= 0) gid = n
  } else if (parsed.hash) {
    const m = parsed.hash.match(/(?:^|&)gid=(\d+)/)
    if (m) gid = Number(m[1])
  }
  return { sheetId, gid }
}

export async function fetchGoogleSheet(input: { url: string; gid?: number }): Promise<SheetFetchResult> {
  const trimmed = (input.url ?? '').trim()
  if (!trimmed) return { ok: false, error: 'Paste a Google Sheets URL.' }
  const parsed = parseSheetUrl(trimmed)
  if (!parsed) return { ok: false, error: 'That doesn’t look like a Google Sheets URL.' }
  const gid = Number.isInteger(input.gid) ? (input.gid as number) : parsed.gid
  if (!Number.isInteger(gid) || gid < 0) return { ok: false, error: 'Invalid tab id.' }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${parsed.sheetId}/export?format=csv&gid=${gid}`

  try {
    const res = await fetch(exportUrl, { method: 'GET', redirect: 'follow', cache: 'no-store' })
    if (!res.ok) {
      if (res.status === 404) {
        return { ok: false, error: 'Sheet or tab not found. Check the URL and the tab id.' }
      }
      return { ok: false, error: `Could not fetch the sheet (status ${res.status}). Make sure sharing is set to "Anyone with the link can view".` }
    }
    const text = await res.text()
    // When the sheet is private, Google returns an HTML login page rather than CSV.
    const trimmedText = text.trimStart().toLowerCase()
    if (trimmedText.startsWith('<!doctype') || trimmedText.startsWith('<html')) {
      return { ok: false, error: 'The sheet appears to be private. Set sharing to "Anyone with the link can view" and try again.' }
    }
    return { ok: true, csv: text, sheetId: parsed.sheetId, gid }
  } catch (error) {
    Sentry.captureException(error)
    return { ok: false, error: 'Failed to reach Google Sheets. Check the URL and try again.' }
  }
}