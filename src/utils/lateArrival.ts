/**
 * Generic lateness calculation.
 *
 * Employee/date-specific schedules are resolved by the database. The legacy
 * threshold parameter is kept so existing callers remain compatible while
 * the hard-coded employee rule is removed from the frontend.
 */
export function getLateThreshold(
    fullName: string | null | undefined,
    workDate: string,
    legacyThreshold = '07:45',
) {
    void fullName
    void workDate

    return legacyThreshold
}

export function isLateArrival(
    checkIn: string | null | undefined,
    fullName: string | null | undefined,
    workDate: string,
    legacyThreshold = '07:45',
) {
    if (!checkIn) return false

    return checkIn.slice(0, 5) > getLateThreshold(
        fullName,
        workDate,
        legacyThreshold,
    )
}
