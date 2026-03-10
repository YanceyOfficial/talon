import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { useCallback, useRef, useState } from 'react'

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'up-to-date'

export function useUpdater() {
  const [state, setState] = useState<UpdateState>('idle')
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const updateRef = useRef<Update | null>(null)

  const checkForUpdate = useCallback(async () => {
    setState('checking')
    setErrorMsg(null)
    try {
      const update = await check()
      if (update) {
        updateRef.current = update
        setAvailableVersion(update.version)
        setState('available')
        return true
      } else {
        setState('up-to-date')
        return false
      }
    } catch (e) {
      const msg = String(e)
      setErrorMsg(
        msg.includes('release JSON') || msg.includes('404') || msg.includes('fetch')
          ? 'No releases published yet.'
          : msg
      )
      setState('error')
      return false
    }
  }, [])

  const downloadAndInstall = useCallback(async () => {
    const update = updateRef.current
    if (!update) return
    setState('downloading')
    setDownloadProgress(0)

    try {
      let downloaded = 0
      let total = 0
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength
          setDownloadProgress(
            total > 0 ? Math.round((downloaded / total) * 100) : 0
          )
        } else if (event.event === 'Finished') {
          setDownloadProgress(100)
        }
      })
      setState('ready')
    } catch (e) {
      setErrorMsg(String(e))
      setState('error')
    }
  }, [])

  const restart = useCallback(async () => {
    await relaunch()
  }, [])

  return {
    state,
    availableVersion,
    downloadProgress,
    errorMsg,
    checkForUpdate,
    downloadAndInstall,
    restart
  }
}
