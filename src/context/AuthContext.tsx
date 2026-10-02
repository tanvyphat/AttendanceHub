import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import type {Session, User} from '@supabase/supabase-js'

import {supabase} from '../lib/supabase'

interface AuthContextType {
    session: Session | null
    user: User | null
    loading: boolean

    signIn: (
        email: string,
        password: string,
    ) => Promise<{ error: string | null }>

    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
)

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({
                                 children,
                             }: AuthProviderProps) {
    const [session, setSession] =
        useState<Session | null>(null)

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        const loadSession = async () => {
            const {
                data: {session},
            } = await supabase.auth.getSession()

            if (!mounted) return

            setSession(session)
            setLoading(false)
        }

        void loadSession()

        const {
            data: {subscription},
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setLoading(false)
            },
        )

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    const signIn = async (
        email: string,
        password: string,
    ) => {
        const {error} =
            await supabase.auth.signInWithPassword({
                email,
                password,
            })

        if (error) {
            return {
                error: error.message,
            }
        }

        return {
            error: null,
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                loading,
                signIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error(
            'useAuth must be used inside AuthProvider',
        )
    }

    return context
}