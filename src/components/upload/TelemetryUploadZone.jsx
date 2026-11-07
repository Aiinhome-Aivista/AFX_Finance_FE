import { useState, useRef, useEffect, useCallback } from 'react'
import {
  UploadCloud,
  FileUp,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Database,
  Table,
  ArrowLeft,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react'
import { Spinner, Loading, EmptyState } from '../common/States'
import { files as filesApi } from '../../api'
import { bytes, timeAgo } from '../../lib/format'
import { useToast } from '../../context/ToastContext'

const ALLOWED = ['csv', 'xlsx', 'pdf', 'txt', 'docx', 'sql']
const MAX_MB = 25

export default function TelemetryUploadZone({
  slug,
  onBackToGraph,
  onProceedToGapAnalysis,
  onFileUploaded,
  onProcessingUpdate,
}) {
  const toast = useToast()
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [queue, setQueue] = useState([]) // in-flight uploads: { id, name, pct, error }
  const [fileList, setFileList] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const processedCount = fileList.filter((f) => f.status === 'processed').length

  // Fetch uploaded files
  const loadFiles = useCallback(async () => {
    try {
      const res = await filesApi.list(slug)
      setFileList(res.files || [])
    } catch (err) {
      // silently fail if initial fetch
    } finally {
      setLoadingFiles(false)
    }
  }, [slug])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Polling while files are processing
  useEffect(() => {
    const hasPending = fileList.some(
      (f) => f.status === 'uploaded' || f.status === 'processing'
    )
    if (!hasPending) return
    const interval = setInterval(loadFiles, 2000)
    return () => clearInterval(interval)
  }, [fileList, loadFiles])

  // Upload handler
  const handleUpload = (incomingFiles) => {
    const filesArray = Array.from(incomingFiles)
    if (filesArray.length === 0) return

    filesArray.forEach(async (file) => {
      const ext = file.name.split('.').pop().toLowerCase()
      const tempId = Math.random().toString(36).slice(2)

      if (!ALLOWED.includes(ext)) {
        return toast.error(
          `${file.name}: Unsupported file type. Allowed: ${ALLOWED.join(', ').toUpperCase()}`
        )
      }
      if (file.size > MAX_MB * 1048576) {
        return toast.error(`${file.name}: Exceeds ${MAX_MB} MB limit.`)
      }
      if (file.size === 0) {
        return toast.error(`${file.name}: The file is empty.`)
      }

      setQueue((q) => [...q, { id: tempId, name: file.name, pct: 0 }])
      onProcessingUpdate?.(file.name, 'start')

      try {
        const uploaded = await filesApi.upload(slug, file, (pct) => {
          setQueue((q) =>
            q.map((item) => (item.id === tempId ? { ...item, pct } : item))
          )
        })

        setQueue((q) => q.filter((item) => item.id !== tempId))
        toast.success(`Uploaded ${file.name}`)
        onFileUploaded?.(uploaded)
        onProcessingUpdate?.(file.name, 'parsing')
        loadFiles()
      } catch (err) {
        setQueue((q) =>
          q.map((item) =>
            item.id === tempId ? { ...item, error: err.message } : item
          )
        )
        toast.error(`${file.name}: ${err.message}`)
      }
    })
  }

  // Delete handler
  const handleDelete = async (fileId, fileName) => {
    try {
      await filesApi.remove(fileId)
      toast.success(`Deleted ${fileName}`)
      loadFiles()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Preview file handler
  const openPreview = async (fileId) => {
    setPreviewLoading(true)
    try {
      const res = await filesApi.get(fileId)
      setPreviewFile(res)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface rounded-2xl border border-line shadow-card">
      {/* Top Bar with Return to Graph Action */}
      <div className="flex items-center justify-between border-b border-line bg-surface2/60 px-4 py-3 select-none">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#10b981]/15 text-[#10b981]">
            <UploadCloud size={16} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Upload Business Data</h2>
            <p className="text-[11px] text-muted">
              Map real-world enterprise telemetry onto your Knowledge Graph (KG1)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onProceedToGapAnalysis && processedCount > 0 && (
            <button
              type="button"
              onClick={onProceedToGapAnalysis}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-sm shadow-red-500/20 hover:scale-[1.02] transition-all cursor-pointer animate-pulse"
              title="Proceed to Step 5: Gap Analysis Evolution (KG2)"
            >
              <Sparkles size={13} />
              <span>Proceed to Gap Analysis (KG2)</span>
            </button>
          )}

          {onBackToGraph && (
            <button
              type="button"
              onClick={onBackToGraph}
              className="btn-ghost btn-sm text-xs flex items-center gap-1.5 cursor-pointer hover:border-[#10b981]"
            >
              <ArrowLeft size={13} />
              <span>View Graph</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload & Files Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scroll-thin">
        {/* Step 5 Gap Analysis Banner (shown once a file is processed) */}
        {processedCount > 0 && onProceedToGapAnalysis && (
          <div className="rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ef4444] text-white font-bold">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink">Step 5 Ready: Gap Analysis Evolution (KG2)</h4>
                <p className="text-[11px] text-muted">
                  {processedCount} telemetry file(s) processed. Compare uploaded data against KG1 to highlight discrepancies in <strong className="text-red-500">RED</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onProceedToGapAnalysis}
              className="btn bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold px-4 py-2 text-xs rounded-xl shadow-md shadow-red-500/25 hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-2"
            >
              <span>View Gap Analysis (KG2)</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Drag and Drop Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            handleUpload(e.dataTransfer.files)
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
            drag
              ? 'border-[#10b981] bg-[#10b981]/5 scale-[0.99]'
              : 'border-line hover:border-[#10b981]/60 bg-surface2/30'
          }`}
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#10b981]/10 text-[#10b981] mb-2.5">
            <UploadCloud size={24} />
          </div>
          <p className="text-sm font-semibold text-ink">
            Drag & drop your data files here
          </p>
          <p className="mt-1 text-xs text-muted max-w-sm">
            Supported formats: <strong>CSV, XLSX, PDF, TXT, DOCX, SQL</strong> (up to {MAX_MB} MB each)
          </p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn bg-[#10b981] text-white font-semibold hover:bg-[#059669] mt-3.5 px-4 py-2 text-xs shadow-sm cursor-pointer transition-all"
          >
            <FileUp size={15} />
            <span>Browse Files</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={ALLOWED.map((e) => `.${e}`).join(',')}
            onChange={(e) => {
              handleUpload(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {/* Upload Queue (in flight progress) */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Uploading ({queue.length})
            </h3>
            <div className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-line bg-surface p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate max-w-[80%] text-ink">
                      {item.name}
                    </span>
                    {item.error ? (
                      <span className="text-bad font-semibold">Failed</span>
                    ) : (
                      <span className="font-mono text-[#10b981]">{item.pct}%</span>
                    )}
                  </div>
                  {item.error ? (
                    <p className="mt-1 text-xs text-bad">{item.error}</p>
                  ) : (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                      <div
                        className="h-full bg-[#10b981] transition-all duration-200"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Files Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
              Uploaded Documents & Schemas ({fileList.length})
            </h3>
            {fileList.length > 0 && (
              <span className="text-[11px] text-muted">
                {fileList.filter((f) => f.status === 'processed').length} processed
              </span>
            )}
          </div>

          {loadingFiles ? (
            <div className="py-8">
              <Loading />
            </div>
          ) : fileList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-muted">
              No files uploaded yet. Drag and drop financial spreadsheets, ledger dumps, or SQL schemas above.
            </div>
          ) : (
            <div className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
              {fileList.map((file) => {
                const isProcessed = file.status === 'processed'
                const isProcessing = file.status === 'processing'
                const isFailed = file.status === 'failed'

                return (
                  <div
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs hover:bg-surface2/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface2 text-muted font-bold uppercase text-[10px] shrink-0 border border-line">
                        {file.ext}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {bytes(file.size_bytes)} · {timeAgo(file.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isProcessed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold border border-emerald-200">
                          <CheckCircle2 size={11} />
                          <span>Processed</span>
                        </span>
                      )}
                      {isProcessing && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-semibold border border-amber-200">
                          <Spinner size={10} />
                          <span>Parsing...</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-[10px] font-semibold border border-red-200">
                          <AlertCircle size={11} />
                          <span>Failed</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => openPreview(file.id)}
                        className="btn-ghost btn-sm text-[11px] p-1.5 cursor-pointer"
                        title="Preview data content"
                      >
                        <Eye size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(file.id, file.name)}
                        className="btn-ghost btn-sm text-[11px] p-1.5 cursor-pointer hover:!text-bad hover:!border-bad/40"
                        title="Delete file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3 bg-surface2/50">
              <span className="text-sm font-bold text-ink truncate">
                {previewFile.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="btn-ghost btn-sm text-xs cursor-pointer"
              >
                <X size={14} /> Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 text-xs scroll-thin">
              {previewFile.preview?.type === 'table' && (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface2 border-b border-line">
                      <tr>
                        {previewFile.preview.columns?.map((col) => (
                          <th key={col} className="p-2 font-semibold text-ink">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {previewFile.preview.rows?.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="p-2 text-muted truncate max-w-[200px]">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {previewFile.preview?.type === 'text' && (
                <pre className="whitespace-pre-wrap rounded-lg bg-surface2 p-3 font-mono text-[11px] text-ink">
                  {previewFile.preview.text}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

