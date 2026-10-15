/**
 * Attendance lateness policy effective from 2026-10-13.
 * The threshold itself is on time; only a later check-in is late.
 * Before the effective date, preserve the company setting in force.
 */
export const LATE_RULE_EFFECTIVE_DATE = '2026-10-13'
export const SPECIAL_LATE_EMPLOYEE = 'Nguyễn Thị Thủy Tiên'

export function getLateThreshold(
    fullName: string | null | undefined,
    workDate: string,
    legacyThreshold = '07:45',
) {
    if (workDate < LATE_RULE_EFFECTIVE_DATE) return legacyThreshold
    return fullName?.trim().normalize('NFC') === SPECIAL_LATE_EMPLOYEE
        ? '08:15'
        : '07:45'
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
