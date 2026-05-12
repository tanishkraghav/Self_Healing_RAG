import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadDocument, deleteDocument } from '../utils/api'

function FileItem({ file, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(file)
    } finally {
      setDeleting(false)
    }
  }

  const ext = file.split('.').pop().toUpperCase()
  const extColors = { PDF: '#ff4d6d', TXT: '#38bdf8', MD: '#a78bfa' }
  const color = extColors[ext] || '#8892a4'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 12px',
      background: 'var(--bg-surface)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-dim)',
    }}>
      <div style={{
        width: '28px', height: '28px',
        background: `${color}15`,
        border: `1px solid ${color}30`,
        borderRadius: 'var(--radius-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '8px', fontWeight: 700,
        color, fontFamily: 'var(--font-mono)',
        flexShrink: 0,
      }}>
        {ext}
      </div>
      <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file}
      </span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-dim)',
          fontSize: '16px',
          lineHeight: 1,
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          transition: 'color 0.2s',
          cursor: deleting ? 'wait' : 'pointer',
        }}
        onMouseEnter={e => e.target.style.color = '#ff4d6d'}
        onMouseLeave={e => e.target.style.color = 'var(--text-dim)'}
      >
        {deleting ? '…' : '×'}
      </button>
    </div>
  )
}

export default function DocumentUploader({ documents, onDocumentsChange }) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [lastUploaded, setLastUploaded] = useState(null)

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return
    setUploading(true)
    setError(null)
    setLastUploaded(null)

    for (const file of acceptedFiles) {
      try {
        const result = await uploadDocument(file, setUploadProgress)
        setLastUploaded({ filename: result.filename, chunks: result.chunks })
        onDocumentsChange()
      } catch (err) {
        setError(err.response?.data?.detail || 'Upload failed')
      }
    }
    setUploading(false)
    setUploadProgress(0)
  }, [onDocumentsChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], 'text/markdown': ['.md'] },
    disabled: uploading,
  })

  const handleDelete = async (filename) => {
    try {
      await deleteDocument(filename)
      onDocumentsChange()
    } catch {
      setError('Failed to delete document')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `1px dashed ${isDragActive ? 'var(--acid-green)' : 'var(--border-mid)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '24px 16px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          background: isDragActive ? 'var(--acid-green-dim)' : 'var(--bg-surface)',
          transition: 'all 0.2s ease',
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.6 }}>⬆</div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {isDragActive
            ? 'Drop to ingest...'
            : 'Drop files or click to upload'}
        </p>
        <p style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
          .pdf · .txt · .md
        </p>
      </div>

      {/* Progress */}
      {uploading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Processing...</span>
            <span style={{ fontSize: '11px', color: 'var(--acid-green)', fontFamily: 'var(--font-mono)' }}>{uploadProgress}%</span>
          </div>
          <div style={{ height: '2px', background: 'var(--border-dim)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${uploadProgress}%`,
              background: 'var(--acid-green)',
              borderRadius: '1px',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 8px var(--acid-green-glow)',
            }} />
          </div>
        </div>
      )}

      {/* Success */}
      {lastUploaded && !uploading && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--acid-green-dim)',
          border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px', color: 'var(--acid-green)',
          fontFamily: 'var(--font-mono)',
        }}>
          ✓ {lastUploaded.filename} → {lastUploaded.chunks} chunks indexed
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--red-err-dim)',
          border: '1px solid rgba(255,77,109,0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px', color: 'var(--red-err)',
          fontFamily: 'var(--font-mono)',
        }}>
          ✗ {error}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: '2px' }}>
            INDEXED · {documents.length} file{documents.length !== 1 ? 's' : ''}
          </div>
          {documents.map(f => (
            <FileItem key={f} file={f} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {documents.length === 0 && !uploading && (
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          // no documents indexed
        </p>
      )}
    </div>
  )
}
