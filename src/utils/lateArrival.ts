/**
 * Attendance lateness policy:
 * - Oct 1–12, 2026: Nguyễn Thị Thủy Tiên may check in through 09:00.
 * - From Oct 13, 2026: Nguyễn Thị Thủy Tiên through 08:15; others through 07:45.
 * - Before Oct 1, preserve the legacy company setting.
 * The threshold itself is on time; only a later check-in is late.
 */
export const SPECIAL_LATE_EMPLOYEE = 'Nguyễn Thị Thủy Tiên'
export const SPECIAL_RULE_START_DATE = '2026-10-01'
export const LATE_RULE_EFFECTIVE_DATE = '2026-10-13'

export function getLateThreshold(
    fullName: string | null | undefined,
    workDate: string,
    legacyThreshold = '07:45',
) {
    const isSpecialEmployee = fullName?.trim().normalize('NFC') === SPECIAL_LATE_EMPLOYEE

    if (workDate >= SPECIAL_RULE_START_DATE && workDate < LATE_RULE_EFFECTIVE_DATE && isSpecialEmployee) {
        return '09:00'
    }

    if (workDate < LATE_RULE_EFFECTIVE_DATE) return legacyThreshold

    return isSpecialEmployee ? '08:15' : '07:45'
}

export function isLateArrival(
    checkIn: string | null | undefined,
    fullName: string | null | undefined,
    workDate: string,
    legacyThreshold = '07:45',
) {
    if (!checkIn) return false
    return checkIn.slice(0, 5) > getLateThreshold(fullName, workDate, legacyThreshold)
}
