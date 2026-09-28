export function occupiedCount(bookings: { status: string }[]) {
  return bookings.filter((row) => row.status === 'checked_in').length
}

export function monthRevenue(
  bookings: { status: string; total: number; checkIn: string }[],
  month: Date,
) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  return bookings.reduce((sum, row) => {
    if (row.status === 'cancelled' || row.status === 'pending') return sum
    const checkIn = new Date(row.checkIn)
    if (Number.isNaN(checkIn.getTime())) return sum
    if (checkIn.getFullYear() !== year || checkIn.getMonth() !== monthIndex) return sum
    return sum + (Number.isFinite(row.total) ? row.total : 0)
  }, 0)
}

export function bookedVsCancelled(days: Array<{ booked: number; cancelled: number }>) {
  return days.reduce(
    (acc, day) => ({
      booked: acc.booked + day.booked,
      cancelled: acc.cancelled + day.cancelled,
    }),
    { booked: 0, cancelled: 0 },
  )
}

export function availabilityCounts(
  rooms: { status: string }[],
  inHouse: number,
) {
  const available = rooms.filter((row) => row.status === 'available').length
  const notReady = rooms.filter((row) => row.status === 'unavailable').length
  const occupied = Math.max(0, inHouse)
  return {
    available: Math.max(0, available - occupied),
    occupied,
    booked: 0,
    notReady,
  }
}
