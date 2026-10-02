import {
    Eye,
    EyeOff,
    Fingerprint,
    Loader2,
    LockKeyhole,
    Mail,
} from 'lucide-react'

import {
    type FormEvent,
    useEffect,
    useState,
} from 'react'

import {Navigate} from 'react-router-dom'

import {useAuth} from '../context/AuthContext'

export default function Login() {
    const {
        session,
        loading: authLoading,
        signIn,
    } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [showPassword, setShowPassword] =
        useState(false)

    const [loading, setLoading] = useState(false)
    const [error, setError] =
        useState<string | null>(null)

    useEffect(() => {
        setError(null)
    }, [email, password])

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-700"/>
            </div>
        )
    }

    if (session) {
        return (
            <Navigate
                to="/"
                replace
            />
        )
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()

        if (!email.trim()) {
            setError('Vui lòng nhập email.')
            return
        }

        if (!password) {
            setError('Vui lòng nhập mật khẩu.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const result = await signIn(
                email.trim(),
                password,
            )

            if (result.error) {
                setError(
                    'Email hoặc mật khẩu không chính xác.',
                )
            }
        } catch {
            setError(
                'Không thể kết nối hệ thống. Vui lòng thử lại.',
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="flex min-h-screen bg-slate-950">
            <section className="hidden w-1/2 flex-col justify-between p-12 lg:flex">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-950">
                        <Fingerprint size={24}/>
                    </div>

                    <div>
                        <h1 className="font-bold text-white">
                            AttendanceHub
                        </h1>

                        <p className="text-xs text-slate-400">
                            Attendance Management System
                        </p>
                    </div>
                </div>

                <div className="max-w-lg">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Quản lý nhân sự
                    </p>

                    <h2 className="text-5xl font-bold leading-tight tracking-tight text-white">
                        Chấm công.
                        <br/>
                        Chính xác.
                        <br/>
                        Đơn giản.
                    </h2>

                    <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
                        Theo dõi ngày công, nghỉ phép và
                        tình trạng đi trễ của nhân viên trên
                        một hệ thống duy nhất.
                    </p>
                </div>

                <p className="text-xs text-slate-600">
                    AttendanceHub
                </p>
            </section>

            <section className="flex flex-1 items-center justify-center bg-white px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="mb-10 lg:hidden">
                        <div className="flex items-center gap-3">
                            <div
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                                <Fingerprint size={22}/>
                            </div>

                            <span className="text-lg font-bold text-slate-900">
                AttendanceHub
              </span>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-slate-500">
                            HỆ THỐNG NỘI BỘ
                        </p>

                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                            Đăng nhập
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            Sử dụng tài khoản quản trị để truy
                            cập hệ thống chấm công.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="mt-8 space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Email
                            </label>

                            <div className="relative">
                                <Mail
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    placeholder="admin@company.com"
                                    disabled={loading}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Mật khẩu
                            </label>

                            <div className="relative">
                                <LockKeyhole
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    id="password"
                                    type={
                                        showPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    placeholder="••••••••"
                                    disabled={loading}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            (current) => !current,
                                        )
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-slate-700"
                                    aria-label={
                                        showPassword
                                            ? 'Ẩn mật khẩu'
                                            : 'Hiện mật khẩu'
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff size={18}/>
                                    ) : (
                                        <Eye size={18}/>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading && (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            )}

                            {loading
                                ? 'Đang đăng nhập...'
                                : 'Đăng nhập'}
                        </button>
                    </form>

                    <div className="mt-8 border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <LockKeyhole size={14}/>

                            Chỉ dành cho người được cấp quyền.
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}