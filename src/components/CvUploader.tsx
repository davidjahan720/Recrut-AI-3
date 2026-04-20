import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  jobId: string
  onUploaded: () => void
}

interface Result {
  name: string
  score: number | null
  status: string
}

export function CvUploader({ jobId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<Result[]>([])

  async function processFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter(f =>
      f.type === 'application/pdf' ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      f.type === 'image/png' || f.type === 'image/jpeg' || f.type === 'image/webp' ||
      f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.doc') ||
      f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.webp')
    )
    if (accepted.length === 0) return

    setProcessing(true)
    setResults([])

    const { data: { session } } = await supabase.auth.getSession()
    const newResults: Result[] = []

    for (const file of accepted) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
      const fileName = `${jobId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`

      const { error: uploadError } = await supabase.storage.from('cvs').upload(fileName, file)
      if (uploadError) {
        newResults.push({ name: file.name, score: null, status: 'error' })
        continue
      }

      const { data: fnData } = await supabase.functions.invoke('score-cv', {
        body: { job_id: jobId, cv_file_path: fileName },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      newResults.push({
        name: file.name,
        score: null,
        status: fnData?.error ? 'error' : 'done',
      })
    }

    setResults(newResults)
    setProcessing(false)
    onUploaded()
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
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${processing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${dragging ? 'border-slate-600 bg-slate-100' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
      >
        {processing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Analyse en cours...</p>
          </div>
        ) : (
          <>
            <p className="text-2xl mb-2">📄</p>
            <p className="font-medium text-slate-700 text-sm">Déposer des CV ici ou cliquer pour sélectionner</p>
            <p className="text-xs text-slate-400 mt-1">PDF, Word (.docx) ou image (.png, .jpg) — plusieurs fichiers acceptés</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
          multiple
          className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-slate-700 truncate max-w-xs">{r.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                  {r.status === 'error' ? '⚠️ Erreur' : '✅ Reçu'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
