import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Wifi, User, LogOut, Bell } from "lucide-react";
import { Link } from "wouter";
import Sidebar from "./Sidebar";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const { toast } = useToast();

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Logout failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
      window.location.href = '/login';
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Logout failed: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden mr-4">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
          
          <div>
            <h1 className="text-xl font-bold text-gray-900">Maharashtra Water Infrastructure</h1>
            <p className="text-sm text-gray-600">Management Platform</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="bg-green-100 text-green-800 hidden sm:flex">
            <Wifi className="h-3 w-3 mr-1" />
            System Online
          </Badge>
          
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Admin
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;