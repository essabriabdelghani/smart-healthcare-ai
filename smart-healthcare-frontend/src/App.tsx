import { Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import PatientFormPage from "./pages/PatientFormPage";
import PatientAppointmentsPage from "./pages/PatientAppointmentsPage";
import DoctorDashboardPage from "./pages/DoctorDashboardPage";
import AddPatientPage from "./pages/AddPatientPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import RiskResultPage from "./pages/RiskResultPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import SettingsPage from "./pages/SettingsPage";
import SupportPage from "./pages/SupportPage";
import NotificationsPage from "./pages/NotificationsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleHomeRedirect from "./components/RoleHomeRedirect";
import { Layout } from "./components/Layout";

function App() {
  return (
    <Routes>
      {/* Page par défaut : redirige selon le rôle (ou /login si non connecté) */}
      <Route path="/" element={<RoleHomeRedirect />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Dashboard patient : réservé aux comptes "patient" */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Formulaire patient : réservé aux comptes "patient" */}
      <Route
        path="/patient-form"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <Layout>
              <PatientFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Mes rendez-vous : réservé aux comptes "patient" */}
      <Route
        path="/my-appointments"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <Layout>
              <PatientAppointmentsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Dashboard médecin : liste tous les patients + risque */}
      <Route
        path="/doctor/dashboard"
        element={
          <ProtectedRoute allowedRoles={["doctor", "admin"]}>
            <Layout>
              <DoctorDashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Ajouter un patient (admission directe) : médecin uniquement */}
      <Route
        path="/doctor/patients/new"
        element={
          <ProtectedRoute allowedRoles={["doctor"]}>
            <Layout>
              <AddPatientPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Rendez-vous (création + gestion) : médecin uniquement.
          L'admin voit tous les rendez-vous en lecture seule dans /admin. */}
      <Route
        path="/doctor/appointments"
        element={
          <ProtectedRoute allowedRoles={["doctor"]}>
            <Layout>
              <AppointmentsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Résultat du risque : accessible à tout utilisateur connecté autorisé */}
      <Route
        path="/risk-result/:intakeId"
        element={
          <ProtectedRoute>
            <Layout>
              <RiskResultPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Administration */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Layout>
              <AdminPanelPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Paramètres et Support : accessibles à tout utilisateur connecté */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <Layout>
              <SupportPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout>
              <NotificationsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Route inconnue : redirige selon le rôle */}
      <Route path="*" element={<RoleHomeRedirect />} />
    </Routes>
  );
}

export default App;