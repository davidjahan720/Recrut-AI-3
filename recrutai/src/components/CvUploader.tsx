import { useRef, useState } from 'react'
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


interface Props {
  jobId: string
  onUploaded: () => void
}

interface Result {
  name: string
  score: number | null
  status: string
  errorMessage?: string | null
}

interface Progress {
  current: number
  total: number
  remainingSec: number | null
}

function fmtSec(s: number) {
  if (s < 60) return `~${s}s`
  return `~${Math.ceil(s / 60)}min`
}

export function CvUploader({ jobId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const noJob = !jobId

  const isRecruiter = !!localStorage.getItem('recruiter_session')
  const uploaderName = localStorage.getItem('recruiter_session') || localStorage.getItem('am_session') || localStorage.getItem('manager_session')

  async function processFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter(f => {
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
    if (accepted.length === 0) return

    setProcessing(true)
    setResults([])
    setProgress({ current: 0, total: accepted.length, remainingSec: null })

    const newResults: Result[] = []
    const durations: number[] = []

    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i]
      const t0 = Date.now()

      const CV_ESTIMATED_S = 15
      setProgress({ current: i + 1, total: accepted.length, remainingSec: durations.length > 0
        ? Math.round((durations.reduce((a, b) => a + b) / durations.length) * (accepted.length - i) / 1000)
        : CV_ESTIMATED_S * (accepted.length - i)
      })

      const safeName = file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
      const folder = jobId || 'inbox'
      const fileName = `${folder}/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage.from('cvs').upload(fileName, file)
      if (uploadError) {
        newResults.push({ name: file.name, score: null, status: 'error', errorMessage: uploadError.message })
        durations.push(Date.now() - t0)
        continue
      }

      let errMsg: string | null = null
      try {
        await invokeScoreCv(jobId, fileName)
      } catch (e) {
        errMsg = String(e)
      }

      if (!errMsg && uploaderName) {
        await fetch('/api/set-uploaded-by', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cv_file_path: fileName, job_id: jobId, uploaded_by: uploaderName }),
        })
      }

      newResults.push({
        name: file.name,
        score: null,
        status: errMsg ? 'error' : 'done',
        errorMessage: errMsg,
      })

      durations.push(Date.now() - t0)
    }

    setResults(newResults)
    setProgress(null)
    setProcessing(false)
    const hasError = newResults.some(r => r.status === 'error')
    if (!hasError) onUploaded()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !processing && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors
          ${processing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${dragging ? 'border-slate-600 bg-slate-100' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
      >
        {processing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
            {progress && (
              <p className="text-base font-semibold text-slate-700">
                {progress.current}/{progress.total}
              </p>
            )}
            <p className="text-sm text-slate-900 font-medium">
              {noJob ? 'Extraction en cours...' : 'Analyse en cours...'}
              {progress?.remainingSec != null && ` · ${fmtSec(progress.remainingSec)} restantes`}
            </p>
            {progress && progress.total > 1 && (
              <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-600 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-2xl mb-2">📄</p>
            <p className="font-medium text-slate-700 text-sm">Déposer des CV ici ou cliquer pour sélectionner</p>
            <p className="text-xs text-slate-500 mt-1">{isRecruiter ? 'PDF, image (.png, .jpg, .webp) ou HTML — plusieurs fichiers acceptés' : 'PDF, Word, image (.png, .jpg) ou HTML — plusieurs fichiers acceptés'}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={isRecruiter ? '.pdf,.png,.jpg,.jpeg,.webp,.html,.htm' : '.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.html,.htm'}
          multiple
          className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {results.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
              <span className="text-sm text-slate-700 truncate min-w-0 flex-1">{r.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${r.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                {r.status === 'error' ? '⚠️ Erreur' : '✅ Reçu'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
