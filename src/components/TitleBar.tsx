import { useState, useEffect } from 'react'
import { useI18n } from '../i18n'

function TitleBar() {
  const t = useI18n((s) => s.t)
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    checkMaximized()
  }, [])

  async function checkMaximized() {
    const isMax = await window.api.window.isMaximized()
    setMaximized(isMax)
  }

  async function handleMinimize() {
    await window.api.window.minimize()
  }

  async function handleMaximize() {
    await window.api.window.maximize()
    const isMax = await window.api.window.isMaximized()
    setMaximized(isMax)
  }

  async function handleClose() {
    await window.api.window.close()
  }

  return (
    <div className="title-bar flex items-center justify-between h-9 bg-white border-b border-gray-200 select-none shrink-0">
      <div className="flex items-center gap-2 pl-3 drag-region">
        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">TD</span>
        </div>
        <span className="text-xs font-semibold text-gray-600">TimeDoc</span>
      </div>

      <div className="flex h-full">
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center hover:bg-gray-100 transition-colors no-drag"
          title={t('titlebar.minimize')}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" className="text-gray-600">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-11 h-full flex items-center justify-center hover:bg-gray-100 transition-colors no-drag"
          title={maximized ? t('titlebar.restore') : t('titlebar.maximize')}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-600">
              <path d="M2 0h8v8H8v2H0V2h2V0zm1 3v5h5V3H3zm4-2H3v1h5v5h1V1H7z" fill="currentColor" fillRule="evenodd" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-600">
              <rect x="0" y="0" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors no-drag group"
          title={t('titlebar.close')}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-600 group-hover:text-white">
            <path d="M1 0L5 4L9 0L10 1L6 5L10 9L9 10L5 6L1 10L0 9L4 5L0 1Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TitleBar
