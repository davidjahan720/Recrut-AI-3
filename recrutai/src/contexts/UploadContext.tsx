import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function invokeScoreCv(jobId: string, cvPath: string) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/score-cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
    body: JSON.stringify({ job_id: jobId, cv_file_path: cvPath }),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`)
  const json = JSON.parse(text)
  if (json?.error) throw new Error(json.error)
  return json
}

export type UploadStatus = 'pending' | 'uploading' | 'scoring' | 'done' | 'error'

export interface UploadItem {
  id: string
  fileName: string
  jobId: string
  status: UploadStatus
  errorMessage?: string
}

interface CtxValue {
  items: UploadItem[]
  startUploads: (jobId: string, files: File[], uploaderName: string | null) => void
  clearForJob: (jobId: string) => void
  dismiss: () => void
  hasActive: boolean
}

const Ctx = createContext<CtxValue | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([])
  const queueRef = useRef<Promise<void>>(Promise.resolve())

  function update(id: string, patch: Partial<UploadItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  async function processItem(item: UploadItem, file: File, uploaderName: string | null) {
    try {
      update(item.id, { status: 'uploading' })
      const safeName = file.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${item.jobId}/${Date.now()}-${safeName}`

      const urlRes = await fetch('/api/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fileName }),
      })
      const urlJson = await urlRes.json()
      if (!urlRes.ok || urlJson?.error) throw new Error(urlJson?.error ?? `HTTP ${urlRes.status}`)

      const { error: uploadError } = await supabase.storage.from('cvs')
        .uploadToSignedUrl(urlJson.path, urlJson.token, file)
      if (uploadError) throw new Error(uploadError.message)

      update(item.id, { status: 'scoring' })
      await invokeScoreCv(item.jobId, fileName)

      if (uploaderName) {
        await fetch('/api/set-uploaded-by', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cv_file_path: fileName, job_id: item.jobId, uploaded_by: uploaderName }),
        })
      }

      update(item.id, { status: 'done' })
      window.dispatchEvent(new CustomEvent('cv-upload-complete', { detail: { jobId: item.jobId } }))
    } catch (e) {
      update(item.id, { status: 'error', errorMessage: e instanceof Error ? e.message : String(e) })
      window.dispatchEvent(new CustomEvent('cv-upload-complete', { detail: { jobId: item.jobId } }))
    }
  }

  function startUploads(jobId: string, files: File[], uploaderName: string | null) {
    if (files.length === 0) return
    const newItems: UploadItem[] = files.map((f, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: f.name,
      jobId,
      status: 'pending',
    }))
    setItems(prev => [...prev, ...newItems])

    queueRef.current = queueRef.current.then(async () => {
      for (let i = 0; i < newItems.length; i++) {
        await processItem(newItems[i], files[i], uploaderName)
      }
    })
  }

  function clearForJob(jobId: string) {
    setItems(prev => prev.filter(i => i.jobId !== jobId || i.status === 'pending' || i.status === 'uploading' || i.status === 'scoring'))
  }

  function dismiss() {
    setItems(prev => prev.filter(i => i.status === 'pending' || i.status === 'uploading' || i.status === 'scoring'))
  }

  const hasActive = items.some(i => i.status === 'pending' || i.status === 'uploading' || i.status === 'scoring')

  return <Ctx.Provider value={{ items, startUploads, clearForJob, dismiss, hasActive }}>{children}</Ctx.Provider>
}

export function useUploads() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUploads must be used within UploadProvider')
  return ctx
}
