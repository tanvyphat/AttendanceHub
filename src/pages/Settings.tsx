import {
    Clock3,
    Loader2,
    Save,
    Settings as SettingsIcon,
} from 'lucide-react'
import {
    type FormEvent,
    useEffect,
    useState,
} from 'react'

import TimeInput from '../components/ui/TimeInput'
import {supabase} from '../lib/supabase'
import {isValid24HourTime} from '../utils/time24'

interface CompanySettings {
    work_start_time: string
    late_after_time: string
    morning_end_time: string
    afternoon_start_time: string
    afternoon_end_time: string
}

const defaultSettings: CompanySettings = {
    work_start_time: '07:30',
    late_after_time: '07:35',
    morning_end_time: '12:00',
    afternoon_start_time: '13:30',
    afternoon_end_time: '17:00',
}

function normalizeTime(value: string | null | undefined, fallback: string) {
    return value ? value.slice(0, 5) : fallback
}

export default function Settings() {
    const [settings, setSettings] =
        useState<CompanySettings>(defaultSettings)

    const [loading, setLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [error, setError] =
        useState<string | null>(null)

    const [success, setSuccess] =
        useState<string | null>(null)

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true)
            setError(null)

            try {
                const {
                    data,
                    error: settingsError,
                } = await supabase
                    .from('company_settings')
                    .select(
                        `
                            work_start_time,
                            late_after_time,
                            morning_end_time,
                            afternoon_start_time,
                            afternoon_end_time
                        `,
                    )
                    .eq('id', 1)
                    .single()

                if (settingsError) {
                    throw settingsError
                }

                setSettings({
                    work_start_time:
                        normalizeTime(
                            data.work_start_time,
                            defaultSettings.work_start_time,
                        ),

                    late_after_time:
                        normalizeTime(
                            data.late_after_time,
                            defaultSettings.late_after_time,
                        ),

                    morning_end_time:
                        normalizeTime(
                            data.morning_end_time,
                            defaultSettings.morning_end_time,
                        ),

                    afternoon_start_time:
                        normalizeTime(
                            data.afternoon_start_time,
                            defaultSettings.afternoon_start_time,
                        ),

                    afternoon_end_time:
                        normalizeTime(
                            data.afternoon_end_time,
                            defaultSettings.afternoon_end_time,
                        ),
                })
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể tải cài đặt hệ thống.',
                )
            } finally {
                setLoading(false)
            }
        }

        void loadSettings()
    }, [])

    const updateSetting = (
        key: keyof CompanySettings,
        value: string,
    ) => {
        setSettings((current) => ({
            ...current,
            [key]: value,
        }))

        setSuccess(null)
    }

    const validateSettings = () => {
        const {
            work_start_time,
            late_after_time,
            morning_end_time,
            afternoon_start_time,
            afternoon_end_time,
        } = settings

        if (
            !work_start_time ||
            !late_after_time ||
            !morning_end_time ||
            !afternoon_start_time ||
            !afternoon_end_time
        ) {
            return 'Vui lòng nhập đầy đủ tất cả mốc giờ.'
        }

        const allTimes = [
            work_start_time,
            late_after_time,
            morning_end_time,
            afternoon_start_time,
            afternoon_end_time,
        ]

        if (
            !allTimes.every(
                isValid24HourTime,
            )
        ) {
            return 'Giờ phải theo định dạng 24H HH:mm, ví dụ 07:30 hoặc 17:00.'
        }

        if (
            work_start_time >=
            morning_end_time
        ) {
            return 'Giờ vào ca sáng phải trước giờ kết thúc ca sáng.'
        }

        if (
            late_after_time <
            work_start_time
        ) {
            return 'Mốc tính đi trễ không thể sớm hơn giờ vào ca sáng.'
        }

        if (
            late_after_time >=
            morning_end_time
        ) {
            return 'Mốc tính đi trễ phải nằm trong ca sáng.'
        }

        if (
            morning_end_time >
            afternoon_start_time
        ) {
            return 'Giờ bắt đầu ca chiều không thể sớm hơn giờ kết thúc ca sáng.'
        }

        if (
            afternoon_start_time >=
            afternoon_end_time
        ) {
            return 'Giờ vào ca chiều phải trước giờ kết thúc ca chiều.'
        }

        return null
    }

    const handleSave = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()

        const validationError =
            validateSettings()

        if (validationError) {
            setError(validationError)
            setSuccess(null)
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const {
                data,
                error: updateError,
            } = await supabase
                .from('company_settings')
                .update({
                    work_start_time:
                        settings.work_start_time,

                    late_after_time:
                        settings.late_after_time,

                    morning_end_time:
                        settings.morning_end_time,

                    afternoon_start_time:
                        settings.afternoon_start_time,

                    afternoon_end_time:
                        settings.afternoon_end_time,
                })
                .eq('id', 1)
                .select(
                    `
                        work_start_time,
                        late_after_time,
                        morning_end_time,
                        afternoon_start_time,
                        afternoon_end_time
                    `,
                )
                .single()

            if (updateError) {
                throw updateError
            }

            setSettings({
                work_start_time:
                    normalizeTime(
                        data.work_start_time,
                        defaultSettings.work_start_time,
                    ),

                late_after_time:
                    normalizeTime(
                        data.late_after_time,
                        defaultSettings.late_after_time,
                    ),

                morning_end_time:
                    normalizeTime(
                        data.morning_end_time,
                        defaultSettings.morning_end_time,
                    ),

                afternoon_start_time:
                    normalizeTime(
                        data.afternoon_start_time,
                        defaultSettings.afternoon_start_time,
                    ),

                afternoon_end_time:
                    normalizeTime(
                        data.afternoon_end_time,
                        defaultSettings.afternoon_end_time,
                    ),
            })

            setSuccess(
                'Đã lưu cài đặt giờ làm việc.',
            )
        } catch (err) {
            console.error(err)

            setError(
                'Không thể lưu cài đặt hệ thống.',
            )
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-400"/>

                    <p className="mt-4 text-sm font-medium text-slate-500">
                        Đang tải cài đặt...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <p className="text-sm font-medium text-slate-500">
                    Hệ thống
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Cài đặt
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Quản lý giờ làm việc và mốc xác định đi trễ theo định dạng 24H (HH:mm).
                </p>
            </div>

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {success}
                </div>
            )}

            <form
                onSubmit={handleSave}
                className="space-y-6"
            >
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                            <SettingsIcon size={20}/>
                        </div>

                        <div>
                            <h2 className="font-bold text-slate-900">
                                Thời gian làm việc
                            </h2>

                            <p className="mt-1 text-xs text-slate-400">
                                Các mốc giờ này được lưu trực tiếp trong Supabase.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 p-6 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 p-5">
                            <div className="mb-5">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Ca sáng
                                </p>

                                <p className="mt-2 text-lg font-bold text-slate-900">
                                    {settings.work_start_time} — {settings.morning_end_time}
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Giờ vào làm
                                    </label>

                                    <TimeInput
                                        value={settings.work_start_time}
                                        onChange={(value) =>
                                            updateSetting(
                                                'work_start_time',
                                                value,
                                            )
                                        }
                                        aria-label="work_start_time"
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Kết thúc ca sáng
                                    </label>

                                    <TimeInput
                                        value={settings.morning_end_time}
                                        onChange={(value) =>
                                            updateSetting(
                                                'morning_end_time',
                                                value,
                                            )
                                        }
                                        aria-label="morning_end_time"
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
                                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                                    <Clock3 size={16}/>
                                    Bắt đầu tính đi trễ sau
                                </label>

                                <TimeInput
                                        value={settings.late_after_time}
                                        onChange={(value) =>
                                            updateSetting(
                                                'late_after_time',
                                                value,
                                            )
                                        }
                                        aria-label="late_after_time"
                                        className="h-11 w-full cursor-pointer rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-amber-900 outline-none transition focus:ring-4 focus:ring-amber-100"
                                    />

                                <p className="mt-2 text-xs leading-5 text-amber-700">
                                    Đúng {settings.late_after_time} vẫn được tính đúng giờ. Từ phút tiếp theo mới tính là đi trễ.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-5">
                            <div className="mb-5">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Ca chiều
                                </p>

                                <p className="mt-2 text-lg font-bold text-slate-900">
                                    {settings.afternoon_start_time} — {settings.afternoon_end_time}
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Giờ vào làm
                                    </label>

                                    <TimeInput
                                        value={settings.afternoon_start_time}
                                        onChange={(value) =>
                                            updateSetting(
                                                'afternoon_start_time',
                                                value,
                                            )
                                        }
                                        aria-label="afternoon_start_time"
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Kết thúc ca chiều
                                    </label>

                                    <TimeInput
                                        value={settings.afternoon_end_time}
                                        onChange={(value) =>
                                            updateSetting(
                                                'afternoon_end_time',
                                                value,
                                            )
                                        }
                                        aria-label="afternoon_end_time"
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                    <p className="text-sm leading-6 text-blue-800">
                        <strong>Lưu ý:</strong> thay đổi mốc giờ sẽ áp dụng cho các lần chấm công mới hoặc bản ghi được chỉnh sửa sau đó. Các bản ghi lịch sử đã lưu vẫn giữ trạng thái đi trễ đã được ghi nhận trước đó.
                    </p>
                </section>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2
                                size={18}
                                className="animate-spin"
                            />
                        ) : (
                            <Save size={18}/>
                        )}

                        {saving
                            ? 'Đang lưu...'
                            : 'Lưu cài đặt'}
                    </button>
                </div>
            </form>
        </div>
    )
}
