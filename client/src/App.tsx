import { Switch, Route, useLocation } from "wouter";
import Dashboard from "./pages/dashboard";
import Schemes from "./pages/schemes";
import Regions from "./pages/regions";
import Reports from "./pages/reports";
import Settings from "./pages/settings";
import Admin from "./pages/admin";
import AdminDashboard from "./pages/admin/dashboard";
import ManageReports from "./pages/admin/manage-reports";
import ImportDataPage from "./pages/import-data";
import NotFound from "./pages/not-found";
import LoginPage from "./pages/login";
import UserLoginPage from "./pages/user-login";
import RegisterPage from "./pages/register";
import ForgotPasswordPage from "./pages/forgot-password";
import LpcdPage from "./pages/LpcdPage";
import SchemeLpcdPage from "./pages/SchemeLpcdPage";
import MapPreviewPage from "./pages/map-preview";
import { ChlorineDashboard, ChlorineImport, ChlorinePage } from "./pages/chlorine";
import { PressureDashboard, PressurePage } from "./pages/pressure";
import ProtectedRoute from "./components/auth/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { FilterContextProvider } from "./components/chatbot/ChatbotComponent";
import ChatbotComponent from "./components/chatbot/ChatbotComponent";
import { TranslationProvider } from "./contexts/TranslationContext";
import { ThemeProvider } from "./components/theme/theme-provider";
import { GeoFilterProvider } from "./contexts/GeoFilterContext";

function App() {
  const [location] = useLocation();
  
  // Check if current route is login, register, forgot password, or admin page
  // These are the pages where we don't want to show the chatbot
  const hideChatbotRoutes = [
    '/', 
    '/login', 
    '/user-login',
    '/register', 
    '/forgot-password', 
    '/admin'
  ];
  
  // Check if current route starts with /admin/
  const isAdminRoute = location.startsWith('/admin/');
  
  // Determine if chatbot should be hidden
  const shouldHideChatbot = hideChatbotRoutes.includes(location) || isAdminRoute;
  
  return (
    <ThemeProvider>
      <AuthProvider>
        <GeoFilterProvider>
          <TranslationProvider>
            {/* Global styles to fix z-index issues */}
            <style dangerouslySetInnerHTML={{
              __html: `
                /* Force dropdown menus to have higher z-index than maps */
                [data-radix-popper-content-wrapper] {
                  z-index: 9999 !important;
                }
                
                /* Lower z-index for maps and containers */
                .leaflet-container,
                .leaflet-pane,
                .leaflet-top,
                .leaflet-bottom,
                .leaflet-control,
                #maharashtra-map-preview {
                  z-index: 1 !important;
                }
                
                /* Ensure the dropdown doesn't get cut off */
                [data-state="open"].Select-content {
                  overflow: visible !important;
                }
              `
            }} />
            
            <Switch>
              {/* Public routes */}
              <Route path="/" component={LoginPage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/user-login" component={UserLoginPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/forgot-password" component={ForgotPasswordPage} />
              <Route path="/admin">
                <ProtectedRoute requireAdmin={true}>
                  <Admin />
                </ProtectedRoute>
              </Route>
              
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
              
              <Route path="/scheme-lpcd">
                <ProtectedRoute>
                  <SchemeLpcdPage />
                </ProtectedRoute>
              </Route>
              
              <Route path="/chlorine">
                <ProtectedRoute>
                  <ChlorinePage />
                </ProtectedRoute>
              </Route>
              
              <Route path="/chlorine/import">
                <ProtectedRoute>
                  <ChlorineImport />
                </ProtectedRoute>
              </Route>
              
              <Route path="/pressure">
                <ProtectedRoute>
                  <PressurePage />
                </ProtectedRoute>
              </Route>
              
              <Route path="/map-preview">
                <ProtectedRoute>
                  <MapPreviewPage />
                </ProtectedRoute>
              </Route>
              
              {/* Admin protected routes */}
              <Route path="/admin/dashboard">
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              </Route>
              
              <Route path="/admin/import-data">
                <ProtectedRoute requireAdmin={true}>
                  <ImportDataPage />
                </ProtectedRoute>
              </Route>
              
              <Route path="/admin/chlorine-import">
                <ProtectedRoute requireAdmin={true}>
                  <ChlorineImport />
                </ProtectedRoute>
              </Route>
              
              <Route path="/admin/manage-reports">
                <ProtectedRoute requireAdmin={true}>
                  <ManageReports />
                </ProtectedRoute>
              </Route>
              
              {/* Fallback route */}
              <Route component={NotFound} />
            </Switch>
            
            {/* JJM Assistant Chatbot (conditionally rendered based on route) */}
            {!shouldHideChatbot && (
              <FilterContextProvider 
                setSelectedRegion={() => {}} 
                setStatusFilter={() => {}}
              >
                <ChatbotComponent />
              </FilterContextProvider>
            )}
          </TranslationProvider>
        </GeoFilterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
