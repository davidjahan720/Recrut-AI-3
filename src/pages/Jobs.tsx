import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { rpcWithRetry } from '@/lib/rpc'
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
  company_name: string
  title: string
  location: string
  contract_type: string
  description: string
  score_threshold: number
  status: 'active' | 'closed'
}

const EMPTY: JobForm = {
  client_id: '', company_name: '', title: '', location: '', contract_type: 'CDI', description: '', score_threshold: 60, status: 'active',
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
  const [parseError, setParseError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [showClientForm, setShowClientForm] = useState(false)
  const [clientForm, setClientForm] = useState({ contact_name: '', contact_email: '', notification_email: '' })
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
    const clientName = (j.clients as { name: string } | undefined)?.name ?? ''
    setForm({ client_id: j.client_id, company_name: clientName, title: j.title, location: j.location, contract_type: j.contract_type, description: j.description, score_threshold: j.score_threshold, status: j.status })
    setEditId(j.id); setOpen(true)
  }

  async function handleSave() {
    setSaveError('')
    setLoading(true)
    try {
      let clientId = form.client_id
      if (!clientId && form.company_name.trim()) {
        const name = form.company_name.trim()
        const { data: existing } = await supabase.from('clients').select('id').ilike('name', name).maybeSingle()
        if (existing) {
          clientId = existing.id
        } else {
          clientId = await rpcWithRetry<string>('upsert_client', {
            p_name: name,
            p_contact_name: clientForm.contact_name,
            p_contact_email: clientForm.contact_email,
            p_notification_email: clientForm.notification_email,
            p_sector: '',
          })
          await load()
        }
      }
      if (!clientId) throw new Error('Veuillez renseigner un nom d\'entreprise ou sélectionner un client.')
      const { company_name: _cn, ...jobData } = { ...form, client_id: clientId }
      if (editId) {
        const { error } = await supabase.from('jobs').update(jobData).eq('id', editId)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from('jobs').insert(jobData)
        if (error) throw new Error(error.message)
      }
      setOpen(false); load()
    } catch (e) {
      setSaveError(String(e))
    }
    setLoading(false)
  }

  async function handleParsePdf(file: File) {
    setParsing(true)
    setParseError('')
    try {
      const pdf_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_base64 }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      const json = await res.json()
      if (json?.error) throw new Error(json.error)
      const d = json?.data
      if (!d) throw new Error('Réponse vide du serveur')

      setForm(f => ({
        ...f,
        company_name: d.company_name || f.company_name,
        title: d.title || f.title,
        location: d.location || f.location,
        contract_type: ['CDI','CDD','Alternance','Stage','Freelance'].includes(d.contract_type) ? d.contract_type : f.contract_type,
        description: d.description || f.description,
        score_threshold: Number(d.score_threshold) || f.score_threshold,
      }))
    } catch (e) {
      setParseError('Erreur : ' + String(e))
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
              <TableHead className="w-36">Client</TableHead>
              <TableHead className="w-28">Localisation</TableHead>
              <TableHead className="w-16">Seuil</TableHead>
              <TableHead className="w-48">Candidatures</TableHead>
              <TableHead className="w-24">Statut</TableHead>
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
                  <TableCell className="font-semibold text-foreground truncate max-w-0">{j.title}</TableCell>
                  <TableCell className="text-muted-foreground font-medium truncate max-w-[144px]">{(j.clients as { name: string } | undefined)?.name}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[112px]">{j.location}</TableCell>
                  <TableCell className="font-medium">{j.score_threshold}</TableCell>
                  <TableCell>
                    {total === 0 ? (
                      <span className="text-muted-foreground text-sm">Aucun CV</span>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground">{total} CV</span>
                        {qualified > 0 && <span className="text-xs font-semibold bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">{qualified} ✓</span>}
                        {pending > 0 && <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">{pending} ⏳</span>}
                        {avgScore !== null && <span className="text-xs font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">~{avgScore}</span>}
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
            {parseError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{parseError}</p>}
            <div className="space-y-1">
              <Label>Nom de l'entreprise</Label>
              <Input
                placeholder="Ex : Acme Corp (extrait du PDF ou saisie manuelle)"
                value={form.company_name}
                onChange={e => { setForm(f => ({ ...f, company_name: e.target.value, client_id: '' })); setShowClientForm(false) }}
              />
              {(() => {
                const matched = form.company_name && clients.find(c => c.name.toLowerCase() === form.company_name.toLowerCase())
                const isNew = form.company_name.trim() && !form.client_id && !matched
                return matched
                  ? <p className="text-xs text-green-600 mt-1">✓ Client existant trouvé</p>
                  : isNew
                    ? <button type="button" className="text-xs text-blue-600 underline mt-1" onClick={() => setShowClientForm(v => !v)}>
                        {showClientForm ? 'Masquer' : '+ Renseigner les coordonnées du client'}
                      </button>
                    : null
              })()}
            </div>
            {showClientForm && (
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fiche client</p>
                <div className="space-y-1">
                  <Label className="text-sm">Nom du contact</Label>
                  <Input placeholder="Jean Dupont" value={clientForm.contact_name} onChange={e => setClientForm(f => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Email contact</Label>
                  <Input type="email" placeholder="contact@entreprise.com" value={clientForm.contact_email} onChange={e => setClientForm(f => ({ ...f, contact_email: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Email notifications CV qualifiés</Label>
                  <Input type="email" placeholder="recrutement@entreprise.com" value={clientForm.notification_email} onChange={e => setClientForm(f => ({ ...f, notification_email: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Client existant (optionnel)</Label>
              <Select value={form.client_id} onValueChange={v => { setForm(f => ({ ...f, client_id: v ?? '', company_name: clients.find(c => c.id === v)?.name ?? f.company_name })); setShowClientForm(false) }}>
                <SelectTrigger>
                  <span className="truncate">
                    {clients.find(c => c.id === form.client_id)?.name ?? 'Sélectionner ou laisser vide'}
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
          {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mx-1">{saveError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
