import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUploads } from '@/contexts/UploadContext'

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

interface Props {
  jobId: string
  onUploaded: () => void
}

export function CvUploader({ jobId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const noJob = !jobId

  const { items, startUploads } = useUploads()
  const jobItems = items.filter(i => i.jobId === jobId)
  const activeCount = jobItems.filter(i => i.status === 'pending' || i.status === 'uploading' || i.status === 'scoring').length

  const isRecruiter = !!localStorage.getItem('recruiter_session')
  const uploaderName = localStorage.getItem('recruiter_session')

  function filterAccepted(files: FileList | File[]): File[] {
    return Array.from(files).filter(f => {
      if (isRecruiter && (
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.name.endsWith('.docx') || f.name.endsWith('.doc')
      )) return false
      return (
        f.type === 'application/pdf' ||
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.type === 'image/png' || f.type === 'image/jpeg' || f.type === 'image/webp' ||
        f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.doc') ||
        f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.webp') ||
        f.type === 'text/html' || f.name.endsWith('.html') || f.name.endsWith('.htm')
      )
    })
  }

  async function handleNoJobUpload(files: File[]) {
    setExtracting(true)
    try {
      for (const file of files) {
        const safeName = file.name
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
        const fileName = `inbox/${Date.now()}-${safeName}`
        const urlRes = await fetch('/api/get-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fileName }),
        })
        const urlJson = await urlRes.json()
        if (!urlRes.ok || urlJson?.error) continue
        const { error: uploadError } = await supabase.storage.from('cvs')
          .uploadToSignedUrl(urlJson.path, urlJson.token, file)
        if (uploadError) continue
        try { await invokeScoreCv('', fileName) } catch { /* noop */ }
      }
      onUploaded()
    } finally {
      setExtracting(false)
    }
  }

  function processFiles(files: FileList | File[]) {
    const accepted = filterAccepted(files)
    if (accepted.length === 0) return
    if (noJob) {
      handleNoJobUpload(accepted)
      return
    }
    startUploads(jobId, accepted, uploaderName)
    onUploaded()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const showProgress = extracting || activeCount > 0

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={showProgress ? -1 : 0}
        aria-disabled={showProgress}
        aria-label="Zone de dépôt de CV. Activez pour ouvrir le sélecteur de fichiers, ou déposez les fichiers ici."
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !showProgress && inputRef.current?.click()}
        onKeyDown={e => {
          if (showProgress) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600 focus-visible:outline-offset-2
          ${showProgress ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${dragging ? 'border-slate-700 bg-slate-100' : 'border-slate-400 hover:border-slate-600 bg-slate-50'}`}
      >
        {showProgress ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
            <div aria-hidden="true" className="w-6 h-6 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
            <p className="text-sm text-slate-900 font-medium">
              {noJob ? 'Extraction en cours…' : `${activeCount} CV en cours d'analyse`}
            </p>
            {!noJob && (
              <p className="text-xs text-slate-700">L'analyse continue même si vous changez de page.</p>
            )}
          </div>
        ) : (
          <>
            <p aria-hidden="true" className="text-2xl mb-2">📄</p>
            <p className="font-medium text-slate-800 text-sm">Déposer des CV ici ou cliquer pour sélectionner</p>
            <p className="text-xs text-slate-700 mt-1">{isRecruiter ? 'PDF, image (.png, .jpg, .webp) ou HTML — plusieurs fichiers acceptés' : 'PDF, Word, image (.png, .jpg) ou HTML — plusieurs fichiers acceptés'}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={isRecruiter ? '.pdf,.png,.jpg,.jpeg,.webp,.html,.htm' : '.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.html,.htm'}
          multiple
          aria-label="Sélectionner des CV à téléverser"
          className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {jobItems.length > 0 && (
        <ul aria-live="polite" aria-label="Statut des CV téléversés" className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto list-none p-0">
          {jobItems.map(it => {
            const statusLabel = it.status === 'pending' ? 'En attente'
              : it.status === 'uploading' ? 'Téléversement'
              : it.status === 'scoring' ? 'Analyse en cours'
              : it.status === 'done' ? 'Reçu'
              : 'Erreur'
            const statusIcon = it.status === 'pending' ? '⏳'
              : it.status === 'uploading' ? '⬆️'
              : it.status === 'scoring' ? '🤖'
              : it.status === 'done' ? '✅'
              : '⚠️'
            return (
              <li key={it.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-slate-800 truncate min-w-0 flex-1">{it.fileName}</span>
                  <span
                    aria-label={`${statusLabel} : ${it.fileName}`}
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      it.status === 'error' ? 'bg-red-100 text-red-800'
                      : it.status === 'done' ? 'bg-green-100 text-green-900'
                      : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <span aria-hidden="true">{statusIcon} </span>{statusLabel}
                  </span>
                </div>
                {it.status === 'error' && it.errorMessage && (
                  <p role="alert" className="text-xs text-red-700 mt-1 break-words">{it.errorMessage}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
