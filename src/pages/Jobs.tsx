import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Client, Job } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

type JobForm = {
  client_id: string
  title: string
  location: string
  contract_type: string
  description: string
  score_threshold: number
  status: 'active' | 'closed'
}

const EMPTY: JobForm = {
  client_id: '', title: '', location: '', contract_type: 'CDI', description: '', score_threshold: 60, status: 'active',
}

export default function Jobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<(Job & { applications_count?: number })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<JobForm>({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [parsing, setParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [{ data: jobsData }, { data: clientsData }] = await Promise.all([
      supabase.from('jobs').select('*, clients(name), applications(id,score,status)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ])
    setJobs(jobsData ?? [])
    setClients((clientsData ?? []) as Client[])
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm({ ...EMPTY }); setEditId(null); setOpen(true) }
  function openEdit(j: Job) {
    setForm({ client_id: j.client_id, title: j.title, location: j.location, contract_type: j.contract_type, description: j.description, score_threshold: j.score_threshold, status: j.status })
    setEditId(j.id); setOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    if (editId) {
      await supabase.from('jobs').update(form).eq('id', editId)
    } else {
      await supabase.from('jobs').insert(form)
    }
    setLoading(false); setOpen(false); load()
  }

  async function handleParsePdf(file: File) {
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      const pdf_base64 = btoa(binary)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-job`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ pdf_base64 }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}: ${JSON.stringify(json)}`)
      if (json.error) throw new Error(json.error)

      const d = json.data

      // Cherche ou crée le client
      let clientId = ''
      if (d.company_name) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .ilike('name', d.company_name.trim())
          .maybeSingle()

        if (existing) {
          clientId = existing.id
        } else {
          const { data: created } = await supabase
            .from('clients')
            .insert({ name: d.company_name.trim(), contact_name: '', contact_email: '', notification_email: '', sector: '' })
            .select('id')
            .single()
          if (created) {
            clientId = created.id
            await load()
          }
        }
      }

      setForm(f => ({
        ...f,
        ...(clientId ? { client_id: clientId } : {}),
        title: d.title || f.title,
        location: d.location || f.location,
        contract_type: ['CDI','CDD','Alternance','Stage','Freelance'].includes(d.contract_type) ? d.contract_type : f.contract_type,
        description: d.description || f.description,
        score_threshold: Number(d.score_threshold) || f.score_threshold,
      }))
    } catch (e) {
      alert('Erreur lors de la lecture du PDF : ' + String(e))
    }
    setParsing(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette offre ?')) return
    await supabase.from('jobs').delete().eq('id', id)
    load()
  }

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Offres</h1>
          <p className="text-muted-foreground text-base">{jobs.length} offre{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>+ Nouvelle offre</Button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'closed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-card border border-border text-foreground hover:bg-muted'}`}>
            {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : 'Clôturées'}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Seuil</TableHead>
              <TableHead>Candidatures</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-36"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-base">Aucune offre</TableCell></TableRow>
            )}
            {filtered.map(j => {
              const apps = (j as Job & { applications?: { id: string; score: number | null; status: string }[] }).applications ?? []
              const total = apps.length
              const qualified = apps.filter(a => a.status === 'qualified').length
              const pending = apps.filter(a => a.status === 'pending').length
              const scores = apps.filter(a => a.score !== null).map(a => a.score as number)
              const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null
              return (
                <TableRow key={j.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/jobs/${j.id}`)}>
                  <TableCell className="font-semibold text-foreground">{j.title}</TableCell>
                  <TableCell className="text-slate-700 font-medium">{(j.clients as { name: string } | undefined)?.name}</TableCell>
                  <TableCell className="text-slate-700">{j.location}</TableCell>
                  <TableCell className="font-medium">{j.score_threshold}</TableCell>
                  <TableCell>
                    {total === 0 ? (
                      <span className="text-muted-foreground text-sm">Aucun CV</span>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-700">{total} CV</span>
                        {qualified > 0 && <span className="text-sm font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{qualified} qualifié{qualified > 1 ? 's' : ''}</span>}
                        {pending > 0 && <span className="text-sm font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{pending} en attente</span>}
                        {avgScore !== null && <span className="text-sm font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">moy. {avgScore}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={j.status === 'active' ? 'default' : 'secondary'}>
                      {j.status === 'active' ? 'Active' : 'Clôturée'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(j)}>Éditer</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(j.id)}>Suppr.</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier l\'offre' : 'Nouvelle offre'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {/* Import fiche de poste PDF */}
            <div className="border-2 border-dashed border-border rounded-lg p-3 flex items-center justify-between gap-3 bg-muted/30">
              <div>
                <p className="text-sm font-semibold text-foreground">Importer une fiche de poste PDF</p>
                <p className="text-xs text-muted-foreground">Les champs seront remplis automatiquement par IA</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleParsePdf(e.target.files[0]) }} />
              <Button type="button" size="sm" variant="outline" disabled={parsing} onClick={() => fileInputRef.current?.click()}>
                {parsing ? '⏳ Analyse...' : '📄 Choisir PDF'}
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v as string }))}>
                <SelectTrigger>
                  <span className="truncate">
                    {clients.find(c => c.id === form.client_id)?.name ?? 'Sélectionner un client'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Titre du poste</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Localisation</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Contrat</Label>
                <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v as string }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['CDI', 'CDD', 'Alternance', 'Stage', 'Freelance'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description du poste</Label>
              <Textarea rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Seuil de qualification (0–100)</Label>
                <Input type="number" min={0} max={100} value={form.score_threshold} onChange={e => setForm(f => ({ ...f, score_threshold: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as 'active' | 'closed' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Clôturée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
