import type { Notification } from '../notifications/notification.js'

type Channel = Notification['type']

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const PHONE = /\+?\d(?:[\s-]?\d){8,14}/
const RECIPIENT = new RegExp(`${EMAIL.source}|${PHONE.source}`, 'g')

export function channelOf(recipient: string): Channel | undefined {
  if (fullMatch(EMAIL, recipient)) return 'email'
  if (fullMatch(PHONE, recipient)) return 'sms'
  return undefined
}

export function findRecipients(text: string): string[] {
  return text.match(RECIPIENT) ?? []
}

export function isMentionedIn(recipient: string, text: string): boolean {
  const key = comparable(recipient)
  return findRecipients(text).some((candidate) => comparable(candidate) === key)
}

function comparable(recipient: string): string {
  return channelOf(recipient) === 'sms' ? recipient.replace(/\D/g, '') : recipient.toLowerCase()
}

function fullMatch(pattern: RegExp, text: string): boolean {
  return new RegExp(`^(?:${pattern.source})$`).test(text)
}
