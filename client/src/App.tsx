import { Switch, Route } from "wouter";
import Dashboard from "./pages/dashboard";
import Schemes from "./pages/schemes";
import Regions from "./pages/regions";
import Reports from "./pages/reports";
import Settings from "./pages/settings";
import Admin from "./pages/admin";
import AdminDashboard from "./pages/admin/dashboard";
import ImportDataPage from "./pages/import-data";
import NotFound from "./pages/not-found";
import LoginPage from "./pages/login";
import UserLoginPage from "./pages/user-login";
import RegisterPage from "./pages/register";
import ForgotPasswordPage from "./pages/forgot-password";
import LpcdPage from "./pages/LpcdPage";
import ProtectedRoute from "./components/auth/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import JjmAssistantChatbot from "./components/JjmAssistantChatbot";

function App() {
  return (
    <AuthProvider>
      <>
        <Switch>
          {/* Public routes */}
          <Route path="/" component={LoginPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/user-login" component={UserLoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/admin" component={Admin} />
          
          {/* User protected routes */}
          <Route path="/dashboard">
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/schemes">
            <ProtectedRoute>
              <Schemes />
            </ProtectedRoute>
          </Route>
          <Route path="/regions">
            <ProtectedRoute>
              <Regions />
            </ProtectedRoute>
          </Route>
          <Route path="/reports">
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          </Route>
          <Route path="/settings">
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          </Route>
          <Route path="/lpcd">
            <ProtectedRoute>
              <LpcdPage />
            </ProtectedRoute>
          </Route>
          
          {/* Admin protected routes */}
          <Route path="/admin/dashboard">
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          </Route>
          
          <Route path="/admin/import-data">
            <ProtectedRoute>
              <ImportDataPage />
            </ProtectedRoute>
          </Route>
          
          {/* Fallback route */}
          <Route component={NotFound} />
        </Switch>
        
        {/* JJM Assistant Chatbot (available on all pages) */}
        <JjmAssistantChatbot />
      </>
    </AuthProvider>
  );
}

export default App;
