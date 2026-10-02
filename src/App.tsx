import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom'

import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import AttendanceToday from './pages/AttendanceToday'
import AttendanceHistory from './pages/AttendanceHistory'
import Reports from './pages/Reports'
import Employees from './pages/Employees'
import LateArrivals from './pages/LateArrivals'
import Overtime from './pages/Overtime'
import Settings from './pages/Settings'

function App() {
    return (
        <Routes>
            <Route
                path="/login"
                element={<Login/>}
            />

            <Route
                element={
                    <ProtectedRoute>
                        <AppLayout/>
                    </ProtectedRoute>
                }
            >
                <Route
                    index
                    element={<Dashboard/>}
                />

                <Route
                    path="attendance"
                    element={<AttendanceToday/>}
                />

                <Route
                    path="history"
                    element={<AttendanceHistory/>}
                />

                <Route
                    path="late"
                    element={<LateArrivals/>}
                />

                <Route
                    path="overtime"
                    element={<Overtime/>}
                />

                <Route
                    path="reports"
                    element={<Reports/>}
                />

                <Route
                    path="employees"
                    element={<Employees/>}
                />

                <Route
                    path="settings"
                    element={<Settings/>}
                />
            </Route>

            <Route
                path="*"
                element={
                    <Navigate
                        to="/"
                        replace
                    />
                }
            />
        </Routes>
    )
}

export default App
