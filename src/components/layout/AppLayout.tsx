import {LogOut, Menu} from 'lucide-react'
import {useState} from 'react'
import {Outlet} from 'react-router-dom'

import {useAuth} from '../../context/AuthContext'
import Sidebar from './Sidebar'

export default function AppLayout() {
    const {user, signOut} = useAuth()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50">
            <Sidebar
                mobileOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            />

            {mobileMenuOpen && (
                <button
                    type="button"
                    aria-label="Đóng menu"
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 z-30 cursor-pointer bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
                />
            )}

            <div className="min-h-screen lg:pl-72">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:h-20 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            type="button"
                            aria-label="Mở menu"
                            aria-expanded={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen(true)}
                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100 lg:hidden"
                        >
                            <Menu size={20}/>
                        </button>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                                Hệ thống chấm công
                            </p>

                            <p className="mt-1 hidden text-xs text-slate-400 sm:block">
                                Quản lý điểm danh nhân viên
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                        <div className="hidden text-right md:block">
                            <p className="text-sm font-semibold text-slate-700">
                                Admin
                            </p>

                            <p className="text-xs text-slate-400">
                                {user?.email}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void signOut()}
                            className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:h-auto sm:px-4 sm:py-2.5"
                        >
                            <LogOut size={17}/>

                            <span className="hidden sm:inline">
                                Đăng xuất
                            </span>
                        </button>
                    </div>
                </header>

                <main className="min-h-[calc(100vh-64px)] overflow-x-hidden lg:min-h-[calc(100vh-80px)]">
                    <Outlet/>
                </main>
            </div>
        </div>
    )
}
