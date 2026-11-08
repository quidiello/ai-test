import type { Notification } from '../notifications/notification.js'

type Channel = Notification['type']

const MIN_PHONE_DIGITS = 9
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const PHONE = /\+?\d(?:[\s-]?\d){8,14}/
const RECIPIENT = new RegExp(`${EMAIL.source}|${PHONE.source}`, 'g')
const WHOLE_EMAIL = new RegExp(`^(?:${EMAIL.source})$`)
const WHOLE_PHONE = new RegExp(`^(?:${PHONE.source})$`)

export function channelOf(recipient: string): Channel | undefined {
  if (WHOLE_EMAIL.test(recipient)) return 'email'
  if (WHOLE_PHONE.test(recipient)) return 'sms'
  return undefined
}

export function findRecipients(text: string): string[] {
  return text.match(RECIPIENT) ?? []
}

export function isMentionedIn(recipient: string, text: string): boolean {
  return findRecipients(text).some((candidate) => sameRecipient(recipient, candidate))
}

function sameRecipient(a: string, b: string): boolean {
  if (channelOf(a) === 'sms' && channelOf(b) === 'sms') return samePhone(a, b)
  return a.toLowerCase() === b.toLowerCase()
}

// Compares digits only and accepts a country prefix on either side: "+34 600 111 222" is "600-111-222".
function samePhone(a: string, b: string): boolean {
  const [shorter, longer] = [digitsOf(a), digitsOf(b)].sort((x, y) => x.length - y.length)
  return shorter.length >= MIN_PHONE_DIGITS && longer.endsWith(shorter)
}

function digitsOf(phone: string): string {
  return phone.replace(/\D/g, '')
}
