import { extractNotification } from '../extraction/extractor.js'
import type { AiClient } from '../provider/ai-client.js'
import type { NotifyClient } from '../provider/notify-client.js'
import type { RequestStore } from './store.js'

export interface ProcessDeps {
  store: RequestStore
  ai: AiClient
  notifier: NotifyClient
}

// Starts a request that is queued, or failed and therefore never sent. Returns whether it was started.
export function startProcessing(deps: ProcessDeps, id: string): boolean {
  const status = deps.store.get(id)?.status
  if (status !== 'queued' && status !== 'failed') return false

  deps.store.updateStatus(id, 'processing')
  processRequest(deps, id).catch((err) => console.error(`Request ${id} crashed`, err))
  return true
}

export async function processRequest({ store, ai, notifier }: ProcessDeps, id: string): Promise<void> {
  const request = store.get(id)
  if (!request) return

  try {
    const notification = await extractNotification(ai, request.userInput)
    await notifier.send(notification)
    store.updateStatus(id, 'sent')
  } catch (err) {
    store.updateStatus(id, 'failed')
    console.warn(`Request ${id} failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
