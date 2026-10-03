import {
    AlertTriangle,
    Clock3,
    Loader2,
    Search,
    Timer,
    TrendingUp,
    UserRound,
    Users,
} from 'lucide-react'
import {
    useEffect,
    useMemo,
    useState,
} from 'react'

import {supabase} from '../lib/supabase'

interface EmployeeRelation {
    employee_code: string
    full_name: string
}

interface LateRecord {
    id: string
    employee_id: string
    work_date: string
    check_in: string | null
    check_out: string | null
    is_late: boolean
    note: string | null
    employees: EmployeeRelation | null
}

interface LateSummary {
    employeeId: string
    employeeCode: string
    fullName: string
    lateCount: number
    totalMinutes: number
    averageMinutes: number
    maxMinutes: number
}

function getVietnamMonth() {
    const parts = new Intl.DateTimeFormat(
        'en-CA',
        {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
        },
    ).formatToParts(new Date())

    const year =
        parts.find((item) => item.type === 'year')?.value ?? ''

    const month =
        parts.find((item) => item.type === 'month')?.value ?? ''

    return `${year}-${month}`
}

function getMonthRange(monthValue: string) {
    const [year, month] = monthValue
        .split('-')
        .map(Number)

    const lastDay = new Date(
        year,
        month,
        0,
    ).getDate()

    return {
        startDate: `${monthValue}-01`,
        endDate: `${monthValue}-${String(lastDay).padStart(2, '0')}`,
    }
}

function formatDate(value: string) {
    const [year, month, day] =
        value.split('-')

    return `${day}/${month}/${year}`
}

function timeToMinutes(value: string) {
    const [hours, minutes] =
        value.slice(0, 5).split(':').map(Number)

    return hours * 60 + minutes
}

function getLateMinutes(
    checkIn: string | null,
    lateAfterTime: string,
) {
    if (!checkIn) return 0

    return Math.max(
        0,
        timeToMinutes(checkIn) -
        timeToMinutes(lateAfterTime),
    )
}

export default function LateArrivals() {
    const [month, setMonth] =
        useState(getVietnamMonth())

    const [records, setRecords] =
        useState<LateRecord[]>([])

    const [lateAfterTime, setLateAfterTime] =
        useState('07:35')

    const [search, setSearch] =
        useState('')

    const [loading, setLoading] =
        useState(true)

    const [error, setError] =
        useState<string | null>(null)

    useEffect(() => {
        const loadLateData = async () => {
            setLoading(true)
            setError(null)

            try {
                const {
                    startDate,
                    endDate,
                } = getMonthRange(month)

                const [
                    settingsResult,
                    attendanceResult,
                ] = await Promise.all([
                    supabase
                        .from('company_settings')
                        .select('late_after_time')
                        .eq('id', 1)
                        .maybeSingle(),

                    supabase
                        .from('attendance')
                        .select(
                            `
                                id,
                                employee_id,
                                work_date,
                                check_in,
                                check_out,
                                is_late,
                                note,
                                employees (
                                    employee_code,
                                    full_name
                                )
                            `,
                        )
                        .eq('is_late', true)
                        .gte('work_date', startDate)
                        .lte('work_date', endDate)
                        .order('work_date', {
                            ascending: false,
                        })
                        .order('check_in', {
                            ascending: false,
                        }),
                ])

                if (settingsResult.error) {
                    throw settingsResult.error
                }

                if (attendanceResult.error) {
                    throw attendanceResult.error
                }

                if (
                    settingsResult.data?.late_after_time
                ) {
                    setLateAfterTime(
                        settingsResult.data.late_after_time.slice(
                            0,
                            5,
                        ),
                    )
                }

                setRecords(
                    (attendanceResult.data ??
                        []) as unknown as LateRecord[],
                )
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể tải dữ liệu đi trễ.',
                )
            } finally {
                setLoading(false)
            }
        }

        void loadLateData()
    }, [month])

    const filteredRecords =
        useMemo(() => {
            const keyword = search
                .trim()
                .toLocaleLowerCase('vi-VN')

            if (!keyword) {
                return records
            }

            return records.filter(
                (record) => {
                    const employee =
                        record.employees

                    const searchable =
                        `${employee?.employee_code ?? ''} ${employee?.full_name ?? ''}`.toLocaleLowerCase(
                            'vi-VN',
                        )

                    return searchable.includes(
                        keyword,
                    )
                },
            )
        }, [records, search])

    const employeeSummaries =
        useMemo<LateSummary[]>(() => {
            const map = new Map<
                string,
                {
                    employeeCode: string
                    fullName: string
                    minutes: number[]
                }
            >()

            filteredRecords.forEach(
                (record) => {
                    const employee =
                        record.employees

                    if (!employee) return

                    const minutes =
                        getLateMinutes(
                            record.check_in,
                            lateAfterTime,
                        )

                    const current =
                        map.get(
                            record.employee_id,
                        )

                    if (current) {
                        current.minutes.push(
                            minutes,
                        )
                    } else {
                        map.set(
                            record.employee_id,
                            {
                                employeeCode:
                                    employee.employee_code,

                                fullName:
                                    employee.full_name,

                                minutes: [
                                    minutes,
                                ],
                            },
                        )
                    }
                },
            )

            return Array.from(
                map.entries(),
            )
                .map(
                    ([
                        employeeId,
                        data,
                    ]) => {
                        const totalMinutes =
                            data.minutes.reduce(
                                (
                                    total,
                                    value,
                                ) =>
                                    total +
                                    value,
                                0,
                            )

                        return {
                            employeeId,

                            employeeCode:
                                data.employeeCode,

                            fullName:
                                data.fullName,

                            lateCount:
                                data.minutes.length,

                            totalMinutes,

                            averageMinutes:
                                data.minutes.length
                                    ? Math.round(
                                          totalMinutes /
                                              data.minutes.length,
                                      )
                                    : 0,

                            maxMinutes:
                                Math.max(
                                    0,
                                    ...data.minutes,
                                ),
                        }
                    },
                )
                .sort(
                    (a, b) =>
                        b.lateCount -
                            a.lateCount ||
                        b.totalMinutes -
                            a.totalMinutes ||
                        a.employeeCode.localeCompare(
                            b.employeeCode,
                        ),
                )
        }, [
            filteredRecords,
            lateAfterTime,
        ])

    const overall =
        useMemo(() => {
            const totalMinutes =
                filteredRecords.reduce(
                    (total, record) =>
                        total +
                        getLateMinutes(
                            record.check_in,
                            lateAfterTime,
                        ),
                    0,
                )

            const maxMinutes =
                filteredRecords.reduce(
                    (max, record) =>
                        Math.max(
                            max,
                            getLateMinutes(
                                record.check_in,
                                lateAfterTime,
                            ),
                        ),
                    0,
                )

            return {
                totalLate:
                    filteredRecords.length,

                employees:
                    new Set(
                        filteredRecords.map(
                            (record) =>
                                record.employee_id,
                        ),
                    ).size,

                totalMinutes,

                averageMinutes:
                    filteredRecords.length
                        ? Math.round(
                              totalMinutes /
                                  filteredRecords.length,
                          )
                        : 0,

                maxMinutes,
            }
        }, [
            filteredRecords,
            lateAfterTime,
        ])

    const [year, monthNumber] =
        month.split('-')

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <p className="text-sm font-medium text-slate-500">
                    Chấm công
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Đi trễ
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Theo dõi số lần và thời gian đi
                    trễ của nhân viên.
                </p>
            </div>

            <section className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                <p className="text-sm text-blue-800">
                    Mốc tính đi trễ hiện tại:{' '}
                    <strong>
                        sau {lateAfterTime}
                    </strong>
                    . Số phút trễ được tính từ mốc{' '}
                    <strong>
                        {lateAfterTime}
                    </strong>
                    .
                </p>
            </section>

            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 md:grid-cols-[190px_1fr]">
                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Tháng
                        </label>

                        <input
                            type="month"
                            value={month}
                            onChange={(event) =>
                                setMonth(
                                    event.target
                                        .value,
                                )
                            }
                            className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                            Tìm nhân viên
                        </label>

                        <div className="relative">
                            <Search
                                size={17}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target
                                            .value,
                                    )
                                }
                                placeholder="Tên hoặc mã nhân viên..."
                                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex min-h-80 items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-400" />

                        <p className="mt-4 text-sm font-medium text-slate-500">
                            Đang tổng hợp dữ liệu đi
                            trễ...
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <Clock3 className="mb-4 text-amber-600" />

                            <p className="text-sm text-slate-500">
                                Tổng lần đi trễ
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {overall.totalLate}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <Users className="mb-4 text-slate-500" />

                            <p className="text-sm text-slate-500">
                                Nhân viên đi trễ
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {overall.employees}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <Timer className="mb-4 text-red-600" />

                            <p className="text-sm text-slate-500">
                                Tổng phút trễ
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {overall.totalMinutes}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <TrendingUp className="mb-4 text-blue-600" />

                            <p className="text-sm text-slate-500">
                                Trung bình / lần
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {overall.averageMinutes}
                                <span className="ml-1 text-sm font-medium text-slate-400">
                                    phút
                                </span>
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <AlertTriangle className="mb-4 text-orange-600" />

                            <p className="text-sm text-slate-500">
                                Trễ nhiều nhất
                            </p>

                            <p className="mt-1 text-3xl font-bold text-slate-950">
                                {overall.maxMinutes}
                                <span className="ml-1 text-sm font-medium text-slate-400">
                                    phút
                                </span>
                            </p>
                        </div>
                    </section>

                    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h2 className="font-bold text-slate-900">
                                Tổng hợp theo nhân viên
                            </h2>

                            <p className="mt-1 text-xs text-slate-400">
                                Tháng {monthNumber}/{year}
                            </p>
                        </div>

                        {employeeSummaries.length ===
                        0 ? (
                            <div className="px-6 py-16 text-center">
                                <UserRound
                                    size={42}
                                    className="mx-auto text-slate-300"
                                />

                                <p className="mt-4 font-semibold text-slate-700">
                                    Không có nhân viên đi trễ
                                </p>

                                <p className="mt-2 text-sm text-slate-400">
                                    Không có dữ liệu phù hợp
                                    với bộ lọc hiện tại.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[850px]">
                                    <thead className="bg-slate-50">
                                        <tr className="border-b border-slate-200">
                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                                #
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                                Nhân viên
                                            </th>

                                            <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                                Số lần trễ
                                            </th>

                                            <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                                Tổng phút
                                            </th>

                                            <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                                TB / lần
                                            </th>

                                            <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                                Lần trễ lâu nhất
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {employeeSummaries.map(
                                            (
                                                item,
                                                index,
                                            ) => (
                                                <tr
                                                    key={
                                                        item.employeeId
                                                    }
                                                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                                >
                                                    <td className="px-5 py-4 font-bold text-slate-400">
                                                        {index +
                                                            1}
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <p className="font-semibold text-slate-900">
                                                            {
                                                                item.fullName
                                                            }
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {
                                                                item.employeeCode
                                                            }
                                                        </p>
                                                    </td>

                                                    <td className="px-5 py-4 text-center">
                                                        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                                                            {
                                                                item.lateCount
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-5 py-4 text-center font-bold text-red-600">
                                                        {
                                                            item.totalMinutes
                                                        }{' '}
                                                        phút
                                                    </td>

                                                    <td className="px-5 py-4 text-center font-semibold text-slate-700">
                                                        {
                                                            item.averageMinutes
                                                        }{' '}
                                                        phút
                                                    </td>

                                                    <td className="px-5 py-4 text-center font-semibold text-slate-700">
                                                        {
                                                            item.maxMinutes
                                                        }{' '}
                                                        phút
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h2 className="font-bold text-slate-900">
                                Chi tiết từng lần đi trễ
                            </h2>

                            <p className="mt-1 text-xs text-slate-400">
                                {filteredRecords.length}{' '}
                                bản ghi
                            </p>
                        </div>

                        {filteredRecords.length ===
                        0 ? (
                            <div className="px-6 py-16 text-center">
                                <Clock3
                                    size={42}
                                    className="mx-auto text-slate-300"
                                />

                                <p className="mt-4 font-semibold text-slate-700">
                                    Không có dữ liệu đi trễ
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1050px]">
                                    <thead className="bg-slate-50">
                                        <tr className="border-b border-slate-200">
                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                                Ngày
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                                Nhân viên
                                            </th>

                                            <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                                Giờ vào
                                            </th>

                                            <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                                Giờ về
                                            </th>

                                            <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                                Mốc trễ
                                            </th>

                                            <th className="px-5 py-4 text-center text-xs font-bold uppercase text-slate-500">
                                                Số phút trễ
                                            </th>

                                            <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                                Ghi chú
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredRecords.map(
                                            (record) => {
                                                const minutes =
                                                    getLateMinutes(
                                                        record.check_in,
                                                        lateAfterTime,
                                                    )

                                                return (
                                                    <tr
                                                        key={
                                                            record.id
                                                        }
                                                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                                    >
                                                        <td className="px-5 py-4 font-semibold text-slate-700">
                                                            {formatDate(
                                                                record.work_date,
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <p className="font-semibold text-slate-900">
                                                                {record
                                                                    .employees
                                                                    ?.full_name ??
                                                                    'Không xác định'}
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-400">
                                                                {record
                                                                    .employees
                                                                    ?.employee_code ??
                                                                    '---'}
                                                            </p>
                                                        </td>

                                                        <td className="px-5 py-4 text-center font-bold text-red-600">
                                                            {record.check_in?.slice(
                                                                0,
                                                                5,
                                                            ) ??
                                                                '—'}
                                                        </td>

                                                        <td className="px-5 py-4 text-center font-semibold text-slate-700">
                                                            {record.check_out?.slice(
                                                                0,
                                                                5,
                                                            ) ??
                                                                '—'}
                                                        </td>

                                                        <td className="px-5 py-4 text-center font-semibold text-slate-500">
                                                            {
                                                                lateAfterTime
                                                            }
                                                        </td>

                                                        <td className="px-5 py-4 text-center">
                                                            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                                                                +
                                                                {
                                                                    minutes
                                                                }{' '}
                                                                phút
                                                            </span>
                                                        </td>

                                                        <td className="max-w-72 px-5 py-4 text-sm text-slate-500">
                                                            {record.note ||
                                                                '—'}
                                                        </td>
                                                    </tr>
                                                )
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}
