import {
    AlertTriangle,
    Loader2,
    X,
} from 'lucide-react'
import {
    useEffect,
} from 'react'

interface ConfirmDialogProps {
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    loading?: boolean
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Hủy',
    danger = false,
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (
                event.key === 'Escape' &&
                !loading
            ) {
                onCancel()
            }
        }

        window.addEventListener(
            'keydown',
            handleKeyDown,
        )

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown,
            )
        }
    }, [
        open,
        loading,
        onCancel,
    ])

    if (!open) {
        return null
    }

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                        event.currentTarget &&
                    !loading
                ) {
                    onCancel()
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
                className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                <div className="flex items-start gap-4 p-6">
                    <div
                        className={[
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                            danger
                                ? 'bg-red-50 text-red-600'
                                : 'bg-amber-50 text-amber-600',
                        ].join(' ')}
                    >
                        <AlertTriangle
                            size={22}
                        />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2
                            id="confirm-dialog-title"
                            className="text-lg font-bold text-slate-950"
                        >
                            {title}
                        </h2>

                        <p
                            id="confirm-dialog-description"
                            className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500"
                        >
                            {description}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        aria-label="Đóng"
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X size={18}/>
                    </button>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={[
                            'flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60',
                            danger
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-slate-950 hover:bg-slate-800',
                        ].join(' ')}
                    >
                        {loading && (
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                        )}

                        {loading
                            ? 'Đang xử lý...'
                            : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
