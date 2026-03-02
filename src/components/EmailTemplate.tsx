import { useState, useMemo } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useEntryStore } from '../stores/useEntryStore'
import { useI18n } from '../i18n'

const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

const BODY_KEY = 'email_vorlage'
const SUBJECT_KEY = 'email_betreff'

function EmailTemplate() {
  const t = useI18n((s) => s.t)
  const { settings } = useSettingsStore()
  const { currentYear, currentMonth, totalHours } = useEntryStore()
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)

  const bodyTemplate = settings[BODY_KEY] || t('email.defaultBody')
  const subjectTemplate = settings[SUBJECT_KEY] || t('email.defaultSubject')

  const emailMonth = useMemo(() => {
    const today = new Date()
    const day = today.getDate()
    const todayMonth = today.getMonth() + 1
    const todayYear = today.getFullYear()
    if (day >= 25) {
      return { year: todayYear, month: todayMonth }
    }
    if (todayMonth === 1) {
      return { year: todayYear - 1, month: 12 }
    }
    return { year: todayYear, month: todayMonth - 1 }
  }, [])

  const replacements = useMemo(() => {
    const stundensatz = parseFloat(settings.stundensatz || '0')
    const hours = totalHours()
    const betrag = hours * stundensatz
    const eMonth = emailMonth.month
    const eYear = emailMonth.year
    const monthStr = MONTH_NAMES_DE[eMonth - 1]
    const lastDay = new Date(eYear, eMonth, 0).getDate()

    const counter = parseInt(settings.rechnungsnummer_counter || '1')
    const initialen = (settings.name || '').split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('')
    const prefix = settings.rechnungsnummer_prefix || initialen || 'RE'
    const rechnungsnummer = `${prefix}-${eYear}-${eMonth}-${String(counter).padStart(2, '0')}`

    const formatHours = (h: number) => {
      const hrs = Math.floor(h)
      const mins = Math.round((h - hrs) * 60)
      return `${hrs}:${String(mins).padStart(2, '0')}`
    }

    return {
      NAME: settings.name || '',
      EMAIL: settings.email || '',
      MONAT: monthStr,
      JAHR: String(eYear),
      MONAT_NUMMER: String(eMonth).padStart(2, '0'),
      GESAMT_STUNDEN: formatHours(hours),
      GESAMT_STUNDEN_DEZIMAL: hours.toFixed(2),
      STUNDENSATZ: stundensatz.toFixed(2).replace('.', ',') + ' €',
      BETRAG: betrag.toFixed(2).replace('.', ',') + ' €',
      RECHNUNGSNUMMER: rechnungsnummer,
      LEISTUNGSZEITRAUM: `01.${String(eMonth).padStart(2, '0')}.${eYear} – ${String(lastDay).padStart(2, '0')}.${String(eMonth).padStart(2, '0')}.${eYear}`,
      AUFTRAGGEBER_NAME: settings.auftraggeber_name || '',
    } as Record<string, string>
  }, [settings, emailMonth, totalHours])

  function fillTemplate(tmpl: string): string {
    let result = tmpl
    for (const [key, val] of Object.entries(replacements)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
    }
    return result
  }

  const filledSubject = useMemo(() => fillTemplate(subjectTemplate), [subjectTemplate, replacements])
  const filledBody = useMemo(() => fillTemplate(bodyTemplate), [bodyTemplate, replacements])
  const recipientEmail = settings.auftraggeber_email || ''

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function handleEdit() {
    setEditBody(bodyTemplate)
    setEditSubject(subjectTemplate)
    setEditing(true)
  }

  async function handleSave() {
    const store = useSettingsStore.getState()
    await store.setSetting(BODY_KEY, editBody)
    await store.setSetting(SUBJECT_KEY, editSubject)
    setEditing(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 3000)
  }

  const availableVars = [
    { var: '{{NAME}}', desc: t('email.var.name') },
    { var: '{{EMAIL}}', desc: t('email.var.email') },
    { var: '{{MONAT}}', desc: t('email.var.month') },
    { var: '{{JAHR}}', desc: t('email.var.year') },
    { var: '{{MONAT_NUMMER}}', desc: t('email.var.monthNum') },
    { var: '{{RECHNUNGSNUMMER}}', desc: t('email.var.invoiceNr') },
    { var: '{{LEISTUNGSZEITRAUM}}', desc: t('email.var.period') },
    { var: '{{GESAMT_STUNDEN}}', desc: t('email.var.hours') },
    { var: '{{GESAMT_STUNDEN_DEZIMAL}}', desc: t('email.var.hoursDecimal') },
    { var: '{{STUNDENSATZ}}', desc: t('email.var.rate') },
    { var: '{{BETRAG}}', desc: t('email.var.total') },
    { var: '{{AUFTRAGGEBER_NAME}}', desc: t('email.var.client') },
  ]

  function insertVar(varName: string, targetId: string, setter: (fn: (prev: string) => string) => void) {
    const ta = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement
    if (ta) {
      const start = ta.selectionStart ?? ta.value.length
      const end = ta.selectionEnd ?? ta.value.length
      setter(prev => prev.substring(0, start) + varName + prev.substring(end))
      setTimeout(() => {
        ta.focus()
        ta.selectionStart = ta.selectionEnd = start + varName.length
      }, 0)
    } else {
      setter(prev => prev + varName)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('email.title')}</h3>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-sm text-emerald-600 font-medium">{t('email.saved')}</span>}
          {!editing && (
            <>
              <button onClick={handleEdit} className="btn-secondary text-sm">
                {t('email.editTemplate')}
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {t('email.refMonth', { month: t(`month.${emailMonth.month - 1}`), year: String(emailMonth.year) })}
      </p>

      {editing ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">{t('email.vars')}</p>
            <div className="flex flex-wrap gap-1">
              {availableVars.map((v) => (
                <button
                  key={v.var}
                  onClick={() => {
                    const active = document.activeElement
                    if (active?.id === 'email-subject-input') {
                      insertVar(v.var, 'email-subject-input', setEditSubject)
                    } else {
                      insertVar(v.var, 'email-body-textarea', setEditBody)
                    }
                  }}
                  className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors border border-blue-200"
                  title={v.desc}
                >
                  {v.var}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('email.subject')}</label>
            <input
              id="email-subject-input"
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="input-field w-full font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('email.body')}</label>
            <textarea
              id="email-body-textarea"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="input-field w-full font-mono text-sm resize-none"
              rows={16}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setEditBody(t('email.defaultBody')); setEditSubject(t('email.defaultSubject')); }}
              className="btn-secondary text-sm"
            >
              {t('email.defaultTemplate')}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
              {t('email.cancel')}
            </button>
            <button onClick={handleSave} className="btn-primary text-sm">
              {t('email.saveTemplate')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group">
            <span className="text-xs font-semibold text-gray-500 uppercase w-12 shrink-0">{t('email.to')}</span>
            <span className="flex-1 text-sm text-gray-800 font-mono truncate">
              {recipientEmail || <span className="text-gray-400 italic">{t('email.notSet')}</span>}
            </span>
            {recipientEmail && (
              <button
                onClick={() => copyToClipboard(recipientEmail, 'an')}
                className="text-xs px-3 py-1 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              >
                {copiedField === 'an' ? t('email.copied') : t('email.copy')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group">
            <span className="text-xs font-semibold text-gray-500 uppercase w-12 shrink-0">{t('email.subject')}</span>
            <span className="flex-1 text-sm text-gray-800 font-mono truncate">{filledSubject}</span>
            <button
              onClick={() => copyToClipboard(filledSubject, 'betreff')}
              className="text-xs px-3 py-1 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            >
              {copiedField === 'betreff' ? t('email.copied') : t('email.copy')}
            </button>
          </div>

          <div className="relative">
            <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase w-12 shrink-0 mt-0.5">{t('email.text')}</span>
              <div className="flex-1 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {filledBody}
              </div>
              <button
                onClick={() => copyToClipboard(filledBody, 'text')}
                className="text-xs px-3 py-1 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              >
                {copiedField === 'text' ? t('email.copied') : t('email.copy')}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                const full = (recipientEmail ? `${t('email.to')}: ${recipientEmail}\n` : '') + `${t('email.subject')}: ${filledSubject}\n\n${filledBody}`
                copyToClipboard(full, 'alles')
              }}
              className="btn-primary text-sm"
            >
              {copiedField === 'alles' ? t('email.copied') : t('email.copyAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailTemplate
