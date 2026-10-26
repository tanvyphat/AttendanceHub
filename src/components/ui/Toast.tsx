import {
    AlertCircle,
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
    variant?: 'success' | 'error'
}

const TOAST_DURATION = 4000

export default function Toast({
    message,
    onClose,
    variant = 'success',
}: ToastProps) {
    useEffect(() => {
        if (!message) return

        const timer = window.setTimeout(onClose, TOAST_DURATION)
        return () => window.clearTimeout(timer)
    }, [message, onClose])

    if (!message) return null

    const isError = variant === 'error'

    return (
        <div
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className="fixed right-5 top-5 z-[100] w-[calc(100%-2.5rem)] max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/10"
        >
            <div className="flex items-start gap-3 p-4">
                <div
                    className={[
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        isError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
                    ].join(' ')}
                >
                    {isError ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>} 
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-bold text-slate-950">
                        {isError ? 'Có lỗi xảy ra' : 'Thành công'}
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

            <div className={['h-1 overflow-hidden', isError ? 'bg-red-100' : 'bg-emerald-100'].join(' ')}>
                <div
                    key={`${variant}-${message}`}
                    className={['h-full w-full origin-left', isError ? 'bg-red-500' : 'bg-emerald-500'].join(' ')}
                    style={{animation: `attendance-toast-progress ${TOAST_DURATION}ms linear forwards`}}
                />
            </div>

            <style>
                {`
                    @keyframes attendance-toast-progress {
                        from { transform: scaleX(1); }
                        to { transform: scaleX(0); }
                    }
                `}
            </style>
        </div>
    )
}
