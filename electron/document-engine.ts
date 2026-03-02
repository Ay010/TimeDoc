import fs from 'fs'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import ExcelJS from 'exceljs'

interface Entry {
  date: string
  start_time: string
  end_time: string
  break_minutes: number
  work_hours: number
  notes: string
}

interface Mapping {
  field_name: string
  placeholder: string
}

const MONTH_NAMES_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

function buildTemplateData(
  entries: Entry[],
  settings: Record<string, string>,
  year: number,
  month: number
): Record<string, string> {
  const totalHours = entries.reduce((sum, e) => sum + (e.work_hours || 0), 0)
  const stundensatz = parseFloat(settings.stundensatz || '0')
  const betrag = totalHours * stundensatz
  const monthStr = MONTH_NAMES_DE[month - 1]
  const shortMonth = `${monthStr.substring(0, 3)}-${String(year).slice(2)}`

  const counter = parseInt(settings.rechnungsnummer_counter || '1')
  const initialen = (settings.name || '').split(/\s+/).map(w => w[0]?.toUpperCase() || '').join('')
  const prefix = settings.rechnungsnummer_prefix || initialen || 'RE'
  const rechnungsnummer = `${prefix}-${year}-${month}-${String(counter).padStart(2, '0')}`

  const today = new Date()
  const rechnungsdatum = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`

  const data: Record<string, string> = {}

  for (const [key, val] of Object.entries(settings)) {
    if (key.startsWith('CUSTOM_')) {
      data[key] = val
    }
  }

  Object.assign(data, {
    NAME: settings.name || '',
    ADRESSE_ZEILE1: settings.adresse_zeile1 || '',
    ADRESSE_ZEILE2: settings.adresse_zeile2 || '',
    EMAIL: settings.email || '',
    MONAT: monthStr,
    MONAT_KURZ: shortMonth,
    JAHR: String(year),
    MONAT_NUMMER: String(month).padStart(2, '0'),
    GESAMT_STUNDEN: formatHours(totalHours),
    GESAMT_STUNDEN_DEZIMAL: totalHours.toFixed(2),
    STUNDENSATZ: stundensatz.toFixed(2).replace('.', ',') + ' €',
    BETRAG: betrag.toFixed(2).replace('.', ',') + ' €',
    ZWISCHENSUMME: betrag.toFixed(2).replace('.', ',') + ' €',
    RECHNUNGSNUMMER: rechnungsnummer,
    RECHNUNGSDATUM: rechnungsdatum,
    AUFTRAGGEBER_NAME: settings.auftraggeber_name || '',
    AUFTRAGGEBER_ADRESSE: settings.auftraggeber_adresse || '',
    IBAN: settings.iban || '',
    BIC: settings.bic || '',
    BANK: settings.bank || '',
    LEISTUNGSZEITRAUM: `01.${String(month).padStart(2, '0')}.${year} – ${lastDayOfMonth(year, month)}.${String(month).padStart(2, '0')}.${year}`,
  })

  for (let idx = 1; idx <= 31; idx++) {
    const entry = entries[idx - 1]
    if (entry) {
      const dateParts = entry.date.split('-')
      const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0].slice(2)}`
      data[`DATUM_${idx}`] = formattedDate
      data[`BEGINN_${idx}`] = entry.start_time || ''
      data[`ENDE_${idx}`] = entry.end_time || ''
      data[`PAUSE_${idx}`] = formatMinutes(entry.break_minutes)
      data[`STUNDEN_${idx}`] = formatHours(entry.work_hours)
      data[`BEMERKUNG_${idx}`] = entry.notes || ''
    } else {
      data[`DATUM_${idx}`] = ''
      data[`BEGINN_${idx}`] = ''
      data[`ENDE_${idx}`] = ''
      data[`PAUSE_${idx}`] = ''
      data[`STUNDEN_${idx}`] = ''
      data[`BEMERKUNG_${idx}`] = ''
    }
  }

  return data
}

function formatHours(h: number): string {
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

function formatMinutes(m: number): string {
  const hours = Math.floor(m / 60)
  const mins = m % 60
  return `${hours}:${String(mins).padStart(2, '0')}`
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0).getDate()
  return String(d).padStart(2, '0')
}

export async function exportWord(
  templatePath: string,
  outputPath: string,
  entries: Entry[],
  settings: Record<string, string>,
  mappings: Mapping[],
  year: number,
  month: number
): Promise<void> {
  const content = fs.readFileSync(templatePath)
  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  })

  const data = buildTemplateData(entries, settings, year, month)

  const templateData: Record<string, string> = {}
  if (mappings.length > 0) {
    for (const m of mappings) {
      templateData[m.placeholder] = data[m.field_name] || ''
    }
  } else {
    Object.assign(templateData, data)
  }

  doc.render(templateData)
  const buf = doc.getZip().generate({ type: 'nodebuffer' })
  fs.writeFileSync(outputPath, buf)
}

export async function exportExcel(
  templatePath: string,
  outputPath: string,
  entries: Entry[],
  settings: Record<string, string>,
  mappings: Mapping[],
  year: number,
  month: number
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(templatePath)

  const data = buildTemplateData(entries, settings, year, month)

  function replacePlaceholders(text: string): string {
    if (mappings.length > 0) {
      for (const m of mappings) {
        const placeholder = `{{${m.placeholder}}}`
        if (text.includes(placeholder)) {
          text = text.replace(placeholder, data[m.field_name] || '')
        }
      }
    } else {
      const placeholders = text.match(/\{\{[^}]+\}\}/g)
      if (placeholders) {
        for (const ph of placeholders) {
          const key = ph.replace(/\{\{|\}\}/g, '')
          if (data[key] !== undefined) {
            text = text.replace(ph, data[key])
          }
        }
      }
    }
    return text
  }

  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'string') {
          cell.value = replacePlaceholders(cell.value)
        } else if (cell.value && typeof cell.value === 'object') {
          const val = cell.value as any
          if (val.richText && Array.isArray(val.richText)) {
            val.richText = val.richText.map((part: any) => ({
              ...part,
              text: replacePlaceholders(part.text || '')
            }))
            cell.value = val
          } else if (val.formula && typeof val.formula === 'string') {
            val.formula = replacePlaceholders(val.formula)
            if (val.result !== undefined) delete val.result
            cell.value = val
          }
        }
      })
    })
  }

  await workbook.xlsx.writeFile(outputPath)
}
