import { http, httpBlob } from '@/services/http'
import type { BackupSummary, RestoreResult } from '@/types/admin'

export function listBackups(): Promise<BackupSummary[]> {
  return http<BackupSummary[]>('/admin/backups')
}

export function createBackup(comment?: string): Promise<BackupSummary> {
  return http<BackupSummary>('/admin/backups', {
    method: 'POST',
    body: { comment: comment?.trim() || undefined },
  })
}

/**
 * La descarga necesita el header `Authorization`, así que no puede ser un
 * link directo: se baja el zip como blob y se dispara un `<a>` temporal.
 */
export async function downloadBackup(filename: string): Promise<void> {
  const blob = await httpBlob(`/admin/backups/${encodeURIComponent(filename)}/download`)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function restoreBackup(filename: string): Promise<RestoreResult> {
  return http<RestoreResult>(`/admin/backups/${encodeURIComponent(filename)}/restore`, {
    method: 'POST',
  })
}

export function restoreBackupFromFile(file: File): Promise<RestoreResult> {
  const formData = new FormData()
  formData.append('file', file)
  return http<RestoreResult>('/admin/backups/restore-upload', {
    method: 'POST',
    body: formData,
  })
}
