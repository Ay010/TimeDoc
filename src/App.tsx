import { useState, useEffect } from 'react'
import TitleBar from './components/TitleBar'
import MonthView from './components/MonthView'
import TemplateManager from './components/TemplateManager'
import BackupSettings from './components/BackupSettings'
import SettingsPanel from './components/SettingsPanel'
import WhatsNew from './components/WhatsNew'
import { useEntryStore } from './stores/useEntryStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useI18n } from './i18n'
import { changelog, getMinorVersion } from './changelog'

type Tab = 'hours' | 'templates' | 'settings' | 'backup'

const SEEN_VERSION_KEY = 'timedoc-seen-version'

function getHasUnseenChangelog(): boolean {
  if (changelog.length === 0) return false
  const currentMinor = getMinorVersion(__APP_VERSION__)
  const seenMinor = localStorage.getItem(SEEN_VERSION_KEY) || ''
  return currentMinor !== seenMinor && changelog.some(e => e.version === currentMinor)
}

function App() {
  const t = useI18n((s) => s.t)
  const [activeTab, setActiveTab] = useState<Tab>('hours')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [hasUnseen, setHasUnseen] = useState(getHasUnseenChangelog)
  const [updateState, setUpdateState] = useState<'none' | 'downloading' | 'ready'>('none')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)
  const loadEntries = useEntryStore((s) => s.loadEntries)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  useEffect(() => {
    loadEntries()
    loadSettings()
    window.api.backup.hasData().then(has => {
      if (!has) setShowWelcome(true)
    })

    if (getHasUnseenChangelog()) {
      setShowWhatsNew(true)
    }

    window.onUpdate.onAvailable((version) => {
      setUpdateVersion(version)
      setUpdateState('downloading')
    })
    window.onUpdate.onProgress((percent) => {
      setUpdateProgress(percent)
    })
    window.onUpdate.onDownloaded((version) => {
      setUpdateVersion(version)
      setUpdateState('ready')
    })
  }, [])

  function handleCloseWhatsNew() {
    setShowWhatsNew(false)
    setHasUnseen(false)
    const currentMinor = getMinorVersion(__APP_VERSION__)
    localStorage.setItem(SEEN_VERSION_KEY, currentMinor)
  }

  async function handleImportBackup() {
    const result = await window.api.backup.import()
    if (result.success) {
      setShowWelcome(false)
      loadEntries()
      loadSettings()
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'hours', label: t('tab.hours') },
    { id: 'templates', label: t('tab.templates') },
    { id: 'settings', label: t('tab.settings') },
    { id: 'backup', label: t('tab.backup') },
  ]

  return (
    <div className="h-screen flex flex-col">
      <TitleBar />

      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('welcome.title')}</h2>
            <p className="text-gray-500 mb-6">{t('welcome.description')}</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleImportBackup} className="btn-primary w-full py-3">
                {t('welcome.loadBackup')}
              </button>
              <button onClick={() => setShowWelcome(false)} className="btn-secondary w-full py-3">
                {t('welcome.freshStart')}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between shrink-0">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setShowWhatsNew(true)}
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title={t('whatsNew.title')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          {hasUnseen && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>
      </header>

      {updateState === 'downloading' && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 flex items-center gap-3 shrink-0">
          <span className="text-sm text-blue-700">
            {t('update.downloading', { version: updateVersion, percent: updateProgress })}
          </span>
          <div className="flex-1 h-1.5 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${updateProgress}%` }} />
          </div>
        </div>
      )}

      {updateState === 'ready' && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between shrink-0">
          <span className="text-sm text-emerald-700">
            {t('update.ready', { version: updateVersion })}
          </span>
          <button
            onClick={() => window.api.update.install()}
            className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline"
          >
            {t('update.restart')}
          </button>
        </div>
      )}

      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'hours' && <MonthView />}
        {activeTab === 'templates' && <TemplateManager />}
        {activeTab === 'settings' && <SettingsPanel />}
        {activeTab === 'backup' && <BackupSettings />}
      </main>

      {showWhatsNew && <WhatsNew onClose={handleCloseWhatsNew} />}
    </div>
  )
}

export default App
