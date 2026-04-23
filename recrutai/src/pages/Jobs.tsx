import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getAmSession, getAmBaseClientNames, getAmExtraClientIds, addAmClientId } from '@/lib/sessionRole'
import type { Client, Job } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

function generateRefCode(): string {
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const D = '0123456789'
  return L[Math.floor(Math.random() * 26)] + L[Math.floor(Math.random() * 26)] + D[Math.floor(Math.random() * 10)] + D[Math.floor(Math.random() * 10)]
}

type JobForm = {
  client_id: string
  company_name: string
  title: string
  location: string
  contract_type: string
  description: string
  score_threshold: number
  status: 'active' | 'inactive' | 'closed'
  honoraires: string
}

const EMPTY: JobForm = {
  client_id: '', company_name: '', title: '', location: '', contract_type: 'CDI', description: '', score_threshold: 60, status: 'active', honoraires: '8500',
}

export default function Jobs() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<(Job & { applications_count?: number })[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<JobForm>({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'closed'>('all')
  const [parsing, setParsing] = useState(false)
  const [parseElapsed, setParseElapsed] = useState(0)
  const [parseError, setParseError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [showClientForm, setShowClientForm] = useState(false)
  const [clientForm, setClientForm] = useState({ contact_name: '', contact_email: '', notification_email: '', sector: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const PARSE_ESTIMATED_S = 15

  useEffect(() => {
    if (!parsing) { setParseElapsed(0); return }
    const start = Date.now()
    const id = setInterval(() => setParseElapsed(Math.floor((Date.now() - start) / 1000)), 500)
    return () => clearInterval(id)
  }, [parsing])

  function parseCountdown() {
    const remaining = Math.max(0, PARSE_ESTIMATED_S - parseElapsed)
    return remaining > 0 ? `⏳ ~${remaining}s restantes` : '⏳ Finalisation...'
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    setSelectedIds(prev => filtered.every(j => prev.has(j.id)) ? new Set() : new Set(filtered.map(j => j.id)))
  }
  async function handleDeleteSelected() {
    if (!confirm(`Supprimer les ${selectedIds.size} offre${selectedIds.size > 1 ? 's' : ''} sélectionnées ?`)) return
    await fetch('/api/delete-job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedIds] }) })
    setSelectedIds(new Set()); load()
  }

  async function load() {
    const [{ data: jobsData }, { data: clientsData }] = await Promise.all([
      supabase.from('jobs').select('*, clients(name), applications(id,score,status)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name, sector').order('name'),
    ])
    setJobs(jobsData ?? [])
    setClients((clientsData ?? []) as Client[])
  }

  useEffect(() => { load() }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setForm({ ...EMPTY }); setEditId(null); setOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [])

  function openCreate() { setForm({ ...EMPTY }); setEditId(null); setSaveError(''); setParseError(''); setOpen(true) }
  function openEdit(j: Job) {
    const clientName = (j.clients as { name: string } | undefined)?.name ?? ''
    setForm({ client_id: j.client_id, company_name: clientName, title: j.title, location: j.location, contract_type: j.contract_type, description: j.description, score_threshold: j.score_threshold, status: j.status, honoraires: j.honoraires != null ? String(j.honoraires) : '' })
    setEditId(j.id); setSaveError(''); setParseError(''); setOpen(true)
  }


  async function handleSave() {
    setSaveError('')
    setLoading(true)
    try {
      let clientId = form.client_id
      let clientIsNew = false
      if (!clientId && form.company_name.trim()) {
        const name = form.company_name.trim()
        const { data: existing } = await supabase.from('clients').select('id, contact_name, contact_email, notification_email, sector').ilike('name', name).maybeSingle()
        if (existing) {
          clientId = existing.id
          if (clientForm.sector.trim()) {
            await fetch('/api/upsert-client', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                p_id: existing.id,
                p_name: name,
                p_contact_name: clientForm.contact_name || (existing as { contact_name?: string }).contact_name || '',
                p_contact_email: clientForm.contact_email || (existing as { contact_email?: string }).contact_email || '',
                p_notification_email: clientForm.notification_email || clientForm.contact_email || (existing as { notification_email?: string }).notification_email || '',
                p_sector: clientForm.sector,
              }),
            })
            await load()
          }
        } else {
          const postedBy = localStorage.getItem('am_session') || localStorage.getItem('manager_session') || null
          const res = await fetch('/api/upsert-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              p_name: name,
              p_contact_name: clientForm.contact_name,
              p_contact_email: clientForm.contact_email,
              p_notification_email: clientForm.notification_email || clientForm.contact_email || 'notifications@recrutai.fr',
              p_sector: clientForm.sector,
              ...(postedBy ? { p_added_by: postedBy } : {}),
            }),
          })
          const json = await res.json()
          if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`)
          clientId = json.data as string
          clientIsNew = true
          await load()
        }
      }
      if (!clientId) throw new Error("Veuillez renseigner un nom d'entreprise ou sélectionner un client.")
      const { company_name: _cn, honoraires: hon, ...jobData } = { ...form, client_id: clientId }
      const jobPayload = {
        ...jobData,
        honoraires: hon !== '' ? parseFloat(hon) : null,
      }
      if (editId) {
        const res = await fetch('/api/upsert-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...jobPayload }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`)
        setOpen(false); load()
      } else {
        const postedBy = localStorage.getItem('am_session') || localStorage.getItem('manager_session') || localStorage.getItem('recruiter_session')
        const res = await fetch('/api/upsert-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...jobPayload, ref_code: generateRefCode(), posted_by: postedBy }),
        })
        const json = await res.json()
        if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`)
        if (clientIsNew) addAmClientId(clientId)
        setOpen(false)
        navigate(`/jobs/${json.data.id}`)
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
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
      if (d.contact_name || d.contact_email || d.notification_email || d.sector) {
        setClientForm(f => ({
          contact_name: d.contact_name || f.contact_name,
          contact_email: d.contact_email || f.contact_email,
          notification_email: d.notification_email || d.contact_email || f.notification_email,
          sector: d.sector || f.sector,
        }))
        setShowClientForm(true)
      }
    } catch (e) {
      setParseError('Erreur : ' + String(e))
    }
    setParsing(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette offre ?')) return
    await fetch('/api/delete-job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) })
    load()
  }

  const amSession = getAmSession()
  const amBaseNames = getAmBaseClientNames()
  const amExtraIds = getAmExtraClientIds()
  const recruiterSession = localStorage.getItem('recruiter_session')

  const myJobs = (() => {
    if (amSession) {
      return jobs.filter(j => {
        const name = (j.clients as { name: string } | undefined)?.name ?? ''
        return amBaseNames.some(c => c.toLowerCase() === name.toLowerCase())
            || amExtraIds.includes(j.client_id)
      })
    }
    return jobs
  })()
  const filtered = filter === 'all' ? myJobs : myJobs.filter(j => j.status === filter)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Offres</h1>
          <p className="text-muted-foreground text-base">{myJobs.length} offre{myJobs.length !== 1 ? 's' : ''}{amSession ? ' (mes offres)' : ''}</p>
        </div>
        {!recruiterSession && <Button onClick={openCreate}>+ Nouvelle offre</Button>}
      </div>


      {!recruiterSession && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2 bg-muted rounded-lg border border-border">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}</span>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>Supprimer</Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelectedIds(new Set())}>Annuler</Button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'inactive', 'closed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-card border border-border text-foreground hover:bg-muted'}`}>
            {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : f === 'inactive' ? 'En pause' : 'Clôturées'}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {!recruiterSession && (
                <TableHead className="w-8">
                  {selectedIds.size >= 2 && (
                    <input type="checkbox" checked={filtered.every(j => selectedIds.has(j.id))} onChange={toggleSelectAll}
                      className="w-4 h-4 accent-violet-600 cursor-pointer" />
                  )}
                </TableHead>
              )}
              <TableHead className="w-16">Réf.</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="w-28">Localisation</TableHead>
              <TableHead className="w-16">Seuil</TableHead>
              <TableHead className="w-52">Candidatures</TableHead>
              <TableHead className="w-24">Statut</TableHead>
              <TableHead className="w-40">Postée par</TableHead>
              {!recruiterSession && <TableHead className="w-36"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-base">Aucune offre</TableCell></TableRow>
            )}
            {filtered.map(j => {
              const apps = (j as Job & { applications?: { id: string; score: number | null; status: string }[] }).applications ?? []
              const total = apps.length
              const qualifiedCount = apps.filter(a => a.status === 'qualified').length
              const days = Math.max(1, Math.floor((Date.now() - new Date(j.created_at).getTime()) / 86_400_000))
              return (
                <TableRow key={j.id} className={`cursor-pointer hover:bg-muted/30 ${selectedIds.has(j.id) ? 'bg-violet-50 dark:bg-violet-950/20' : ''}`} onClick={() => navigate(`/jobs/${j.id}`)}>
                  {!recruiterSession && (
                    <TableCell className="pr-0" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(j.id)} onChange={() => toggleSelect(j.id)}
                        className="w-4 h-4 accent-violet-600 cursor-pointer" />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{j.ref_code ?? '—'}</TableCell>
                  <TableCell className="font-semibold text-foreground">{j.title}</TableCell>
                  <TableCell className="text-muted-foreground font-medium">{(j.clients as { name: string } | undefined)?.name}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[112px]">{j.location}</TableCell>
                  <TableCell className="font-medium">{j.score_threshold}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                        <span className="text-slate-600">CV</span> {total}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${qualifiedCount > 0 ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-600'}`}>
                        <span>✓</span> {qualifiedCount}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                        {days}j
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={j.status === 'active' ? 'default' : j.status === 'inactive' ? 'outline' : 'secondary'}
                      className={j.status === 'inactive' ? 'border-amber-400 text-amber-700 bg-amber-50' : ''}>
                      {j.status === 'active' ? 'Active' : j.status === 'inactive' ? 'En pause' : 'Clôturée'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {j.posted_by && <p className="font-medium text-foreground">{j.posted_by}</p>}
                      <p className="text-muted-foreground">{new Date(j.created_at).toLocaleDateString('fr-FR')} {new Date(j.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </TableCell>
                  {!recruiterSession && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(j)}>Éditer</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(j.id)}>Suppr.</Button>
                      </div>
                    </TableCell>
                  )}
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
                {parsing ? parseCountdown() : '📄 Choisir PDF'}
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Nom de l'entreprise</Label>
              <Input
                placeholder="Ex : Acme Corp (extrait du PDF ou saisie manuelle)"
                value={form.company_name}
                onChange={e => {
                  const name = e.target.value
                  setForm(f => ({ ...f, company_name: name, client_id: '' }))
                  setShowClientForm(false)
                  const matched = clients.find(c => c.name.toLowerCase() === name.toLowerCase())
                  if (matched) setClientForm(f => ({ ...f, sector: (matched as Client & { sector?: string }).sector ?? '' }))
                }}
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
            <div className="space-y-1">
              <Label>Secteur d'activité</Label>
              <Input placeholder="Ex : Industrie, Tech, BTP..." value={clientForm.sector} onChange={e => setClientForm(f => ({ ...f, sector: e.target.value }))} />
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
            {!amSession && (
              <div className="space-y-1">
                <Label>Description du poste</Label>
                <Textarea rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            )}
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
                    <SelectItem value="inactive">En pause</SelectItem>
                    <SelectItem value="closed">Clôturée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Honoraires (€)</Label>
              <Input type="number" min={0} placeholder="Ex : 8500" value={form.honoraires} onChange={e => setForm(f => ({ ...f, honoraires: e.target.value }))} />
            </div>
          </div>
          {parseError && (
            <div className="mt-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {parseError}
            </div>
          )}
          {saveError && (
            <div className="mt-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              <span className="font-semibold">Erreur : </span>{saveError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={loading || parsing}>{loading ? 'Enregistrement...' : parsing ? parseCountdown() : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
