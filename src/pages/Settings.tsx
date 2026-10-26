import {
    CalendarRange,
    Clock3,
    Loader2,
    Plus,
    Save,
    Settings as SettingsIcon,
    Trash2,
    UserRound,
} from 'lucide-react'
import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import ConfirmDialog from '../components/ui/ConfirmDialog'
import TimeInput from '../components/ui/TimeInput'
import Toast from '../components/ui/Toast'
import {supabase} from '../lib/supabase'
import {isValid24HourTime} from '../utils/time24'

interface CompanySettings {
    work_start_time: string
    late_after_time: string
    morning_end_time: string
    afternoon_start_time: string
    afternoon_end_time: string
}

interface Employee {
    id: string
    employee_code: string
    full_name: string
}

interface EmployeeSchedule {
    id: number
    employee_id: string
    effective_from: string
    effective_to: string | null
    work_start_time: string
    late_after_time: string
    morning_end_time: string
    afternoon_start_time: string
    afternoon_end_time: string
}

interface ScheduleForm {
    employee_id: string
    effective_from: string
    effective_to: string
    work_start_time: string
    late_after_time: string
    morning_end_time: string
    afternoon_start_time: string
    afternoon_end_time: string
}

interface ToastState {
    message: string
    variant: 'success' | 'error'
}

const defaultSettings: CompanySettings = {
    work_start_time: '07:30',
    late_after_time: '07:45',
    morning_end_time: '12:00',
    afternoon_start_time: '13:30',
    afternoon_end_time: '17:00',
}

function normalizeTime(
    value: string | null | undefined,
    fallback: string,
) {
    return value ? value.slice(0, 5) : fallback
}

function toDateInput(value: string | null | undefined) {
    return value ? value.slice(0, 10) : ''
}

function scheduleFromCompany(
    employeeId: string,
    settings: CompanySettings,
): ScheduleForm {
    return {
        employee_id: employeeId,
        effective_from: new Date().toISOString().slice(0, 10),
        effective_to: '',
        work_start_time: settings.work_start_time,
        late_after_time: settings.late_after_time,
        morning_end_time: settings.morning_end_time,
        afternoon_start_time: settings.afternoon_start_time,
        afternoon_end_time: settings.afternoon_end_time,
    }
}

