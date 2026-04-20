import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Client, Job } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { CvUploader } from '@/components/CvUploader'

const EMPTY: Omit<Client, 'id' | 'created_at'> = {
  name: '', contact_name: '', contact_email: '', notification_email: '', sector: '',
}

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // CV upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadClientName, setUploadClientName] = useState('')
  const [clientJobs, setClientJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data ?? [])
  }

  useEffect(() => { load() }, [])

  function openCreate() { setForm({ ...EMPTY }); setEditId(null); setOpen(true) }
  function openEdit(c: Client) {
    setForm({ name: c.name, contact_name: c.contact_name, contact_email: c.contact_email, notification_email: c.notification_email, sector: c.sector })
    setEditId(c.id); setOpen(true)
  }

  async function openUpload(c: Client) {
    setUploadClientName(c.name)
    setSelectedJobId('')
    setClientJobs([])
    setUploadOpen(true)
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('client_id', c.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    const jobs = data ?? []
    setClientJobs(jobs)
    if (jobs.length === 1) setSelectedJobId(jobs[0].id)
  }

  async function handleSave() {
    setLoading(true)
    if (editId) {
      await supabase.from('clients').update(form).eq('id', editId)
    } else {
      await supabase.from('clients').insert(form)
    }
    setLoading(false); setOpen(false); load()
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
          <p className="text-muted-foreground text-base">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>+ Nouveau client</Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Entreprise</TableHead>
              <TableHead className="w-36">Contact</TableHead>
              <TableHead className="w-48">Email notification</TableHead>
              <TableHead className="w-32">Secteur</TableHead>
              <TableHead className="w-44"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-base">
                  Aucun client
                </TableCell>
              </TableRow>
            )}
            {clients.map(c => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/clients/${c.id}`)}>
                <TableCell className="font-semibold text-foreground truncate max-w-[192px]">{c.name}</TableCell>
                <TableCell className="text-muted-foreground font-medium truncate max-w-[144px]">{c.contact_name}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[192px]">{c.notification_email}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[128px]">{c.sector}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openUpload(c)}>📄 CV</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Éditer</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>Suppr.</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog create/edit client */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {([['name', 'Nom entreprise'], ['contact_name', 'Nom contact'], ['contact_email', 'Email contact'], ['notification_email', 'Email notification (CV qualifiés)'], ['sector', 'Secteur']] as [keyof typeof EMPTY, string][]).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <Label className="text-base">{label}</Label>
                <Input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog upload CV pour un client */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Déposer des CV — {uploadClientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {clientJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune offre active pour ce client. <br />
                <span className="text-xs">Créez d'abord une offre dans la page Offres.</span>
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Offre associée</label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger>
                      <span className="truncate">
                        {selectedJobId
                          ? clientJobs.find(j => j.id === selectedJobId)?.title ?? 'Choisir une offre...'
                          : 'Choisir une offre...'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {clientJobs.map(j => (
                        <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedJobId && (
                  <CvUploader jobId={selectedJobId} onUploaded={() => setUploadOpen(false)} />
                )}
                {!selectedJobId && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sélectionne une offre pour afficher la zone de dépôt
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
