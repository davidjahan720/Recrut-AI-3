import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { rpcWithRetry } from '@/lib/rpc'
import type { Client } from '@/lib/types'
import { getAmSession, getAmBaseClientNames, getAmExtraClientIds, addAmClientId } from '@/lib/sessionRole'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const EMPTY: Omit<Client, 'id' | 'created_at'> = {
  name: '', contact_name: '', contact_email: '', notification_email: '', sector: '', type: 'client', signed_at: null,
}

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [, setSaveError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseElapsed, setParseElapsed] = useState(0)
  const [, setParseError] = useState('')
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

  const amSession = getAmSession()
  const amBaseNames = getAmBaseClientNames()
  const amExtraIds = getAmExtraClientIds()
  const displayedClients = amSession
    ? clients.filter(c =>
        amBaseNames.some(n => n.toLowerCase() === c.name.toLowerCase()) ||
        amExtraIds.includes(c.id)
      )
    : clients

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSelectAll() {
    setSelectedIds(prev => displayedClients.every(c => prev.has(c.id)) ? new Set() : new Set(displayedClients.map(c => c.id)))
  }
  async function handleDeleteSelected() {
    if (!confirm(`Supprimer les ${selectedIds.size} client${selectedIds.size > 1 ? 's' : ''} sélectionnés ?`)) return
    await Promise.all([...selectedIds].map(id => supabase.from('clients').delete().eq('id', id)))
    setSelectedIds(new Set()); load()
  }

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data ?? [])
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm({ ...EMPTY }); setEditId(null); setOpen(true) }
  function openEdit(c: Client) {
    setForm({ name: c.name, contact_name: c.contact_name, contact_email: c.contact_email, notification_email: c.notification_email, sector: c.sector, type: c.type ?? 'client', signed_at: c.signed_at ?? null })
    setEditId(c.id); setOpen(true)
  }

  async function handleParsePdf(file: File) {
    setParsing(true); setParseError('')
    try {
      const pdf_base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = () => reject(new Error('Lecture impossible'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/parse-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_base64 }),
      })
      const json = await res.json()
      if (json?.error) throw new Error(json.error)
      const d = json?.data
      if (!d) throw new Error('Réponse vide')
      setForm(f => ({
        ...f,
        name: d.name || f.name,
        contact_name: d.contact_name || f.contact_name,
        contact_email: d.contact_email || f.contact_email,
        notification_email: d.notification_email || f.notification_email,
        sector: d.sector || f.sector,
      }))
    } catch (e) { setParseError('Erreur : ' + String(e)) }
    setParsing(false)
  }

  async function handleSave() {
    setSaveError('')
    setLoading(true)
    try {
      await rpcWithRetry('upsert_client', {
        p_name: form.name,
        p_contact_name: form.contact_name,
        p_contact_email: form.contact_email,
        p_notification_email: form.notification_email,
        p_sector: form.sector,
        ...(editId ? { p_id: editId } : {}),
      })
      if (editId) {
        await supabase.from('clients').update({ type: form.type, signed_at: form.signed_at || null }).eq('id', editId)
      } else {
        const { data: last } = await supabase.from('clients').select('id').order('created_at', { ascending: false }).limit(1).single()
        if (last) {
          await supabase.from('clients').update({ type: form.type, signed_at: form.signed_at || null }).eq('id', last.id)
          if (amSession) addAmClientId(last.id)
        }
      }
      setOpen(false); load()
    } catch (e) {
      setSaveError(String(e))
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce client ?')) return
    await supabase.from('clients').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-muted-foreground text-base">{displayedClients.length} client{displayedClients.length !== 1 ? 's' : ''}</p>
        </div>
        {!amSession && <Button onClick={openCreate}>+ Nouveau client</Button>}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2 bg-muted rounded-lg border border-border">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>Supprimer</Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelectedIds(new Set())}>Annuler</Button>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                {selectedIds.size >= 2 && (
                  <input type="checkbox" checked={displayedClients.every(c => selectedIds.has(c.id))} onChange={toggleSelectAll}
                    className="w-4 h-4 accent-violet-600 cursor-pointer" />
                )}
              </TableHead>
              <TableHead className="w-48">Entreprise</TableHead>
              <TableHead className="w-36">Contact</TableHead>
              <TableHead className="w-48">Email notification</TableHead>
              <TableHead className="w-32">Secteur</TableHead>
              <TableHead className="w-44"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-base">
                  Aucun client
                </TableCell>
              </TableRow>
            )}
            {displayedClients.map(c => (
              <TableRow key={c.id} className={`cursor-pointer hover:bg-muted/30 ${selectedIds.has(c.id) ? 'bg-violet-50 dark:bg-violet-950/20' : ''}`} onClick={() => navigate(`/clients/${c.id}`)}>
                <TableCell className="pr-0" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)}
                    className="w-4 h-4 accent-violet-600 cursor-pointer" />
                </TableCell>
                <TableCell className="font-semibold text-foreground truncate max-w-[192px]">{c.name}</TableCell>
                <TableCell className="text-muted-foreground font-medium truncate max-w-[144px]">{c.contact_name}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[192px]">{c.notification_email}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[128px]">{c.sector}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Éditer</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>Suppr.</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="border-2 border-dashed border-border rounded-lg p-3 flex items-center justify-between gap-3 bg-muted/30">
              <div>
                <p className="text-sm font-semibold text-foreground">Importer une fiche de poste PDF</p>
                <p className="text-xs text-muted-foreground">Les champs seront pré-remplis automatiquement</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleParsePdf(e.target.files[0]) }} />
              <Button type="button" size="sm" variant="outline" disabled={parsing} onClick={() => fileInputRef.current?.click()}>
                {parsing ? parseCountdown() : '📄 Choisir PDF'}
              </Button>
            </div>
            {([['name', 'Nom entreprise'], ['contact_name', 'Nom contact'], ['contact_email', 'Email contact'], ['notification_email', 'Email notification (CV qualifiés)'], ['sector', 'Secteur']] as [keyof typeof EMPTY, string][]).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <Label className="text-base">{label}</Label>
                <Input value={(form[field] as string) ?? ''} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-base">Statut</Label>
                <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground"
                  value={form.type ?? 'client'} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'prospect' | 'client' }))}>
                  <option value="prospect">Prospect</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-base">Date de signature</Label>
                <Input type="date" value={form.signed_at ? form.signed_at.slice(0, 10) : ''} onChange={e => setForm(f => ({ ...f, signed_at: e.target.value || null }))} />
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
