import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import StudentDashboard from './pages/StudentDashboard'
import StaffDashboard from './pages/StaffDashboard'
import HodDashboard from './pages/HodDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Departments from './pages/Departments'
import Analytics from './pages/Analytics'
import MyComplaints from './pages/MyComplaints'
import UserManagement from './pages/UserManagement'
import Announcements from './pages/Announcements'
import { DarkModeProvider } from './context/DarkModeContext'
import SessionTimeout from './components/SessionTimeout'

export default function App() {
  return (
    <DarkModeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Student */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/departments" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <Departments />
            </ProtectedRoute>
          } />
          <Route path="/my-complaints" element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <MyComplaints />
            </ProtectedRoute>
          } />

          {/* Dept Staff + Faculty → filtered by their own department */}
          <Route path="/staff" element={
            <ProtectedRoute allowedRoles={['STAFF', 'FACULTY']}>
              <StaffDashboard />
            </ProtectedRoute>
          } />

          {/* HOD → sees all departments (read-only copy) */}
          <Route path="/hod" element={
            <ProtectedRoute allowedRoles={['HOD']}>
              <HodDashboard />
            </ProtectedRoute>
          } />

          {/* Admin / Principal → full control */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Analytics — Admin + HOD */}
          <Route path="/analytics" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'HOD']}>
              <Analytics />
            </ProtectedRoute>
          } />

          {/* User Management — Admin only */}
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserManagement />
            </ProtectedRoute>
          } />

          {/* Announcements — All roles */}
          <Route path="/announce" element={
            <ProtectedRoute allowedRoles={['STUDENT','FACULTY','HOD','STAFF','ADMIN']}>
              <Announcements />
            </ProtectedRoute>
          } />
        </Routes>
        <SessionTimeout />
      </BrowserRouter>
    </AuthProvider>
    </DarkModeProvider>
  )
}
