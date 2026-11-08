export type RequestStatus = 'queued' | 'processing' | 'sent' | 'failed'

export interface NotificationRequest {
  id: string
  userInput: string
  status: RequestStatus
}

export class RequestStore {
  private readonly requests = new Map<string, NotificationRequest>()

  create(userInput: string): NotificationRequest {
    const request: NotificationRequest = { id: crypto.randomUUID(), userInput, status: 'queued' }
    this.requests.set(request.id, request)
    return request
  }

  get(id: string): NotificationRequest | undefined {
    return this.requests.get(id)
  }

  updateStatus(id: string, status: RequestStatus): void {
    const request = this.requests.get(id)
    if (request) request.status = status
  }
}