export default function Settings() {
    const [settings, setSettings] = useState<CompanySettings>(defaultSettings)
    const [employees, setEmployees] = useState<Employee[]>([])
    const [schedules, setSchedules] = useState<EmployeeSchedule[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savingSchedule, setSavingSchedule] = useState(false)
    const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null)
    const [scheduleForm, setScheduleForm] = useState<ScheduleForm | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<EmployeeSchedule | null>(null)
    const [toast, setToast] = useState<ToastState | null>(null)

    const closeToast = useCallback(() => setToast(null), [])

    const showToast = useCallback((message: string, variant: ToastState['variant'] = 'success') => {
        setToast({message, variant})
    }, [])

    const employeeNameById = useMemo(
        () => new Map(employees.map((employee) => [employee.id, employee.full_name])),
        [employees],
    )

    const loadSettings = async () => {
        const {data, error} = await supabase
            .from('company_settings')
            .select('work_start_time, late_after_time, morning_end_time, afternoon_start_time, afternoon_end_time')
            .eq('id', 1)
            .single()

        if (error) throw error

        setSettings({
            work_start_time: normalizeTime(data.work_start_time, defaultSettings.work_start_time),
            late_after_time: normalizeTime(data.late_after_time, defaultSettings.late_after_time),
            morning_end_time: normalizeTime(data.morning_end_time, defaultSettings.morning_end_time),
            afternoon_start_time: normalizeTime(data.afternoon_start_time, defaultSettings.afternoon_start_time),
            afternoon_end_time: normalizeTime(data.afternoon_end_time, defaultSettings.afternoon_end_time),
        })
    }

    const loadEmployees = async () => {
        const {data, error} = await supabase
            .from('employees')
            .select('id, employee_code, full_name')
            .eq('is_active', true)
            .order('employee_code')

        if (error) throw error
        setEmployees((data ?? []) as Employee[])
    }

    const loadSchedules = async () => {
        const {data, error} = await supabase
            .from('employee_work_schedules')
            .select('id, employee_id, effective_from, effective_to, work_start_time, late_after_time, morning_end_time, afternoon_start_time, afternoon_end_time')
            .order('effective_from', {ascending: false})
            .order('id', {ascending: false})

        if (error) throw error
        setSchedules((data ?? []) as EmployeeSchedule[])
    }

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                await Promise.all([loadSettings(), loadEmployees(), loadSchedules()])
            } catch (error) {
                console.error(error)
                showToast('Không thể tải cài đặt hệ thống.', 'error')
            } finally {
                setLoading(false)
            }
        }

        void load()
    }, [showToast])

    const updateSetting = (key: keyof CompanySettings, value: string) => {
        setSettings((current) => ({...current, [key]: value}))
    }

    const validateTimes = (values: CompanySettings | ScheduleForm) => {
        const {
            work_start_time,
            late_after_time,
            morning_end_time,
            afternoon_start_time,
            afternoon_end_time,
        } = values

        const allTimes = [
            work_start_time,
            late_after_time,
            morning_end_time,
            afternoon_start_time,
            afternoon_end_time,
        ]

        if (!allTimes.every(isValid24HourTime)) {
            return 'Giờ phải theo định dạng 24H HH:mm, ví dụ 07:30 hoặc 17:00.'
        }
        if (work_start_time >= morning_end_time) return 'Giờ vào ca sáng phải trước giờ kết thúc ca sáng.'
        if (late_after_time < work_start_time) return 'Mốc tính đi trễ không thể sớm hơn giờ vào ca sáng.'
        if (late_after_time >= morning_end_time) return 'Mốc tính đi trễ phải nằm trong ca sáng.'
        if (morning_end_time > afternoon_start_time) return 'Giờ bắt đầu ca chiều không thể sớm hơn giờ kết thúc ca sáng.'
        if (afternoon_start_time >= afternoon_end_time) return 'Giờ vào ca chiều phải trước giờ kết thúc ca chiều.'
        return null
    }

    const handleSaveCompanySettings = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const validationError = validateTimes(settings)
        if (validationError) {
            showToast(validationError, 'error')
            return
        }

        setSaving(true)
        try {
            const {data, error} = await supabase
                .from('company_settings')
                .update(settings)
                .eq('id', 1)
                .select('work_start_time, late_after_time, morning_end_time, afternoon_start_time, afternoon_end_time')
                .single()

            if (error) throw error

            setSettings({
                work_start_time: normalizeTime(data.work_start_time, defaultSettings.work_start_time),
                late_after_time: normalizeTime(data.late_after_time, defaultSettings.late_after_time),
                morning_end_time: normalizeTime(data.morning_end_time, defaultSettings.morning_end_time),
                afternoon_start_time: normalizeTime(data.afternoon_start_time, defaultSettings.afternoon_start_time),
                afternoon_end_time: normalizeTime(data.afternoon_end_time, defaultSettings.afternoon_end_time),
            })
            showToast('Đã lưu cài đặt giờ làm việc.')
        } catch (error) {
            console.error(error)
            showToast('Không thể lưu cài đặt hệ thống.', 'error')
        } finally {
            setSaving(false)
        }
    }

    const updateScheduleForm = (key: keyof ScheduleForm, value: string) => {
        setScheduleForm((current) => current ? {...current, [key]: value} : current)
    }

    const openNewSchedule = () => {
        const employeeId = employees[0]?.id
        if (!employeeId) {
            showToast('Chưa có nhân viên đang hoạt động để cấu hình.', 'error')
            return
        }
        setScheduleForm(scheduleFromCompany(employeeId, settings))
    }

    const validateScheduleForm = (form: ScheduleForm) => {
        if (!form.employee_id) return 'Vui lòng chọn nhân viên.'
        if (!form.effective_from) return 'Vui lòng chọn ngày bắt đầu áp dụng.'
        if (form.effective_to && form.effective_to < form.effective_from) {
            return 'Ngày kết thúc không thể trước ngày bắt đầu.'
        }
        return validateTimes(form)
    }

    const saveSchedule = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!scheduleForm) return

        const validationError = validateScheduleForm(scheduleForm)
        if (validationError) {
            showToast(validationError, 'error')
            return
        }

        setSavingSchedule(true)
        try {
            const {error} = await supabase
                .from('employee_work_schedules')
                .insert({
                    employee_id: scheduleForm.employee_id,
                    effective_from: scheduleForm.effective_from,
                    effective_to: scheduleForm.effective_to || null,
                    work_start_time: scheduleForm.work_start_time,
                    late_after_time: scheduleForm.late_after_time,
                    morning_end_time: scheduleForm.morning_end_time,
                    afternoon_start_time: scheduleForm.afternoon_start_time,
                    afternoon_end_time: scheduleForm.afternoon_end_time,
                })

            if (error) throw error

            await loadSchedules()
            setScheduleForm(null)
            showToast('Đã lưu lịch giờ riêng cho nhân viên.')
        } catch (error) {
            console.error(error)
            showToast('Không thể lưu lịch giờ. Hãy kiểm tra khoảng ngày có bị trùng với một cấu hình khác không.', 'error')
        } finally {
            setSavingSchedule(false)
        }
    }

    const requestDeleteSchedule = (schedule: EmployeeSchedule) => {
        setDeleteTarget(schedule)
    }

    const deleteSchedule = async () => {
        if (!deleteTarget) return

        const schedule = deleteTarget
        setDeletingScheduleId(schedule.id)

        try {
            const {error} = await supabase
                .from('employee_work_schedules')
                .delete()
                .eq('id', schedule.id)

            if (error) throw error

            setSchedules((current) => current.filter((item) => item.id !== schedule.id))
            setDeleteTarget(null)
            showToast('Đã xóa cấu hình giờ riêng.')
        } catch (error) {
            console.error(error)
            showToast('Không thể xóa cấu hình giờ riêng.', 'error')
        } finally {
            setDeletingScheduleId(null)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-400"/>
                    <p className="mt-4 text-sm font-medium text-slate-500">Đang tải cài đặt...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8">
            <Toast
                message={toast?.message ?? null}
                variant={toast?.variant ?? 'success'}
                duration={4000}
                onClose={closeToast}
            />

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Xóa lịch giờ?"
                description={deleteTarget
                    ? `Bạn có chắc muốn xóa lịch giờ của ${employeeNameById.get(deleteTarget.employee_id) ?? 'nhân viên'} từ ${toDateInput(deleteTarget.effective_from)} không?\n\nSau khi xóa, ngày đó sẽ quay về lịch mặc định hoặc lịch riêng khác nếu có.`
                    : ''}
                confirmLabel="Xóa lịch"
                cancelLabel="Hủy"
                danger
                loading={deletingScheduleId !== null}
                onCancel={() => {
                    if (!deletingScheduleId) setDeleteTarget(null)
                }}
                onConfirm={() => void deleteSchedule()}
            />

            <div className="mb-8">
                <p className="text-sm font-medium text-slate-500">Hệ thống</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Cài đặt</h1>
                <p className="mt-2 text-sm text-slate-500">Quản lý giờ làm việc chung và lịch giờ riêng theo từng nhân viên.</p>
            </div>

            <div className="space-y-6">
                <form onSubmit={handleSaveCompanySettings} className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><SettingsIcon size={20}/></div>
                            <div>
                                <h2 className="font-bold text-slate-900">Thời gian làm việc mặc định</h2>
                                <p className="mt-1 text-xs text-slate-400">Đây là cấu hình fallback khi nhân viên không có lịch giờ riêng.</p>
                            </div>
                        </div>

                        <div className="grid gap-6 p-6 xl:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 p-5">
                                <div className="mb-5">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ca sáng</p>
                                    <p className="mt-2 text-lg font-bold text-slate-900">{settings.work_start_time} — {settings.morning_end_time}</p>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giờ vào làm</label>
                                        <TimeInput value={settings.work_start_time} onChange={(value) => updateSetting('work_start_time', value)} aria-label="work_start_time" className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"/>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Kết thúc ca sáng</label>
                                        <TimeInput value={settings.morning_end_time} onChange={(value) => updateSetting('morning_end_time', value)} aria-label="morning_end_time" className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"/>
                                    </div>
                                </div>
                                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">
                                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900"><Clock3 size={16}/>Bắt đầu tính đi trễ sau</label>
                                    <TimeInput value={settings.late_after_time} onChange={(value) => updateSetting('late_after_time', value)} aria-label="late_after_time" className="h-11 w-full cursor-pointer rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-amber-900 outline-none transition focus:ring-4 focus:ring-amber-100"/>
                                    <p className="mt-2 text-xs leading-5 text-amber-700">Đúng {settings.late_after_time} vẫn đúng giờ. Từ phút tiếp theo mới tính là đi trễ.</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-5">
                                <div className="mb-5">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ca chiều</p>
                                    <p className="mt-2 text-lg font-bold text-slate-900">{settings.afternoon_start_time} — {settings.afternoon_end_time}</p>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Giờ vào làm</label>
                                        <TimeInput value={settings.afternoon_start_time} onChange={(value) => updateSetting('afternoon_start_time', value)} aria-label="afternoon_start_time" className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"/>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Kết thúc ca chiều</label>
                                        <TimeInput value={settings.afternoon_end_time} onChange={(value) => updateSetting('afternoon_end_time', value)} aria-label="afternoon_end_time" className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                        <p className="text-sm leading-6 text-blue-800"><strong>Lưu ý:</strong> lịch giờ riêng theo nhân viên sẽ được ưu tiên theo ngày áp dụng. Nếu không có cấu hình riêng, hệ thống dùng giờ mặc định ở trên.</p>
                    </section>

                    <div className="flex justify-end">
                        <button type="submit" disabled={saving} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                            {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </button>
                    </div>
                </form>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><UserRound size={20}/></div>
                            <div>
                                <h2 className="font-bold text-slate-900">Giờ làm theo nhân viên</h2>
                                <p className="mt-1 text-xs text-slate-400">Cấu hình theo khoảng ngày, không cần sửa code khi thêm nhân viên mới.</p>
                            </div>
                        </div>
                        <button type="button" onClick={openNewSchedule} className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"><Plus size={18}/>Thêm lịch giờ</button>
                    </div>

                    {scheduleForm && (
                        <form onSubmit={saveSchedule} className="border-b border-slate-100 bg-slate-50/70 p-6">
                            <div className="mb-5 flex items-center gap-2"><CalendarRange size={18} className="text-slate-600"/><h3 className="font-bold text-slate-900">Lịch giờ mới</h3></div>
                            <div className="grid gap-4 lg:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Nhân viên</label>
                                    <select value={scheduleForm.employee_id} onChange={(event) => updateScheduleForm('employee_id', event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                                        {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_code} — {employee.full_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Từ ngày</label>
                                    <input type="date" value={scheduleForm.effective_from} onChange={(event) => updateScheduleForm('effective_from', event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"/>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Đến ngày <span className="font-normal text-slate-400">(để trống = không thời hạn)</span></label>
                                    <input type="date" value={scheduleForm.effective_to} onChange={(event) => updateScheduleForm('effective_to', event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"/>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                {([
                                    ['work_start_time', 'Giờ vào sáng'],
                                    ['late_after_time', 'Tính trễ sau'],
                                    ['morning_end_time', 'Kết thúc sáng'],
                                    ['afternoon_start_time', 'Vào chiều'],
                                    ['afternoon_end_time', 'Kết thúc chiều'],
                                ] as const).map(([key, label]) => (
                                    <div key={key}>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
                                        <TimeInput value={scheduleForm[key]} onChange={(value) => updateScheduleForm(key, value)} aria-label={key} className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"/>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 flex justify-end gap-3">
                                <button type="button" onClick={() => setScheduleForm(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
                                <button type="submit" disabled={savingSchedule} className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                                    {savingSchedule && <Loader2 size={16} className="animate-spin"/>}Lưu lịch giờ
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="p-6">
                        {schedules.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500">Chưa có lịch giờ riêng. Nhân viên sẽ dùng cài đặt mặc định.</div>
                        ) : (
                            <div className="space-y-3">
                                {schedules.map((schedule) => {
                                    const employeeName = employeeNameById.get(schedule.employee_id) ?? 'Nhân viên không còn hoạt động'
                                    return (
                                        <div key={schedule.id} className="rounded-xl border border-slate-200 p-4">
                                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-slate-900">{employeeName}</span>
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{toDateInput(schedule.effective_from)} → {schedule.effective_to ? toDateInput(schedule.effective_to) : 'Không thời hạn'}</span>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                                                        <span>Sáng: {normalizeTime(schedule.work_start_time, '07:30')} — {normalizeTime(schedule.morning_end_time, '12:00')}</span>
                                                        <span>Trễ sau: {normalizeTime(schedule.late_after_time, '07:45')}</span>
                                                        <span>Chiều: {normalizeTime(schedule.afternoon_start_time, '13:30')} — {normalizeTime(schedule.afternoon_end_time, '17:00')}</span>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => requestDeleteSchedule(schedule)} disabled={deletingScheduleId === schedule.id} className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                                                    {deletingScheduleId === schedule.id ? <Loader2 size={16} className="animate-spin"/> : <Trash2 size={16}/>}Xóa
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
