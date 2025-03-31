import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, GitBranchPlus, MapPin, BarChart2, Settings, ShieldCheck, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Schemes", href: "/schemes", icon: GitBranchPlus },
  { name: "Regions", href: "/regions", icon: MapPin },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "Admin", href: "/admin", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Store sidebar state in localStorage to persist between page loads
  useEffect(() => {
    const storedState = localStorage.getItem('sidebarOpen');
    if (storedState !== null) {
      setIsOpen(storedState === 'true');
    }
  }, []);

  // Update localStorage when sidebar state changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', isOpen.toString());
  }, [isOpen]);

  // Use the Sheet component for both mobile and desktop
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700" aria-label="Menu">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[250px] p-0 bg-blue-50 border-r border-blue-200 shadow-xl"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-4 border-b border-blue-100">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-left text-blue-900">Navigation</SheetTitle>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-blue-100"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4 text-blue-700" />
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 flex flex-col pt-2 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1 py-4">
            {navigationItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    isActive 
                      ? "bg-blue-100 text-blue-800" 
                      : "text-neutral-600 hover:bg-blue-50 hover:text-blue-800",
                    "group flex items-center px-3 py-3 text-base font-medium rounded-md"
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive ? "text-blue-600" : "text-blue-500"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
