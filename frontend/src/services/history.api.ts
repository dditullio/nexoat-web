import { http } from '@/services/http'
import type { PaginatedResult, ReadingHistoryEntry } from '@/types/reader-library'

export function getHistory(page = 1, pageSize = 20): Promise<PaginatedResult<ReadingHistoryEntry>> {
  return http<PaginatedResult<ReadingHistoryEntry>>(`/me/history?page=${page}&pageSize=${pageSize}`)
}

export function removeHistoryEntry(id: string): Promise<{ ok: true }> {
  return http<{ ok: true }>(`/me/history/${id}`, { method: 'DELETE' })
}

export function clearHistory(): Promise<{ ok: true }> {
  return http<{ ok: true }>('/me/history', { method: 'DELETE' })
}
