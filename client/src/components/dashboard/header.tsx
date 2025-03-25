import { Button } from "../ui/button";
import { UserCircle, Settings, Droplet, LayoutDashboard } from "lucide-react";
import { Link } from "wouter";

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="bg-white/10 rounded-full p-2 mr-3">
                <Droplet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-white">
                  Maharashtra 
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white ml-1">
                    Water Scheme Dashboard
                  </span>
                </h1>
                <p className="text-xs text-blue-100 -mt-1">Water Integration Monitoring System</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-blue-100 hover:text-white hover:bg-blue-700">
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-blue-100 hover:text-white hover:bg-blue-700">
                <Settings className="h-4 w-4 mr-1" />
                Admin
              </Button>
            </Link>
            <div className="ml-4 pl-4 border-l border-blue-500">
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
