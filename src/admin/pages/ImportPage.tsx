/**
 * admin/pages/ImportPage.tsx
 * Bulk import films from a CSV file.
 * Expected columns (header row required): title, year, director, image_url (optional)
 */

import { useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { importCsvFilms, type CsvImportResult } from '../api'
import { AdminLayout } from '../components/AdminLayout'

const EXAMPLE_CSV = `title,year,director,image_url
Inception,2010,Christopher Nolan,
The Dark Knight,2008,Christopher Nolan,
Pulp Fiction,1994,Quentin Tarantino,
`

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

export function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CsvImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setError('Fichier vide ou format invalide. Vérifiez que la première ligne contient les en-têtes.')
        setPreview(null)
      } else {
        setPreview(rows)
      }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  async function handleImport() {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const res = await importCsvFilms(preview)
      setResult(res)
      if (res.created > 0) setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur import')
    } finally {
      setLoading(false)
    }
  }

  function downloadExample() {
    const blob = new Blob([EXAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'example_films.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const REQUIRED_COLS = ['title', 'year', 'director']
  const previewHeaders = preview ? Object.keys(preview[0]) : []
  const missingCols = REQUIRED_COLS.filter((c) => !previewHeaders.includes(c))

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Import CSV de films</h1>
          <p className="text-sm text-gray-500 mt-1">
            Importez plusieurs films en une seule fois. Le fichier CSV doit contenir une ligne d'en-têtes
            avec au minimum : <code className="bg-gray-100 px-1 rounded text-xs">title</code>,{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">year</code>,{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">director</code>.
            La colonne <code className="bg-gray-100 px-1 rounded text-xs">image_url</code> est optionnelle.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Upload size={15} />
            Choisir un fichier CSV
          </button>
          <button
            onClick={downloadExample}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Download size={15} />
            Exemple CSV
          </button>
          {fileName && (
            <span className="text-sm text-gray-500">📄 {fileName}</span>
          )}
        </div>

        {/* Errors */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>{result.created} film{result.created > 1 ? 's' : ''}</strong> importé{result.created > 1 ? 's' : ''} avec succès.
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm space-y-1">
                <p className="font-medium text-amber-700">{result.errors.length} ligne{result.errors.length > 1 ? 's' : ''} ignorée{result.errors.length > 1 ? 's' : ''} :</p>
                {result.errors.map((e) => (
                  <p key={e.line} className="text-amber-600 text-xs">Ligne {e.line} : {e.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {preview && missingCols.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            Colonnes manquantes : {missingCols.join(', ')}. Impossible d'importer.
          </div>
        )}

        {preview && missingCols.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {preview.length} film{preview.length > 1 ? 's' : ''} détecté{preview.length > 1 ? 's' : ''}
              </p>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle size={15} />
                }
                Importer {preview.length} film{preview.length > 1 ? 's' : ''}
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-auto max-h-96">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {previewHeaders.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                        {REQUIRED_COLS.includes(h) && <span className="text-red-400 ml-0.5">*</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {previewHeaders.map((h) => (
                        <td key={h} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                          {row[h] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {preview.length > 50 && (
                    <tr>
                      <td colSpan={previewHeaders.length} className="px-3 py-2 text-center text-gray-400">
                        … et {preview.length - 50} autres
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
