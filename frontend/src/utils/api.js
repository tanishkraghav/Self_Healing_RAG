import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export const queryDocuments = async (query) => {
  const { data } = await api.post('/query', { query })
  return data
}

export const uploadDocument = async (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })
  return data
}

export const listDocuments = async () => {
  const { data } = await api.get('/documents')
  return data
}

export const deleteDocument = async (filename) => {
  const { data } = await api.delete(`/documents/${encodeURIComponent(filename)}`)
  return data
}

export const getHealth = async () => {
  const { data } = await api.get('/health')
  return data
}
