import { useState, useEffect } from 'react'
import TitleBar from './components/TitleBar'
import MonthView from './components/MonthView'
import TemplateManager from './components/TemplateManager'
import BackupSettings from './components/BackupSettings'
import SettingsPanel from './components/SettingsPanel'
import { useEntryStore } from './stores/useEntryStore'
import { useSettingsStore } from './stores/useSettingsStore'

type Tab = 'stunden' | 'vorlagen' | 'einstellungen' | 'backup'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('stunden')
  const [showWelcome, setShowWelcome] = useState(false)
  const loadEntries = useEntryStore((s) => s.loadEntries)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  useEffect(() => {
    loadEntries()
    loadSettings()
    window.api.backup.hasData().then(has => {
      if (!has) setShowWelcome(true)
    })
  }, [])

  async function handleImportBackup() {
    const result = await window.api.backup.import()
    if (result.success) {
      setShowWelcome(false)
      loadEntries()
      loadSettings()
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stunden', label: 'Stunden' },
    { id: 'vorlagen', label: 'Vorlagen & Export' },
    { id: 'einstellungen', label: 'Einstellungen' },
    { id: 'backup', label: 'Backup' },
  ]

  return (
    <div className="h-screen flex flex-col">
      <TitleBar />

      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Willkommen bei TimeDoc!</h2>
            <p className="text-gray-500 mb-6">
              Starte frisch oder lade ein bestehendes Backup, um deine Daten wiederherzustellen.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleImportBackup}
                className="btn-primary w-full py-3"
              >
                Backup laden
              </button>
              <button
                onClick={() => setShowWelcome(false)}
                className="btn-secondary w-full py-3"
              >
                Neu starten
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
      </header>

      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'stunden' && <MonthView />}
        {activeTab === 'vorlagen' && <TemplateManager />}
        {activeTab === 'einstellungen' && <SettingsPanel />}
        {activeTab === 'backup' && <BackupSettings />}
      </main>
    </div>
  )
}

export default App
