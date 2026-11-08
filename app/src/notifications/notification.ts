export interface Notification {
  to: string
  message: string
  type: 'email' | 'sms'
}
