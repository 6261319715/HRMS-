import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import EmployeesPage from "./pages/EmployeesPage";
import LeavesPage from "./pages/LeavesPage";
import PayrollPage from "./pages/PayrollPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/invite-signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/analytics"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/teams"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/regularization"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <AttendancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <LeavesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves/policy"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <LeavesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <PayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/payslips"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <PayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/preferences"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
