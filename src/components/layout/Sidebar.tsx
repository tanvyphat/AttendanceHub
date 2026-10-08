import {
    CalendarCheck,
    Clock3,
    FileSpreadsheet,
    History,
    LayoutDashboard,
    Settings,
    Timer,
    Users,
    X,
} from 'lucide-react'
import {NavLink} from 'react-router-dom'

const mainMenu = [
    {name: 'Dashboard', path: '/', icon: LayoutDashboard},
    {name: 'Chấm công', path: '/attendance', icon: CalendarCheck},
    {name: 'Lịch sử chấm công', path: '/history', icon: History},
    {name: 'Đi trễ', path: '/late', icon: Clock3},
    {name: 'Tăng ca', path: '/overtime', icon: Timer},
    {name: 'Báo cáo', path: '/reports', icon: FileSpreadsheet},
    {name: 'Nhân viên', path: '/employees', icon: Users},
    {name: 'Cài đặt', path: '/settings', icon: Settings},
]

interface SidebarProps {
    mobileOpen?: boolean
    onClose?: () => void
}

export default function Sidebar({
    mobileOpen = false,
    onClose,
}: SidebarProps) {
    return (
        <aside
            className={[
                'fixed left-0 top-0 z-40 flex h-screen w-[min(18rem,calc(100vw-3rem))] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:w-72 lg:translate-x-0 lg:shadow-none',
                mobileOpen ? 'translate-x-0' : '-translate-x-full',
            ].join(' ')}
        >
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                            <CalendarCheck size={23}/>
                        </div>

                        <div className="min-w-0">
                            <h1 className="truncate font-bold text-slate-950">
                                AttendanceHub
                            </h1>

                            <p className="text-xs text-slate-400">
                                Attendance System
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        aria-label="Đóng menu"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden"
                    >
                        <X size={20}/>
                    </button>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
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
                                onClick={onClose}
                                className={({isActive}) =>
                                    [
                                        'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
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

            <div className="border-t border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
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
