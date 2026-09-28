import { createServerFn } from '@tanstack/react-start'
import { requireModule } from '~/lib/auth'
import { idSchema, paymentListSchema } from '~/lib/validators'

export const listPaymentsFn = createServerFn({ method: 'POST' })
  .inputValidator(paymentListSchema)
  .handler(async ({ data }) => {
    await requireModule('payments')
    return {
      items: [] as Array<Record<string, never>>,
      total: 0,
      page: data.page,
      pageSize: data.pageSize,
    }
  })

export const markPaymentPaidFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async () => {
    await requireModule('payments')
    return { ok: false }
  })

export const markPaymentRefundedFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async () => {
    await requireModule('payments')
    return { ok: false }
  })
