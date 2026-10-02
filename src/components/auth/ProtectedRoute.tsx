import type {ReactNode} from 'react'
import {Navigate} from 'react-router-dom'

import {useAuth} from '../../context/AuthContext'

interface ProtectedRouteProps {
    children: ReactNode
}

export default function ProtectedRoute({
                                           children,
                                       }: ProtectedRouteProps) {
    const {session, loading} = useAuth()

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div
                        className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"/>

                    <p className="mt-4 text-sm font-medium text-slate-500">
                        Đang kiểm tra phiên đăng nhập...
                    </p>
                </div>
            </div>
        )
    }

    if (!session) {
        return (
            <Navigate
                to="/login"
                replace
            />
        )
    }

    return children
}