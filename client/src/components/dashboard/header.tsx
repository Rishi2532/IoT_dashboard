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
                  className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-rose-500/20 to-pink-500/20 hover:from-rose-400/30 hover:to-pink-400/30 backdrop-blur-md px-3 h-8 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-rose-400/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                  <Settings className="h-4 w-4 mr-2 relative z-10" />
                  <span className="text-sm font-semibold relative z-10">Admin</span>
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
        <div className="hidden lg:flex items-center justify-center space-x-2 pb-3 border-b border-white/10">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-400/30 hover:to-cyan-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-blue-400/20"
              title="Dashboard"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <Home className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">Dashboard</span>
            </Button>
          </Link>
          <Link href="/schemes">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-400/30 hover:to-teal-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-emerald-400/20"
              title="Schemes"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <GitBranchPlus className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">Schemes</span>
            </Button>
          </Link>
          <Link href="/regions">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-400/30 hover:to-pink-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-purple-400/20"
              title="Regions"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <MapPin className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">Regions</span>
            </Button>
          </Link>
          <Link href="/reports">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-orange-500/20 to-red-500/20 hover:from-orange-400/30 hover:to-red-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-orange-400/20"
              title="Reports"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <BarChart2 className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">Reports</span>
            </Button>
          </Link>
          <Link href="/hierarchy">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-indigo-500/20 to-blue-500/20 hover:from-indigo-400/30 hover:to-blue-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-indigo-400/20"
              title="Hierarchy"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <PieChart className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">Hierarchy</span>
            </Button>
          </Link>

          {/* LPCD Dropdown */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-400/30 hover:to-blue-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-cyan-400/20"
              title="LPCD Options"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <Droplet className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">LPCD</span>
            </Button>

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 mt-2 w-44 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/40 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 transform translate-y-2 group-hover:translate-y-0">
              <div className="py-2">
                <Link href="/lpcd">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-white hover:text-white hover:bg-white/20 backdrop-blur-sm px-3 h-9 rounded-lg mx-1 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <Droplet className="h-4 w-4 mr-2" />
                    <span className="font-medium">Village LPCD</span>
                  </Button>
                </Link>
                <Link href="/scheme-lpcd">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-white hover:text-white hover:bg-white/20 backdrop-blur-sm px-3 h-9 rounded-lg mx-1 transition-all duration-200 hover:scale-[1.02]"
                  >
                    <GitBranchPlus className="h-4 w-4 mr-2" />
                    <span className="font-medium">Scheme LPCD</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Link href="/chlorine">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-green-500/20 to-lime-500/20 hover:from-green-400/30 hover:to-lime-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-green-400/20"
              title="Chlorine"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <Flame className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">Chlorine</span>
            </Button>
          </Link>
          <Link href="/pressure">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-400/30 hover:to-amber-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-yellow-400/20"
              title="Pressure"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <Gauge className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">Pressure</span>
            </Button>
          </Link>
          <Link href="/communication-status">
            <Button
              variant="ghost"
              size="sm"
              className="group relative overflow-hidden text-white hover:text-white bg-gradient-to-r from-violet-500/20 to-purple-500/20 hover:from-violet-400/30 hover:to-purple-400/30 backdrop-blur-md px-3 h-9 rounded-lg transition-all duration-300 hover:scale-105 border border-white/30 hover:border-white/60 shadow-lg hover:shadow-xl hover:shadow-violet-400/20"
              title="Communication"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              <Wifi className="h-4 w-4 mr-2 relative z-10" />
              <span className="text-sm font-semibold relative z-10">Communication</span>
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
