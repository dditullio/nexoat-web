import { http, toQueryString } from '@/services/http'
import type { AuditLogEntry, Paginated } from '@/types/admin'

export interface AuditLogsQuery {
  actorId?: string
  entityType?: string
  page?: number
  pageSize?: number
}

export function listAuditLogs(query: AuditLogsQuery = {}) {
  return http<Paginated<AuditLogEntry>>(`/admin/audit-logs${toQueryString(query)}`)
}
