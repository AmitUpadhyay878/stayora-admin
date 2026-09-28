import { createServerFn } from '@tanstack/react-start'
import { requireModule } from '~/lib/auth'
import {
  createSubAdmin,
  deleteSubAdmin,
  listSubAdmins,
  updateSubAdmin,
} from '~/lib/user-repo'
import { idSchema, staffCreateSchema, staffListSchema, staffUpdateSchema } from '~/lib/validators'

export const listStaffFn = createServerFn({ method: 'POST' })
  .inputValidator(staffListSchema)
  .handler(async ({ data }) => {
    await requireModule('staff')
    return listSubAdmins({
      name: data.name,
      email: data.email,
      hotelId: data.hotelId,
      active: data.active,
    })
  })

export const createStaffFn = createServerFn({ method: 'POST' })
  .inputValidator(staffCreateSchema)
  .handler(async ({ data }) => {
    await requireModule('staff')
    return createSubAdmin(data)
  })

export const updateStaffFn = createServerFn({ method: 'POST' })
  .inputValidator(staffUpdateSchema)
  .handler(async ({ data }) => {
    await requireModule('staff')
    return updateSubAdmin({
      id: data.id,
      name: data.name,
      email: data.email,
      active: data.active,
      hotelId: data.hotelId,
      password: data.password || undefined,
    })
  })

export const deleteStaffFn = createServerFn({ method: 'POST' })
  .inputValidator(idSchema)
  .handler(async ({ data }) => {
    await requireModule('staff')
    await deleteSubAdmin(data.id)
    return { ok: true }
  })
