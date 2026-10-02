import {
    CalendarCheck,
    Clock3,
    FileSpreadsheet,
    History,
    LayoutDashboard,
    Settings,
    Users,
} from 'lucide-react'
import {NavLink} from 'react-router-dom'

const mainMenu = [
    {
        name: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
    },
    {
        name: 'Chấm công',
        path: '/attendance',
        icon: CalendarCheck,
    },
    {
        name: 'Lịch sử chấm công',
        path: '/history',
        icon: History,
    },
    {
        name: 'Đi trễ',
        path: '/late',
        icon: Clock3,
    },
    {
        name: 'Báo cáo',
        path: '/reports',
        icon: FileSpreadsheet,
    },
    {
        name: 'Nhân viên',
        path: '/employees',
        icon: Users,
    },
    {
        name: 'Cài đặt',
        path: '/settings',
        icon: Settings,
    },
]

export default function Sidebar() {
    return (
        <aside
            className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-slate-200 bg-white lg:flex">
            <div className="border-b border-slate-100 px-6 py-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                        <CalendarCheck size={23}/>
                    </div>

                    <div>
                        <h1 className="font-bold text-slate-950">
                            AttendanceHub
                        </h1>

                        <p className="text-xs text-slate-400">
                            Attendance System
                        </p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
                <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Quản lý
                </p>

                <div className="space-y-1">
                    {mainMenu.map((item) => {
                        const Icon = item.icon

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({isActive}) =>
                                    [
                                        'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',

                                        isActive
                                            ? 'bg-slate-950 text-white'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                                    ].join(' ')
                                }
                            >
                                <Icon size={19}/>

                                {item.name}
                            </NavLink>
                        )
                    })}
                </div>
            </nav>

            <div className="border-t border-slate-100 px-5 py-5">
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/>

                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"/>
                        </span>

                        <span className="text-xs font-semibold text-emerald-700">
                            System Online
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    )
}
