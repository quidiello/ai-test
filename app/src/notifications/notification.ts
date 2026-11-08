import { z } from 'zod'

export const notificationSchema = z.object({
  to: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['email', 'sms']),
})

export type Notification = z.infer<typeof notificationSchema>
