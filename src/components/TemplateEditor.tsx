import { useState, useEffect } from 'react'

interface Props {
  templateName: string
  onClose: () => void
}

const VARIABLE_GROUPS = [
  {
    title: 'Persönlich',
    vars: [
      { key: 'NAME', label: 'Name' },
      { key: 'ADRESSE_ZEILE1', label: 'Adresse Zeile 1' },
      { key: 'ADRESSE_ZEILE2', label: 'Adresse Zeile 2' },
      { key: 'EMAIL', label: 'E-Mail' },
    ],
  },
  {
    title: 'Bankdaten',
    vars: [
      { key: 'IBAN', label: 'IBAN' },
      { key: 'BIC', label: 'BIC' },
      { key: 'BANK', label: 'Bank' },
    ],
  },
  {
    title: 'Auftraggeber',
    vars: [
      { key: 'AUFTRAGGEBER_NAME', label: 'Auftraggeber Name' },
      { key: 'AUFTRAGGEBER_ADRESSE', label: 'Auftraggeber Adresse' },
    ],
  },
  {
    title: 'Rechnung',
    vars: [
      { key: 'STUNDENSATZ', label: 'Stundensatz' },
      { key: 'BETRAG', label: 'Gesamtbetrag' },
      { key: 'ZWISCHENSUMME', label: 'Zwischensumme' },
      { key: 'RECHNUNGSNUMMER', label: 'Rechnungsnummer' },
      { key: 'RECHNUNGSDATUM', label: 'Rechnungsdatum' },
    ],
  },
  {
    title: 'Zeitraum',
    vars: [
      { key: 'MONAT', label: 'Monat (Januar)' },
      { key: 'MONAT_KURZ', label: 'Monat kurz (Jan-26)' },
      { key: 'JAHR', label: 'Jahr' },
      { key: 'MONAT_NUMMER', label: 'Monatsnummer (01-12)' },
      { key: 'GESAMT_STUNDEN', label: 'Gesamtstunden (h:mm)' },
      { key: 'GESAMT_STUNDEN_DEZIMAL', label: 'Gesamtstunden (dezimal)' },
      { key: 'LEISTUNGSZEITRAUM', label: 'Leistungszeitraum' },
    ],
  },
]

const DAY_VARS = [
  { base: 'DATUM_', label: 'Datum' },
  { base: 'BEGINN_', label: 'Beginn' },
  { base: 'ENDE_', label: 'Ende' },
  { base: 'PAUSE_', label: 'Pause' },
  { base: 'STUNDEN_', label: 'Stunden' },
  { base: 'BEMERKUNG_', label: 'Bemerkung' },
]

const ALL_VARS = VARIABLE_GROUPS.flatMap(g => g.vars)

function TemplateEditor({ templateName, onClose }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [fileType, setFileType] = useState<string>('')
  const [dayNumber, setDayNumber] = useState(1)

  useEffect(() => {
    loadContent()
  }, [templateName])

  async function loadContent() {
    setLoading(true)
    setError('')
    const result = await window.api.templates.readContent(templateName)
    if (result.success && result.content !== undefined) {
      setContent(result.content)
      setFileType(result.type || '')
    } else {
      setError(result.error || 'Fehler beim Laden')
    }
    setLoading(false)
  }

  function copyVariable(varKey: string) {
    const placeholder = `{{${varKey}}}`
    navigator.clipboard.writeText(placeholder)
    setCopied(varKey)
    setTimeout(() => setCopied(''), 2000)
  }

  function copyAllDays(base: string, label: string) {
    const lines = Array.from({ length: 31 }, (_, i) => `{{${base}${i + 1}}}`)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(`${label} 1-31`)
    setTimeout(() => setCopied(''), 3000)
  }

  const foundPlaceholders = content.match(/\{\{[^}]+\}\}/g) || []
  const foundKeys = [...new Set(foundPlaceholders.map(p => p.replace(/\{\{|\}\}/g, '')))]

  const knownFound = foundKeys.filter(k => ALL_VARS.some(v => v.key === k) || /^(DATUM|BEGINN|ENDE|PAUSE|STUNDEN|BEMERKUNG)_\d+$/.test(k))
  const unknownFound = foundKeys.filter(k => !knownFound.includes(k))

  const highlightedContent = content.replace(
    /\{\{([^}]+)\}\}/g,
    (match, key) => {
      const isKnown = ALL_VARS.some(v => v.key === key) || /^(DATUM|BEGINN|ENDE|PAUSE|STUNDEN|BEMERKUNG)_\d+$/.test(key)
      return isKnown ? `██${key}██` : `??${key}??`
    }
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Vorlage prüfen</h3>
            <p className="text-sm text-gray-500">{templateName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">Lade Vorlage...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-3 flex items-center justify-between">
                <p className="text-sm text-blue-700">
                  <strong>So gehts:</strong> Klicke rechts auf eine Variable, um sie zu kopieren.
                  Öffne die Vorlage in Word/Excel und füge sie dort ein (Strg+V).
                </p>
                <button
                  onClick={() => window.api.templates.openInEditor(templateName)}
                  className="btn-primary text-sm shrink-0 ml-4"
                >
                  In {fileType === 'word' ? 'Word' : 'Excel'} öffnen
                </button>
              </div>

              {knownFound.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 mb-2">
                  <p className="text-sm text-emerald-700">
                    <strong>{knownFound.length}</strong> Platzhalter erkannt:&nbsp;
                    {knownFound.map(k => `{{${k}}}`).join(', ')}
                  </p>
                </div>
              )}

              {unknownFound.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-2">
                  <p className="text-sm text-amber-700">
                    <strong>{unknownFound.length}</strong> unbekannte Platzhalter:&nbsp;
                    {unknownFound.map(k => `{{${k}}}`).join(', ')}
                  </p>
                </div>
              )}

              {knownFound.length === 0 && unknownFound.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-2">
                  <p className="text-sm text-amber-700">
                    Keine Platzhalter in der Vorlage gefunden. Füge <code className="bg-amber-100 px-1 rounded">{`{{VARIABLE}}`}</code> in deine Word/Excel-Datei ein.
                  </p>
                </div>
              )}

              <div className="flex-1 overflow-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {highlightedContent.split(/(██[^█]+██|(?:\?\?)[^?]+(?:\?\?))/).map((part, i) => {
                    const knownMatch = part.match(/^██(.+)██$/)
                    const unknownMatch = part.match(/^\?\?(.+)\?\?$/)
                    if (knownMatch) {
                      return (
                        <span key={i} className="bg-emerald-200 text-emerald-800 px-1 rounded font-semibold">
                          {`{{${knownMatch[1]}}}`}
                        </span>
                      )
                    }
                    if (unknownMatch) {
                      return (
                        <span key={i} className="bg-amber-200 text-amber-800 px-1 rounded font-semibold">
                          {`{{${unknownMatch[1]}}}`}
                        </span>
                      )
                    }
                    return part
                  })}
                </pre>
              </div>
            </div>

            <div className="w-72 border-l border-gray-200 overflow-y-auto p-4 shrink-0">
              <h4 className="text-sm font-bold text-gray-700 mb-1">Variablen kopieren</h4>
              <p className="text-xs text-gray-400 mb-4">
                Klick kopiert die Variable. Füge sie dann in Word/Excel ein.
              </p>

              {copied && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
                  <p className="text-xs text-emerald-700 font-medium">
                    {`{{${copied}}}`} kopiert!
                  </p>
                </div>
              )}

              {VARIABLE_GROUPS.map((group) => (
                <div key={group.title} className="mb-4">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {group.title}
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {group.vars.map((v) => {
                      const isUsed = knownFound.includes(v.key)
                      return (
                        <button
                          key={v.key}
                          onClick={() => copyVariable(v.key)}
                          className={`text-xs px-2 py-1 rounded transition-colors border ${
                            isUsed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          }`}
                          title={`${v.label} -- Klick zum Kopieren`}
                        >
                          {isUsed ? '✓ ' : ''}{`{{${v.key}}}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="mb-4">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Tageseinträge -- Alle 31 Tage
                </h5>
                <p className="text-xs text-gray-400 mb-2">
                  Kopiert alle 31 Zeilen auf einmal. In Excel die Zielzelle wählen und einfügen.
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {DAY_VARS.map((v) => (
                    <button
                      key={`all-${v.base}`}
                      onClick={() => copyAllDays(v.base, v.label)}
                      className="text-xs px-2 py-1 rounded transition-colors border bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                      title={`Alle 31 ${v.label}-Platzhalter kopieren`}
                    >
                      {v.label} 1-31
                    </button>
                  ))}
                </div>

                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Einzelner Tag
                </h5>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-gray-500">Tag Nr.:</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayNumber}
                    onChange={(e) => setDayNumber(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                    className="w-14 text-xs border border-gray-200 rounded px-2 py-1 text-center"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {DAY_VARS.map((v) => {
                    const fullKey = `${v.base}${dayNumber}`
                    const isUsed = knownFound.includes(fullKey)
                    return (
                      <button
                        key={v.base}
                        onClick={() => copyVariable(fullKey)}
                        className={`text-xs px-2 py-1 rounded transition-colors border ${
                          isUsed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                        title={`${v.label} Tag ${dayNumber} -- Klick zum Kopieren`}
                      >
                        {isUsed ? '✓ ' : ''}{`{{${fullKey}}}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-xs text-gray-400">
            {fileType === 'word' ? 'Word-Vorlage (.docx)' : 'Excel-Vorlage (.xlsx)'} -- Nur Vorschau
          </div>
          <button onClick={onClose} className="btn-primary">
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateEditor
