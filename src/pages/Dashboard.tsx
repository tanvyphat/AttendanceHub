import {
    Clock3,
    Loader2,
    UserRoundCheck,
    UserRoundX,
    Users,
} from 'lucide-react'
import {useEffect, useState} from 'react'

import {supabase} from '../lib/supabase'

interface DashboardStats {
    employees: number
    present: number
    late: number
    absent: number
}

function getVietnamDate() {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
    })
}

export default function Dashboard() {
    const [stats, setStats] =
        useState<DashboardStats>({
            employees: 0,
            present: 0,
            late: 0,
            absent: 0,
        })

    const [loading, setLoading] = useState(true)
    const [error, setError] =
        useState<string | null>(null)

    useEffect(() => {
        const loadDashboard = async () => {
            setLoading(true)
            setError(null)

            try {
                const today = getVietnamDate()

                const [
                    employeesResult,
                    attendanceResult,
                ] = await Promise.all([
                    supabase
                        .from('employees')
                        .select('id', {
                            count: 'exact',
                            head: true,
                        })
                        .eq('is_active', true),

                    supabase
                        .from('attendance')
                        .select(
                            `
                employee_id,
                morning_status,
                afternoon_status,
                is_late
              `,
                        )
                        .eq('work_date', today),
                ])

                if (employeesResult.error) {
                    throw employeesResult.error
                }

                if (attendanceResult.error) {
                    throw attendanceResult.error
                }

                const attendance =
                    attendanceResult.data ?? []

                const present = attendance.filter(
                    (item) =>
                        item.morning_status === 'present' ||
                        item.afternoon_status === 'present',
                ).length

                const late = attendance.filter(
                    (item) => item.is_late,
                ).length

                const absent = attendance.filter(
                    (item) => {
                        const morningAbsent =
                            item.morning_status ===
                            'approved_leave' ||
                            item.morning_status ===
                            'unapproved_leave'

                        const afternoonAbsent =
                            item.afternoon_status ===
                            'approved_leave' ||
                            item.afternoon_status ===
                            'unapproved_leave'

                        return morningAbsent || afternoonAbsent
                    },
                ).length

                setStats({
                    employees:
                        employeesResult.count ?? 0,
                    present,
                    late,
                    absent,
                })
            } catch (err) {
                console.error(err)

                setError(
                    'Không thể tải dữ liệu Dashboard.',
                )
            } finally {
                setLoading(false)
            }
        }

        void loadDashboard()
    }, [])

    const cards = [
        {
            title: 'Tổng nhân viên',
            value: stats.employees,
            icon: Users,
        },
        {
            title: 'Có mặt hôm nay',
            value: stats.present,
            icon: UserRoundCheck,
        },
        {
            title: 'Đi trễ',
            value: stats.late,
            icon: Clock3,
        },
        {
            title: 'Nghỉ hôm nay',
            value: stats.absent,
            icon: UserRoundX,
        },
    ]

    return (
        <div className="p-6 lg:p-8">
            <div className="mb-8">
                <p className="text-sm font-medium text-slate-500">
                    Tổng quan
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Dashboard
                </h1>
            </div>

            {error && (
                <div
                    className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex min-h-72 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400"/>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {cards.map((item) => {
                        const Icon = item.icon

                        return (
                            <div
                                key={item.title}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">
                                            {item.title}
                                        </p>

                                        <p className="mt-3 text-3xl font-bold text-slate-950">
                                            {item.value}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                                        <Icon size={22}/>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}