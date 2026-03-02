import { useI18n } from '../i18n'
import { changelog } from '../changelog'

interface Props {
  onClose: () => void
}

function WhatsNew({ onClose }: Props) {
  const t = useI18n((s) => s.t)
  const lang = useI18n((s) => s.lang)

  const entries = changelog.slice(0, 3)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{t('whatsNew.title')}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {entries.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  v{entry.version}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(entry.date).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
              </div>
              <div className="space-y-2.5">
                {entry.highlights.map((h, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{h.title[lang]}</p>
                      <p className="text-sm text-gray-500">{h.description[lang]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="btn-primary">
            {t('whatsNew.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default WhatsNew
