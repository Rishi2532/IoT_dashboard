import { Button } from "@/components/ui/button";
import { Activity, Home, Settings, FileText, Users, Database, Upload, BarChart3, Droplets, Zap, Gauge } from "lucide-react";
import { Link, useLocation } from "wouter";

const Sidebar = () => {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="w-64 bg-white shadow-lg h-full border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <Droplets className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Maharashtra</h2>
            <p className="text-xs text-gray-600">Water Dashboard</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          <Link href="/dashboard">
            <Button 
              variant={isActive("/dashboard") ? "default" : "ghost"} 
              className="w-full justify-start"
            >
              <Home className="h-4 w-4 mr-3" />
              Dashboard
            </Button>
          </Link>
          
          <Link href="/schemes">
            <Button 
              variant={isActive("/schemes") ? "default" : "ghost"} 
              className="w-full justify-start"
            >
              <Database className="h-4 w-4 mr-3" />
              Schemes
            </Button>
          </Link>
          
          <Link href="/regions">
            <Button 
              variant={isActive("/regions") ? "default" : "ghost"} 
              className="w-full justify-start"
            >
              <BarChart3 className="h-4 w-4 mr-3" />
              Regions
            </Button>
          </Link>
          
          <Link href="/lpcd">
            <Button 
              variant={isActive("/lpcd") ? "default" : "ghost"} 
              className="w-full justify-start"
            >
              <Droplets className="h-4 w-4 mr-3" />
              LPCD Analysis
            </Button>
          </Link>
          
          <Link href="/chlorine">
            <Button 
              variant={isActive("/chlorine") ? "default" : "ghost"} 
              className="w-full justify-start"
            >
              <Zap className="h-4 w-4 mr-3" />
              Chlorine Data
            </Button>
          </Link>
          
          <Link href="/pressure">
            <Button 
              variant={isActive("/pressure") ? "default" : "ghost"} 
              className="w-full justify-start"
            >
              <Gauge className="h-4 w-4 mr-3" />
              Pressure Data
            </Button>
          </Link>
          
          <Link href="/communication">
            <Button 
              variant={isActive("/communication") ? "default" : "ghost"} 
              className="w-full justify-start"
            >
              <Activity className="h-4 w-4 mr-3" />
              Communication Status
            </Button>
          </Link>
          
          <Link href="/reports">
            <Button 
              variant={isActive("/reports") ? "default" : "ghost"} 
              className="w-full justify-start"
            >
              <FileText className="h-4 w-4 mr-3" />
              Reports
            </Button>
          </Link>
          
          <div className="pt-4 border-t border-gray-200 mt-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">ADMIN</p>
            <Link href="/admin/dashboard">
              <Button 
                variant={isActive("/admin/dashboard") ? "default" : "ghost"} 
                className="w-full justify-start"
              >
                <Settings className="h-4 w-4 mr-3" />
                Admin Dashboard
              </Button>
            </Link>
            
            <Link href="/admin/import-communication-status">
              <Button 
                variant={isActive("/admin/import-communication-status") ? "default" : "ghost"} 
                className="w-full justify-start"
              >
                <Upload className="h-4 w-4 mr-3" />
                Import Communication Data
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;