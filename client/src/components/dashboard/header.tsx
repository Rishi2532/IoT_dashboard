import { Button } from "../ui/button";
import { UserCircle, Settings, Droplet, LayoutDashboard } from "lucide-react";
import { Link } from "wouter";
import Sidebar from "./sidebar";

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Mobile menu button displayed on small screens */}
            <div className="flex-shrink-0 flex items-center">
              {/* The mobile sidebar menu button */}
              <div className="md:hidden mr-2">
                <Sidebar />
              </div>
              
              <div className="bg-white/10 rounded-full p-2 mr-3">
                <Droplet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg sm:text-xl text-white">
                  SWSM 
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white ml-1">
                    IoT
                  </span>
                </h1>
                <p className="text-xs text-blue-100 -mt-1 hidden sm:block">JJM Integration Monitoring System</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-blue-100 hover:text-white hover:bg-blue-700 px-2 sm:px-3">
                <LayoutDashboard className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-blue-100 hover:text-white hover:bg-blue-700 px-2 sm:px-3">
                <Settings className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
            <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-blue-500">
              <Button variant="ghost" size="icon" className="rounded-full bg-white/10 hover:bg-white/20 text-white">
                <UserCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
