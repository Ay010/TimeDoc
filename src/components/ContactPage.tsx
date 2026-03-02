import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useI18n } from '../i18n'

const CONTACT_EMAIL = 'aq-computer@outlook.com'

const CATEGORIES = [
  'contact.category.feedback',
  'contact.category.bug',
  'contact.category.feature',
  'contact.category.other',
] as const

type MailClient = 'default' | 'outlook' | 'gmail' | 'yahoo' | 'thunderbird'

const MAIL_CLIENTS: { id: MailClient; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'outlook', label: 'Outlook.com' },
  { id: 'gmail', label: 'Gmail' },
  { id: 'yahoo', label: 'Yahoo Mail' },
  { id: 'thunderbird', label: 'Thunderbird' },
]

function buildMailUrl(client: MailClient, to: string, subject: string, body: string): string {
  const s = encodeURIComponent(subject)
  const b = encodeURIComponent(body)

  switch (client) {
    case 'outlook':
      return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${s}&body=${b}`
    case 'gmail':
      return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${s}&body=${b}`
    case 'yahoo':
      return `https://compose.mail.yahoo.com/?to=${encodeURIComponent(to)}&subject=${s}&body=${b}`
    case 'thunderbird':
    case 'default':
    default:
      return `mailto:${to}?subject=${s}&body=${b}`
  }
}

const STORAGE_KEY = 'timedoc-mail-client'

function loadMailClient(): MailClient {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && MAIL_CLIENTS.some(c => c.id === stored)) return stored as MailClient
  } catch {}
  return 'default'
}

function ContactPage() {
  const t = useI18n((s) => s.t)
  const { settings, loadSettings } = useSettingsStore()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [message, setMessage] = useState('')
  const [mailClient, setMailClient] = useState<MailClient>(loadMailClient)
  const [status, setStatus] = useState<'idle' | 'opened' | 'fallback'>('idle')

  useEffect(() => { loadSettings() }, [])

  useEffect(() => {
    if (settings.name && !name) setName(settings.name)
  }, [settings.name])

  function handleMailClientChange(client: MailClient) {
    setMailClient(client)
    localStorage.setItem(STORAGE_KEY, client)
  }

  async function handleSend() {
    const subject = `[TimeDoc] ${t(category)}${name ? ` — ${name}` : ''}`
    const body = message
    const url = buildMailUrl(mailClient, CONTACT_EMAIL, subject, body)

    try {
      await window.api.shell.openExternal(url)
      setStatus('opened')
      setTimeout(() => setStatus('idle'), 5000)
    } catch {
      const full = `${t('contact.to')}: ${CONTACT_EMAIL}\n${t('contact.subject')}: ${subject}\n\n${body}`
      navigator.clipboard.writeText(full)
      setStatus('fallback')
      setTimeout(() => setStatus('idle'), 8000)
    }
  }

  const canSend = message.trim().length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3 py-4">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-medium px-4 py-1.5 rounded-full border border-emerald-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {t('contact.openForFeedback')}
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t('contact.title')}</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">{t('contact.subtitle')}</p>
      </div>

      <div className="card space-y-5">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t('contact.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('contact.namePlaceholder')}
              className="input-field w-full"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t('contact.subject')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field w-full"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{t(cat)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">{t('contact.message')}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('contact.messagePlaceholder')}
            className="input-field w-full resize-none"
            rows={8}
          />
        </div>

        {status === 'opened' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
            <p className="text-sm text-emerald-700">{t('contact.statusOpened')}</p>
          </div>
        )}

        {status === 'fallback' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1">
            <p className="text-sm text-amber-700 font-medium">{t('contact.statusFallback')}</p>
            <p className="text-sm text-amber-600 font-mono select-all">{CONTACT_EMAIL}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">{t('contact.sendVia')}:</label>
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {MAIL_CLIENTS.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleMailClientChange(client.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    mailClient === client.id
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {client.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="btn-primary flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {t('contact.send')}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        {t('contact.directEmail')}: <span className="font-mono text-gray-500 select-all">{CONTACT_EMAIL}</span>
      </p>
    </div>
  )
}

export default ContactPage
