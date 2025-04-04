import { Button } from "../ui/button";
import { UserCircle, Settings, Droplet, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import Sidebar from "./sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";

interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function Header() {
  // Check if user is admin
  const { data: authData } = useQuery<AuthStatusResponse>({
    queryKey: ['/api/auth/status'],
    refetchOnWindowFocus: false,
  });
  
  // Handle logout
  const [, setLocation] = useLocation();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Redirect to the login page after logout
      window.location.href = '/login';
    },
  });
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 shadow-md sticky top-0 z-50">
      <div className="absolute inset-0 bg-[url('/images/water-bg.svg')] opacity-10 bg-repeat"></div>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {/* Show the sidebar menu button */}
              <div className="mr-2">
                <Sidebar />
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 mr-3 shadow-lg border border-white/20">
                <Droplet className="h-6 w-6 text-white drop-shadow-md" />
              </div>
              <div>
                <h1 className="font-bold text-lg sm:text-xl text-white drop-shadow-sm">
                  SWSM 
                  <span className="relative ml-1">
                    <span className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white blur-sm">IoT</span>
                    <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white">IoT</span>
                  </span>
                </h1>
                <p className="text-xs text-blue-100 -mt-1 hidden sm:block font-medium">
                  <span className="text-white">JJM</span> Integration Monitoring System
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Only show Admin button if user is admin */}
            {authData?.isAdmin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-2 sm:px-3">
                  <Settings className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
            <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-indigo-400/30">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white shadow-md border border-white/10"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
