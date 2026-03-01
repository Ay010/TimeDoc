import { useState, useMemo } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useEntryStore } from '../stores/useEntryStore'

const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

const DEFAULT_BODY = `Hallo {{AUFTRAGGEBER_NAME}},

anbei erhalten Sie meine Rechnung sowie den zugehörigen Stundenzettel für den Monat {{MONAT}} {{JAHR}}.

Rechnungsnummer: {{RECHNUNGSNUMMER}}
Leistungszeitraum: {{LEISTUNGSZEITRAUM}}
Gesamtstunden: {{GESAMT_STUNDEN}} h
Rechnungsbetrag: {{BETRAG}}

Bitte überweisen Sie den Rechnungsbetrag innerhalb der vereinbarten Zahlungsfrist auf das in der Rechnung angegebene Konto.

Bei Rückfragen stehe ich Ihnen gerne zur Verfügung.

Viele Grüße
{{NAME}}`

const DEFAULT_SUBJECT = `Rechnung & Stundenzettel {{MONAT}} {{JAHR}} – {{NAME}}`

const BODY_KEY = 'email_vorlage'
const SUBJECT_KEY = 'email_betreff'

function EmailTemplate() {
  const { settings } = useSettingsStore()
  const { currentYear, currentMonth, totalHours } = useEntryStore()
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)

  const bodyTemplate = settings[BODY_KEY] || DEFAULT_BODY
  const subjectTemplate = settings[SUBJECT_KEY] || DEFAULT_SUBJECT

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
    { var: '{{NAME}}', desc: 'Dein Name' },
    { var: '{{EMAIL}}', desc: 'Deine E-Mail' },
    { var: '{{MONAT}}', desc: 'Monatsname (z.B. Februar)' },
    { var: '{{JAHR}}', desc: 'Jahr (z.B. 2026)' },
    { var: '{{MONAT_NUMMER}}', desc: 'Monat als Zahl (z.B. 02)' },
    { var: '{{RECHNUNGSNUMMER}}', desc: 'Rechnungsnummer' },
    { var: '{{LEISTUNGSZEITRAUM}}', desc: 'Leistungszeitraum' },
    { var: '{{GESAMT_STUNDEN}}', desc: 'Stunden (z.B. 77:00)' },
    { var: '{{GESAMT_STUNDEN_DEZIMAL}}', desc: 'Stunden dezimal (z.B. 77.00)' },
    { var: '{{STUNDENSATZ}}', desc: 'Stundensatz mit €' },
    { var: '{{BETRAG}}', desc: 'Gesamtbetrag mit €' },
    { var: '{{AUFTRAGGEBER_NAME}}', desc: 'Auftraggeber Firma/Name' },
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
        <h3 className="text-lg font-semibold">E-Mail-Vorlage</h3>
        <div className="flex items-center gap-2">
          {savedMsg && <span className="text-sm text-emerald-600 font-medium">Gespeichert!</span>}
          {!editing && (
            <>
              <button onClick={handleEdit} className="btn-secondary text-sm">
                Vorlage bearbeiten
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Bezieht sich auf: <span className="font-semibold text-gray-700">{MONTH_NAMES_DE[emailMonth.month - 1]} {emailMonth.year}</span>
        <span className="text-gray-400 ml-1">(Vormonat, wechselt ab dem 25.)</span>
      </p>

      {editing ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-2">Verfügbare Variablen (Klick zum Einfügen in fokussiertes Feld):</p>
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
            <label className="text-sm font-medium text-gray-700 mb-1 block">Betreff</label>
            <input
              id="email-subject-input"
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="input-field w-full font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nachricht</label>
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
              onClick={() => { setEditBody(DEFAULT_BODY); setEditSubject(DEFAULT_SUBJECT); }}
              className="btn-secondary text-sm"
            >
              Standardvorlage
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
              Abbrechen
            </button>
            <button onClick={handleSave} className="btn-primary text-sm">
              Vorlage speichern
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group">
            <span className="text-xs font-semibold text-gray-500 uppercase w-12 shrink-0">An</span>
            <span className="flex-1 text-sm text-gray-800 font-mono truncate">
              {recipientEmail || <span className="text-gray-400 italic">Nicht gesetzt (Einstellungen &rarr; Auftraggeber &rarr; E-Mail)</span>}
            </span>
            {recipientEmail && (
              <button
                onClick={() => copyToClipboard(recipientEmail, 'an')}
                className="text-xs px-3 py-1 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              >
                {copiedField === 'an' ? 'Kopiert!' : 'Kopieren'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg group">
            <span className="text-xs font-semibold text-gray-500 uppercase w-12 shrink-0">Betreff</span>
            <span className="flex-1 text-sm text-gray-800 font-mono truncate">{filledSubject}</span>
            <button
              onClick={() => copyToClipboard(filledSubject, 'betreff')}
              className="text-xs px-3 py-1 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
            >
              {copiedField === 'betreff' ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>

          <div className="relative">
            <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase w-12 shrink-0 mt-0.5">Text</span>
              <div className="flex-1 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {filledBody}
              </div>
              <button
                onClick={() => copyToClipboard(filledBody, 'text')}
                className="text-xs px-3 py-1 rounded bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
              >
                {copiedField === 'text' ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                const full = (recipientEmail ? `An: ${recipientEmail}\n` : '') + `Betreff: ${filledSubject}\n\n${filledBody}`
                copyToClipboard(full, 'alles')
              }}
              className="btn-primary text-sm"
            >
              {copiedField === 'alles' ? 'Kopiert!' : 'Alles kopieren'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailTemplate
