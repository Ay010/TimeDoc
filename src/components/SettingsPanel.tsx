import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useI18n, type Lang } from '../i18n'

type SettingField = { key: string; label: string; placeholder: string; sensitive: boolean }
type SettingGroup = { title: string; fields: SettingField[] }

function getSettingGroups(t: (key: string) => string): SettingGroup[] {
  return [
    {
      title: t('settings.group.personal'),
      fields: [
        { key: 'name', label: t('settings.field.name'), placeholder: 'Max Mustermann', sensitive: false },
        { key: 'adresse_zeile1', label: t('settings.field.address1'), placeholder: 'Musterstraße 1', sensitive: false },
        { key: 'adresse_zeile2', label: t('settings.field.address2'), placeholder: '12345 Musterstadt', sensitive: false },
        { key: 'email', label: t('settings.field.email'), placeholder: 'email@beispiel.de', sensitive: false },
      ],
    },
    {
      title: t('settings.group.bank'),
      fields: [
        { key: 'iban', label: t('settings.field.iban'), placeholder: 'DE00 0000 0000 0000 0000 00', sensitive: true },
        { key: 'bic', label: t('settings.field.bic'), placeholder: 'DEUTDEDBXXX', sensitive: true },
        { key: 'bank', label: t('settings.field.bank'), placeholder: 'Deutsche Bank', sensitive: false },
      ],
    },
    {
      title: t('settings.group.client'),
      fields: [
        { key: 'auftraggeber_name', label: t('settings.field.clientName'), placeholder: 'Firma GmbH', sensitive: false },
        { key: 'auftraggeber_adresse', label: t('settings.field.clientAddress'), placeholder: 'Firmenstraße 1, 12345 Stadt', sensitive: false },
        { key: 'auftraggeber_email', label: t('settings.field.clientEmail'), placeholder: 'rechnung@firma.de', sensitive: false },
      ],
    },
    {
      title: t('settings.group.invoice'),
      fields: [
        { key: 'stundensatz', label: t('settings.field.hourlyRate'), placeholder: '25', sensitive: false },
        { key: 'rechnungsnummer_prefix', label: t('settings.field.invoicePrefix'), placeholder: 'MM (Initialen)', sensitive: false },
        { key: 'rechnungsnummer_counter', label: t('settings.field.invoiceCounter'), placeholder: '1', sensitive: false },
      ],
    },
  ]
}

function parseSettingsImport(text: string, allFields: SettingField[]): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n').filter(l => l.trim())

  for (const line of lines) {
    // Try "Label: Wert" or "Label = Wert" or "key: Wert"
    const separatorMatch = line.match(/^(.+?)\s*[:=]\s*(.+)$/)
    if (separatorMatch) {
      const rawKey = separatorMatch[1].trim()
      const value = separatorMatch[2].trim()
      const field = allFields.find(f =>
        f.key.toLowerCase() === rawKey.toLowerCase() ||
        f.label.toLowerCase() === rawKey.toLowerCase()
      )
      if (field) {
        result[field.key] = value
        continue
      }
      // Fuzzy match
      const fuzzy = allFields.find(f =>
        f.label.toLowerCase().includes(rawKey.toLowerCase()) ||
        rawKey.toLowerCase().includes(f.label.toLowerCase())
      )
      if (fuzzy) {
        result[fuzzy.key] = value
      }
      continue
    }

    // Try tab-separated: "Label\tWert"
    const tabs = line.split('\t').map(c => c.trim())
    if (tabs.length >= 2) {
      const rawKey = tabs[0]
      const value = tabs[1]
      const field = allFields.find(f =>
        f.key.toLowerCase() === rawKey.toLowerCase() ||
        f.label.toLowerCase() === rawKey.toLowerCase() ||
        f.label.toLowerCase().includes(rawKey.toLowerCase()) ||
        rawKey.toLowerCase().includes(f.label.toLowerCase())
      )
      if (field) {
        result[field.key] = value
      }
    }
  }

  return result
}

function SettingsPanel() {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang)
  const setLang = useI18n((s) => s.setLang)
  const { settings, loadSettings, setSetting } = useSettingsStore()
  const SETTING_GROUPS = getSettingGroups(t)
  const ALL_FIELDS = SETTING_GROUPS.flatMap(g => g.fields)
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] = useState<Record<string, string> | null>(null)
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({})
  const [authVerified, setAuthVerified] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [hasPassword, setHasPassword] = useState(false)

  useEffect(() => {
    window.api.auth.hasPassword().then(setHasPassword)
  }, [])

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    setLocalSettings({ ...settings })
  }, [settings])

  function handleChange(key: string, value: string) {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    for (const [key, value] of Object.entries(localSettings)) {
      if (value !== settings[key]) {
        await setSetting(key, value)
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleImportParse() {
    const parsed = parseSettingsImport(importText, ALL_FIELDS)
    setImportPreview(parsed)
  }

  async function handleImportApply() {
    if (!importPreview) return
    setSaving(true)
    for (const [key, value] of Object.entries(importPreview)) {
      await setSetting(key, value)
    }
    setLocalSettings(prev => ({ ...prev, ...importPreview }))
    setSaving(false)
    setSaved(true)
    setShowImport(false)
    setImportText('')
    setImportPreview(null)
    setTimeout(() => setSaved(false), 3000)
  }

  function handleExportSettings() {
    const lines = ALL_FIELDS
      .map(f => `${f.label}: ${localSettings[f.key] || ''}`)
      .filter(l => !l.endsWith(': '))
    navigator.clipboard.writeText(lines.join('\n'))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const importCount = importPreview ? Object.keys(importPreview).length : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h2>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">{t('settings.saved')}</span>
          )}
          <button onClick={handleExportSettings} className="btn-secondary text-sm">
            {t('settings.copy')}
          </button>
          <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">
            {t('settings.import')}
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </div>

      {SETTING_GROUPS.map((group) => (
        <div key={group.title} className="card">
          <h3 className="text-lg font-semibold mb-4">{group.title}</h3>
          <div className="space-y-3">
            {group.fields.map((field) => (
              <div key={field.key} className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700 w-48 shrink-0">
                  {field.label}
                </label>
                <div className="flex-1 relative">
                  <input
                    type={field.sensitive && !visibleFields[field.key] ? 'password' : 'text'}
                    value={localSettings[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className={`input-field w-full ${field.sensitive ? 'pr-10' : ''}`}
                  />
                  {field.sensitive && (
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={async () => {
                        if (visibleFields[field.key]) {
                          setVisibleFields(prev => ({ ...prev, [field.key]: false }))
                          return
                        }
                        if (!hasPassword || authVerified) {
                          setVisibleFields(prev => ({ ...prev, [field.key]: true }))
                          return
                        }
                        setAuthLoading(true)
                        setAuthError('')
                        const result = await window.api.auth.verifyUser()
                        setAuthLoading(false)
                        if (result.success) {
                          setAuthVerified(true)
                          setVisibleFields(prev => ({ ...prev, [field.key]: true }))
                          setTimeout(() => setAuthVerified(false), 5 * 60 * 1000)
                        } else if (!result.cancelled) {
                          setAuthError(t('settings.wrongPassword'))
                          setTimeout(() => setAuthError(''), 3000)
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      title={visibleFields[field.key] ? t('settings.hide') : t('settings.show')}
                    >
                      {visibleFields[field.key] ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {group.title === t('settings.group.bank') && (
            <>
            {authError && (
              <div className="mt-3 text-sm text-red-600 font-medium">{authError}</div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('settings.password.title')}</p>
                  <p className="text-xs text-gray-400">
                    {hasPassword
                      ? t('settings.password.active')
                      : t('settings.password.inactive')}
                  </p>
                </div>
                <button
                  disabled={authLoading}
                  onClick={async () => {
                    setAuthError('')
                    if (hasPassword) {
                      setAuthLoading(true)
                      const result = await window.api.auth.removePassword()
                      setAuthLoading(false)
                      if (result.success) {
                        setHasPassword(false)
                        setAuthVerified(false)
                      } else if (result.wrongPassword) {
                        setAuthError(t('settings.wrongPassword'))
                        setTimeout(() => setAuthError(''), 3000)
                      }
                    } else {
                      setAuthLoading(true)
                      const result = await window.api.auth.setPassword()
                      setAuthLoading(false)
                      if (result.success) {
                        setHasPassword(true)
                        setVisibleFields({})
                      }
                    }
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    hasPassword ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    hasPassword ? 'translate-x-6' : ''
                  }`} />
                </button>
              </div>
              {hasPassword && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={authLoading}
                    onClick={async () => {
                      setAuthError('')
                      setAuthLoading(true)
                      const result = await window.api.auth.setPassword()
                      setAuthLoading(false)
                      if (result.success) {
                        setAuthError('')
                        setAuthVerified(false)
                        setVisibleFields({})
                      } else if (result.wrongPassword) {
                        setAuthError(t('settings.wrongPassword'))
                        setTimeout(() => setAuthError(''), 3000)
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {t('settings.password.change')}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    disabled={authLoading}
                    onClick={async () => {
                      if (!confirm(t('settings.password.confirmReset'))) return
                      setAuthLoading(true)
                      await setSetting('iban', '')
                      await setSetting('bic', '')
                      await window.api.auth.removePassword(true)
                      setAuthLoading(false)
                      setHasPassword(false)
                      setAuthVerified(false)
                      setVisibleFields({})
                      setLocalSettings(prev => ({ ...prev, iban: '', bic: '' }))
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    {t('settings.password.forgot')}
                  </button>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      ))}

      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowImport(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{t('settings.import.title')}</h3>
              <button onClick={() => { setShowImport(false); setImportPreview(null); setImportText('') }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {!importPreview ? (
                <>
                  <p className="text-sm text-gray-600">
                    {t('settings.import.description')}
                  </p>
                  <pre className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
{`Name: Max Mustermann
Adresse Zeile 1: Musterstraße 1
Adresse Zeile 2: 12345 Musterstadt
E-Mail: max@beispiel.de
IBAN: DE89 3704 0044 0532 0130 00
BIC: COBADEFFXXX
Bank: Commerzbank
Stundensatz (€): 25`}
                  </pre>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={t('settings.import.placeholder')}
                    className="input-field w-full h-40 font-mono text-xs resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleImportParse}
                      disabled={!importText.trim()}
                      className="btn-primary"
                    >
                      {t('settings.import.detect')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-emerald-600">
                      {t('settings.import.detected', { n: String(importCount) })}
                    </span>
                    <button
                      onClick={() => setImportPreview(null)}
                      className="text-sm text-blue-600 hover:text-blue-800 ml-auto"
                    >
                      {t('settings.import.back')}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(importPreview).map(([key, value]) => {
                      const field = ALL_FIELDS.find(f => f.key === key)
                      return (
                        <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                          <span className="text-emerald-500 text-sm">&#10003;</span>
                          <span className="text-sm font-medium text-gray-700 w-44 shrink-0">{field?.label || key}</span>
                          <span className="text-sm text-gray-900">{value}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setShowImport(false); setImportPreview(null); setImportText('') }} className="btn-secondary">{t('settings.import.cancel')}</button>
                    <button
                      onClick={handleImportApply}
                      disabled={importCount === 0 || saving}
                      className="btn-success"
                    >
                      {saving ? t('settings.saving') : t('settings.import.apply', { n: String(importCount) })}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">{t('lang.label')}</p>
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {(['en', 'de'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  lang === l
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {l === 'en' ? 'English' : 'Deutsch'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 mt-8 pb-4">
        TimeDoc v{__APP_VERSION__}
      </div>
    </div>
  )
}

export default SettingsPanel
