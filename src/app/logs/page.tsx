'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GenerationLog } from '@/types'
import { ArrowLeft, Activity, CheckCircle2, XCircle, Clock } from 'lucide-react'

export default function LogsPage() {
  const [logs, setLogs] = useState<GenerationLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('generation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching logs:', error)
      } else {
        setLogs((data as GenerationLog[]) || [])
      }
      setLoading(false)
    }
    fetchLogs()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-lg font-bold tracking-tight">
              Social<span className="text-accent">Forge</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-accent" />
            <span className="font-mono text-[10px] text-muted tracking-wider uppercase px-2 py-0.5 border border-border">
              Generation Logs
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Generation Logs</h1>
          <p className="text-sm text-muted mt-1">
            AI Agent call history and performance metrics.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card h-12 shimmer" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Activity size={32} className="text-muted/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No logs yet</h3>
            <p className="text-sm text-muted">
              Generate some content to see API logs here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="font-label text-muted text-left px-3 py-3">
                    Date
                  </th>
                  <th className="font-label text-muted text-left px-3 py-3">
                    Prompt
                  </th>
                  <th className="font-label text-muted text-right px-3 py-3">
                    Latency
                  </th>
                  <th className="font-label text-muted text-center px-3 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/50 hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 text-sm font-mono text-muted whitespace-nowrap">
                        <Clock size={12} />
                        {new Date(log.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-foreground/80 max-w-md truncate">
                        {log.prompt}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={`font-mono text-sm ${
                          log.latency_ms < 3000
                            ? 'text-accent'
                            : log.latency_ms < 8000
                            ? 'text-amber'
                            : 'text-danger'
                        }`}
                      >
                        {(log.latency_ms / 1000).toFixed(1)}s
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-accent">
                          <CheckCircle2 size={12} />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-danger">
                          <XCircle size={12} />
                          FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
