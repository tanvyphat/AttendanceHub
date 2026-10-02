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
import LeaveRequests from './pages/LeaveRequests'

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
                    path="leave"
                    element={<LeaveRequests />}
                />

                <Route
                    path="reports"
                    element={<Reports />}
                />

                <Route
                    path="employees"
                    element={<Employees />}
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