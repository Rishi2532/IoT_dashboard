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

  // Close the mobile sidebar if screen is resized from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  // Desktop sidebar
  const DesktopSidebar = () => (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-neutral-200 bg-white">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigationItems.map((item) => {
              const isActive = item.href === location;
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={cn(
                    isActive 
                      ? "bg-primary-50 text-primary-800" 
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md"
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive ? "text-primary-600" : "text-neutral-500"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );

  // Mobile sidebar using Sheet component from shadcn
  const MobileSidebar = () => (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white md:hidden" aria-label="Menu">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[250px] p-0 bg-blue-50">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col pt-2 overflow-y-auto">
            <nav className="flex-1 px-2 space-y-1">
              {navigationItems.map((item) => {
                const isActive = item.href === location;
                const Icon = item.icon;
                
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      isActive 
                        ? "bg-primary-50 text-primary-800" 
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                      "group flex items-center px-3 py-3 text-base font-medium rounded-md"
                    )}
                  >
                    <Icon
                      className={cn(
                        "mr-3 h-5 w-5",
                        isActive ? "text-primary-600" : "text-neutral-500"
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
    </div>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
