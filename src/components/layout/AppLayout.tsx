import {LogOut} from 'lucide-react'
import {Outlet} from 'react-router-dom'

import {useAuth} from '../../context/AuthContext'
import Sidebar from './Sidebar'

export default function AppLayout() {
    const {user, signOut} = useAuth()

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar/>

            <div className="min-h-screen lg:pl-72">
                <header
                    className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur lg:px-8">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">
                            Hệ thống chấm công
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            Quản lý điểm danh nhân viên
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
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
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                            <LogOut size={17}/>

                            <span className="hidden sm:inline">
                Đăng xuất
              </span>
                        </button>
                    </div>
                </header>

                <main className="min-h-[calc(100vh-80px)]">
                    <Outlet/>
                </main>
            </div>
        </div>
    )
}