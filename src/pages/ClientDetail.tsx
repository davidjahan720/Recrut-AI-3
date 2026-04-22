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

  if (!client) return <div className="p-8 text-foreground">Chargement...</div>

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-base font-medium text-foreground hover:text-primary mb-4 flex items-center gap-1">
        ← Retour
      </button>
      <h1 className="text-2xl font-semibold text-foreground mb-1">{client.name}</h1>
      <p className="text-foreground text-base font-medium mb-6">{client.sector}</p>

      <div className="bg-card rounded-lg border border-border p-5 mb-8 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-1">Contact</p>
          <p className="text-base font-semibold text-foreground">{client.contact_name}</p>
          <p className="text-base text-foreground">{client.contact_email}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-1">Email notifications</p>
          <p className="text-base text-foreground">{client.notification_email}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-3">Offres ({jobs.length})</h2>
      <div className="space-y-2">
        {jobs.length === 0 && <p className="text-foreground text-base">Aucune offre</p>}
        {jobs.map(job => (
          <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between bg-card rounded-lg border border-border px-4 py-3 hover:border-primary transition-colors">
            <div>
              <p className="font-semibold text-base text-foreground">{job.title}</p>
              <p className="text-sm text-foreground">{job.location} · {job.contract_type}</p>
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
