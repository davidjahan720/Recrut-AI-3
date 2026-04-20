import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Client, Job } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    if (!id) return
    supabase.from('clients').select('*').eq('id', id).single().then(({ data }) => setClient(data))
    supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false }).then(({ data }) => setJobs(data ?? []))
  }, [id])

  if (!client) return <div className="p-8 text-slate-500">Chargement...</div>

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-1">
        ← Retour
      </button>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">{client.name}</h1>
      <p className="text-slate-500 text-sm mb-6">{client.sector}</p>

      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-8 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Contact</p>
          <p className="font-medium">{client.contact_name}</p>
          <p className="text-sm text-slate-500">{client.contact_email}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Email notifications</p>
          <p className="text-sm text-slate-700">{client.notification_email}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-3">Offres ({jobs.length})</h2>
      <div className="space-y-2">
        {jobs.length === 0 && <p className="text-slate-400 text-sm">Aucune offre</p>}
        {jobs.map(job => (
          <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3 hover:border-slate-400 transition-colors">
            <div>
              <p className="font-medium text-sm">{job.title}</p>
              <p className="text-xs text-slate-500">{job.location} · {job.contract_type}</p>
            </div>
            <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
              {job.status === 'active' ? 'Active' : 'Clôturée'}
            </Badge>
          </Link>
        ))}
      </div>

      <Button className="mt-6" onClick={() => navigate('/jobs')}>
        Gérer les offres
      </Button>
    </div>
  )
}
