import { Button } from "../ui/button";
import {
  UserCircle,
  Settings,
  Droplet,
  LogOut,
  DropletIcon,
  Globe,
  Moon,
  Sun,
  Home,
  GitBranchPlus,
  MapPin,
  BarChart2,
  PieChart,
  Flame,
  Gauge,
  Wifi,
  Menu,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import Sidebar from "./sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { LanguageSelectorMinimal } from "../ui/language-selector";
import { useTranslation } from "../../contexts/TranslationContext";
import { TranslatedText } from "../ui/translated-text";
import { useTheme } from "../theme/theme-provider";

interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function Header() {
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get theme context
  const { theme, toggleTheme } = useTheme();

  // Check if user is admin
  const { data: authData } = useQuery<AuthStatusResponse>({
    queryKey: ["/api/auth/status"],
    refetchOnWindowFocus: false,
  });

  // Handle logout
  const [, setLocation] = useLocation();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      return response.json();
    },
    onSuccess: () => {
      // Redirect to the login page after logout
      window.location.href = "/login";
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-[#05529c] shadow-2xl sticky top-0 z-[9999]">
      <div className="absolute inset-0 bg-[url('/images/water-pattern.svg')] opacity-10 bg-repeat"></div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/20"
        style={{
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)",
        }}
      ></div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Top Header Row - Logo and Title */}
        <div className="flex justify-between items-center h-16 gap-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {/* Show the sidebar menu button */}
              <div className="mr-3">
                <Sidebar />
              </div>

              <div className="mr-4 relative">
                <div className="absolute -inset-0.5 bg-white rounded-full blur-sm opacity-70"></div>
                <img
                  src="/images/jal-jeevan-mission-logo.png"
                  alt="Jal Jeevan Mission"
                  className="h-10 bg-white/90 rounded-full p-0.5 relative"
                />
              </div>

              <div>
                <h1 className="font-bold text-lg sm:text-xl text-white drop-shadow-md tracking-tight">
                  <TranslatedText>
                    STATE WATER AND SANITATION MISSION
                  </TranslatedText>
                  {/* <span className="relative ml-1">
                    <span className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white blur-sm">
                      MAHARASHTRA
                    </span>
                    <span className="relative bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white">
                      MAHARASHTRA
                    </span>
                  </span> */}
                </h1>
                <p className="text-xs text-blue-100 -mt-1 hidden sm:block font-medium">
                  <span className="text-white flex items-center gap-1">
                    <DropletIcon className="h-3 w-3" />{" "}
                    <TranslatedText>
                      Water Supply & Sanitation Dept.,Govt. of Maharashtra
                    </TranslatedText>
                    <span className="ml-1 bg-pink-800/30 px-1.5 py-0.5 rounded text-[10px] border border-blue-400/30 font-bold">
                      Developed by CSTECH<sup>Ai</sup>
                    </span>
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Language selector */}
            {/* <div className="flex items-center mr-2 px-2 py-1 bg-blue-700/30 backdrop-blur-sm rounded-md border border-white/10">
              <Globe className="h-4 w-4 text-blue-100 mr-2" />
              <LanguageSelectorMinimal />
            </div>
 */}
            {/* Theme toggle button */}
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-2"
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 transition-all duration-300" />
              ) : (
                <Sun className="h-4 w-4 transition-all duration-300" />
              )}
            </Button> */}

            {/* Mobile Menu Button */}
            <div className="lg:hidden mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-2 h-8"
                title="Menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>

            {/* Only show Admin button if user is admin */}
            {authData?.isAdmin && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs font-medium">Admin</span>
                </Button>
              </Link>
            )}

            <div className="ml-3 pl-3 border-l border-white/20">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white shadow-lg border border-white/20 transition-all hover:scale-105"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Bar Below Title */}
        <div className="hidden lg:flex items-center justify-center space-x-1 pb-3 border-b border-white/10">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="Dashboard"
            >
              <Home className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Dashboard</span>
            </Button>
          </Link>
          <Link href="/schemes">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="Schemes"
            >
              <GitBranchPlus className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Schemes</span>
            </Button>
          </Link>
          <Link href="/regions">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="Regions"
            >
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Regions</span>
            </Button>
          </Link>
          <Link href="/reports">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="Reports"
            >
              <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Reports</span>
            </Button>
          </Link>
          <Link href="/hierarchy">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="Hierarchy"
            >
              <PieChart className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Hierarchy</span>
            </Button>
          </Link>

          {/* LPCD Dropdown */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="LPCD Options"
            >
              <Droplet className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">LPCD</span>
            </Button>

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 mt-1 w-40 bg-white/10 backdrop-blur-md border border-white/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-1">
                <Link href="/lpcd">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-blue-500  px-3 h-8 rounded-md"
                  >
                    <Droplet className="h-3 w-3 mr-2" />
                    Village LPCD
                  </Button>
                </Link>
                <Link href="/scheme-lpcd">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-blue-500  px-3 h-8 rounded-md"
                  >
                    <GitBranchPlus className="h-3 w-3 mr-2" />
                    Scheme LPCD
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Link href="/chlorine">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="Chlorine"
            >
              <Flame className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Chlorine</span>
            </Button>
          </Link>
          <Link href="/pressure">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="Pressure"
            >
              <Gauge className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Pressure</span>
            </Button>
          </Link>
          <Link href="/communication-status">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-100 hover:text-white hover:bg-white/15 backdrop-blur-sm px-2.5 h-8 rounded-md transition-all duration-200 hover:scale-[1.02] border border-white/20 hover:border-white/40 shadow-sm hover:shadow-md"
              title="Communication"
            >
              <Wifi className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs font-medium">Communication</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-blue-600 backdrop-blur-md border-t border-blue-400/30 shadow-lg">
          <div className="px-4 py-2 space-y-1">
            <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/schemes" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <GitBranchPlus className="h-4 w-4 mr-2" />
                Schemes
              </Button>
            </Link>
            <Link href="/regions" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Regions
              </Button>
            </Link>
            <Link href="/reports" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                Reports
              </Button>
            </Link>
            <Link href="/hierarchy" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <PieChart className="h-4 w-4 mr-2" />
                Hierarchy
              </Button>
            </Link>
            <Link
              href="/lpcd/village"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <Droplet className="h-4 w-4 mr-2" />
                Village LPCD
              </Button>
            </Link>
            <Link
              href="/lpcd/scheme"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <GitBranchPlus className="h-4 w-4 mr-2" />
                Scheme LPCD
              </Button>
            </Link>
            <Link href="/chlorine" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <Flame className="h-4 w-4 mr-2" />
                Chlorine
              </Button>
            </Link>
            <Link href="/pressure" onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <Gauge className="h-4 w-4 mr-2" />
                Pressure
              </Button>
            </Link>
            <Link
              href="/communication-status"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-blue-700/50 backdrop-blur-sm px-3 h-10"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Communication
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
