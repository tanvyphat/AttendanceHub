import {
    CheckCircle2,
    X,
} from 'lucide-react'
import {
    useEffect,
} from 'react'

interface ToastProps {
    message: string | null
    duration?: number
    onClose: () => void
}

export default function Toast({
    message,
    duration = 3000,
    onClose,
}: ToastProps) {
    useEffect(() => {
        if (!message) {
            return
        }

        const timer =
            window.setTimeout(
                onClose,
                duration,
            )

        return () => {
            window.clearTimeout(
                timer,
            )
        }
    }, [
        message,
        duration,
        onClose,
    ])

    if (!message) {
        return null
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed right-5 top-5 z-[90] w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl shadow-slate-950/10"
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2
                        size={20}
                    />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-bold text-slate-950">
                        Thành công
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-600">
                        {message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng thông báo"
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <X size={17}/>
                </button>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-emerald-100">
                <div
                    key={message}
                    className="h-full w-full origin-left bg-emerald-500"
                    style={{
                        animation:
                            `attendance-toast-progress ${duration}ms linear forwards`,
                    }}
                />
            </div>

            <style>
                {`
                    @keyframes attendance-toast-progress {
                        from {
                            transform: scaleX(1);
                        }

                        to {
                            transform: scaleX(0);
                        }
                    }
                `}
            </style>
        </div>
    )
}
