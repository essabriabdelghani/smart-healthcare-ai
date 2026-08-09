import { Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import PatientFormPage from "./pages/PatientFormPage";
import DoctorDashboardPage from "./pages/DoctorDashboardPage";
import AddPatientPage from "./pages/AddPatientPage";
import RiskResultPage from "./pages/RiskResultPage";
import AdminPanelPage from "./pages/AdminPanelPage";

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

      {/* Ajouter un patient (admission directe) : médecin/admin uniquement */}
      <Route
        path="/doctor/patients/new"
        element={
          <ProtectedRoute allowedRoles={["doctor", "admin"]}>
            <Layout>
              <AddPatientPage />
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

      {/* Route inconnue : redirige selon le rôle */}
      <Route path="*" element={<RoleHomeRedirect />} />
    </Routes>
  );
}

export default App;