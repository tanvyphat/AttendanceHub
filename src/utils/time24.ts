export function isValid24HourTime(value: string) {
    return /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(
        value,
    )
}

export function normalize24HourTime(
    value: string,
) {
    const trimmed = value.trim()

    if (!trimmed) {
        return ''
    }

    const match = trimmed.match(
        /^(\d{1,2}):(\d{1,2})$/,
    )

    if (!match) {
        return trimmed
    }

    const hours = Number(match[1])
    const minutes = Number(match[2])

    if (
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return trimmed
    }

    return `${String(hours).padStart(2, '0')}:${String(
        minutes,
    ).padStart(2, '0')}`
}
