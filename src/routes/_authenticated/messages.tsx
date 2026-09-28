import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '~/components/shared/page-header'
import { EmptyState } from '~/components/shared/empty-state'
import { FilterBar } from '~/components/shared/filter-bar'
import { Field } from '~/components/shared/field'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { requireAccess } from '~/lib/super-admin-guard'
import { formatDate } from '~/lib/utils'
import { toUserMessage } from '~/lib/errors'
import {
  createMessageFn,
  getMessageThreadFn,
  listMessagesFn,
  replyMessageFn,
} from '~/server/messages'
import { hotelOptionsFn } from '~/server/hotels'
import type { JsonRow } from '~/lib/db'

export const Route = createFileRoute('/_authenticated/messages')({
  beforeLoad: ({ context }) => requireAccess(context.auth, 'messages'),
  loader: async () => {
    const [list, hotels] = await Promise.all([
      listMessagesFn({ data: { guest: '', page: 1, pageSize: 50, search: '' } }),
      hotelOptionsFn(),
    ])
    return { list, hotels }
  },
  component: MessagesPage,
})

function MessagesPage() {
  const initial = Route.useLoaderData()
  const { auth } = Route.useRouteContext()
  const [guest, setGuest] = useState('')
  const [threads, setThreads] = useState(initial.list.items)
  const [active, setActive] = useState<JsonRow | null>(initial.list.items[0] ?? null)
  const [detail, setDetail] = useState<{ thread: JsonRow; messages: JsonRow[] } | null>(null)
  const [reply, setReply] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    hotelId: '',
    guestName: '',
    guestEmail: '',
    subject: '',
    body: '',
  })

  async function loadThreads(nextGuest = guest) {
    const list = await listMessagesFn({
      data: { guest: nextGuest, page: 1, pageSize: 50, search: '' },
    })
    setThreads(list.items)
    return list.items
  }

  async function openThread(row: JsonRow) {
    setActive(row)
    try {
      setDetail(await getMessageThreadFn({ data: { id: String(row.id) } }))
    } catch (error) {
      toast.error(toUserMessage(error))
    }
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Staff notes for guests"
        actions={<Button onClick={() => setOpen(true)}>New thread</Button>}
      />
      <FilterBar
        onSubmit={() => void loadThreads(guest)}
        onClear={() => {
          setGuest('')
          void loadThreads('')
        }}
      >
        <Input
          placeholder="Guest"
          value={guest}
          onChange={(e) => setGuest(e.target.value)}
          aria-label="Guest"
        />
      </FilterBar>
      {threads.length === 0 ? (
        <EmptyState title="No messages" description="Start a thread with a guest." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr_240px]">
          <div className="rounded-2xl border border-border bg-card p-2">
            {threads.map((row) => (
              <button
                key={String(row.id)}
                type="button"
                className={`mb-1 w-full rounded-xl px-3 py-3 text-left text-sm ${
                  String(active?.id) === String(row.id) ? 'bg-secondary' : 'hover:bg-secondary/60'
                }`}
                onClick={() => void openThread(row)}
              >
                <p className="font-semibold">{String(row.guest_name)}</p>
                <p className="truncate text-xs text-muted-foreground">{String(row.subject)}</p>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            {detail ? (
              <>
                <h2 className="font-semibold">{String(detail.thread.subject)}</h2>
                <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto">
                  {detail.messages.map((message) => (
                    <div
                      key={String(message.id)}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        message.author === 'staff' ? 'ml-auto bg-primary/40' : 'bg-secondary'
                      }`}
                    >
                      <p>{String(message.body)}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDate(String(message.created_at))}
                      </p>
                    </div>
                  ))}
                </div>
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!active || !reply.trim()) return
                    try {
                      await replyMessageFn({ data: { threadId: String(active.id), body: reply } })
                      setReply('')
                      await openThread(active)
                    } catch (error) {
                      toast.error(toUserMessage(error))
                    }
                  }}
                >
                  <Input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type a message"
                  />
                  <Button type="submit">Send</Button>
                </form>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a thread.</p>
            )}
          </div>
          <div className="hidden rounded-2xl border border-border bg-card p-4 lg:block">
            <p className="text-xs uppercase text-muted-foreground">Profile</p>
            <p className="mt-2 font-semibold">{String(detail?.thread.guest_name ?? active?.guest_name ?? '—')}</p>
            <p className="text-sm text-muted-foreground">
              {String(detail?.thread.guest_email ?? active?.guest_email ?? '')}
            </p>
          </div>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New thread</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                const created = await createMessageFn({
                  data: { ...form, hotelId: form.hotelId || (auth.hotelId ?? '') },
                })
                toast.success('Thread created')
                setOpen(false)
                const items = await loadThreads()
                const next = items.find((row) => String(row.id) === created.id)
                if (next) await openThread(next)
              } catch (error) {
                toast.error(toUserMessage(error))
              }
            }}
          >
            {auth.role === 'super_admin' ? (
              <Field label="Hotel">
                <select
                  className="h-11 w-full rounded-xl border border-border bg-card px-3"
                  value={form.hotelId}
                  onChange={(e) => setForm({ ...form, hotelId: e.target.value })}
                >
                  <option value="">Select hotel</option>
                  {initial.hotels.map((hotel) => (
                    <option key={String(hotel.id)} value={String(hotel.id)}>
                      {String(hotel.name)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Guest name">
              <Input
                value={form.guestName}
                onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                required
              />
            </Field>
            <Field label="Guest email">
              <Input
                type="email"
                value={form.guestEmail}
                onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                required
              />
            </Field>
            <Field label="Subject">
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </Field>
            <Field label="Message">
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                required
              />
            </Field>
            <Button type="submit">Create</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
