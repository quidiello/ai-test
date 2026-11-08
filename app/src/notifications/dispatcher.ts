import type { NotifyClient } from '../provider/notify-client.js'
import { isTransientError, retryDelay } from '../provider/provider-error.js'
import type { Notification } from './notification.js'

export interface DispatcherOptions {
  ratePerSecond: number
  maxAttempts: number
  retryBaseDelayMs: number
}

interface Job {
  notification: Notification
  attempt: number
  resolve: () => void
  reject: (err: unknown) => void
}

export class NotificationDispatcher implements NotifyClient {
  private readonly queue: Job[] = []
  private readonly intervalMs: number
  private nextSlotAt = 0
  private timer: NodeJS.Timeout | undefined

  constructor(
    private readonly notifier: NotifyClient,
    private readonly options: DispatcherOptions,
  ) {
    this.intervalMs = 1000 / options.ratePerSecond
  }

  send(notification: Notification): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ notification, attempt: 1, resolve, reject })
      this.schedule()
    })
  }

  private schedule(): void {
    if (this.timer || this.queue.length === 0) return

    const wait = this.nextSlotAt - Date.now()
    if (wait <= 0) {
      this.dispatchNext()
      this.schedule()
      return
    }
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.dispatchNext()
      this.schedule()
    }, wait)
  }

  private dispatchNext(): void {
    const job = this.queue.shift()
    if (!job) return

    this.nextSlotAt = Date.now() + this.intervalMs
    void this.attempt(job)
  }

  private async attempt(job: Job): Promise<void> {
    try {
      await this.notifier.send(job.notification)
      job.resolve()
    } catch (err) {
      if (!isTransientError(err) || job.attempt >= this.options.maxAttempts) {
        job.reject(err)
        return
      }
      setTimeout(() => {
        this.queue.unshift({ ...job, attempt: job.attempt + 1 })
        this.schedule()
      }, retryDelay(this.options.retryBaseDelayMs, job.attempt))
    }
  }
}
