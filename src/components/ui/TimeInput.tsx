import {
    type InputHTMLAttributes,
    type KeyboardEvent,
} from 'react'

interface TimeInputProps
    extends Omit<
        InputHTMLAttributes<HTMLInputElement>,
        | 'type'
        | 'value'
        | 'onChange'
        | 'inputMode'
        | 'maxLength'
        | 'pattern'
    > {
    value: string
    onChange: (value: string) => void
}

function formatDigits(
    digits: string,
) {
    if (digits.length < 2) {
        return digits
    }

    const hours =
        digits.slice(0, 2)

    if (digits.length === 2) {
        return `${hours}:`
    }

    return `${hours}:${digits.slice(
        2,
        4,
    )}`
}

function isAllowedDigits(
    digits: string,
) {
    if (
        digits.length >= 2 &&
        Number(
            digits.slice(0, 2),
        ) > 23
    ) {
        return false
    }

    if (
        digits.length >= 3 &&
        Number(digits[2]) > 5
    ) {
        return false
    }

    if (
        digits.length === 4 &&
        Number(
            digits.slice(2, 4),
        ) > 59
    ) {
        return false
    }

    return true
}

export default function TimeInput({
    value,
    onChange,
    placeholder = 'HH:mm',
    className = '',
    ...props
}: TimeInputProps) {
    const handleChange = (
        nextValue: string,
    ) => {
        const digits =
            nextValue
                .replace(/\D/g, '')
                .slice(0, 4)

        if (
            !isAllowedDigits(
                digits,
            )
        ) {
            return
        }

        onChange(
            formatDigits(
                digits,
            ),
        )
    }

    const handleKeyDown = (
        event:
            KeyboardEvent<HTMLInputElement>,
    ) => {
        if (
            event.key !==
                'Backspace' ||
            event.currentTarget
                .selectionStart !== 3 ||
            event.currentTarget
                .selectionEnd !== 3 ||
            value[2] !== ':'
        ) {
            return
        }

        event.preventDefault()

        const digits =
            value.replace(
                /\D/g,
                '',
            )

        onChange(
            formatDigits(
                digits.slice(
                    0,
                    Math.max(
                        0,
                        digits.length -
                            1,
                    ),
                ),
            ),
        )
    }

    return (
        <input
            {...props}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            placeholder={placeholder}
            value={value}
            onChange={(event) =>
                handleChange(
                    event.target.value,
                )
            }
            onKeyDown={
                handleKeyDown
            }
            className={[
                'cursor-pointer tabular-nums',
                className,
            ].join(' ')}
        />
    )
}
