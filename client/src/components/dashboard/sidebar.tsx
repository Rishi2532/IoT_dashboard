import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, GitBranchPlus, MapPin, BarChart2, Settings, ShieldCheck, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // Close the mobile sidebar if screen is resized from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsSheetOpen(false);
    }
  }, [isMobile]);

  // Desktop sidebar (collapsible)
  const DesktopSidebar = () => (
    <div className={cn(
      "hidden md:flex md:flex-shrink-0 transition-all duration-300 ease-in-out",
      isCollapsed ? "md:w-16" : "md:w-64"
    )}>
      <div className={cn(
        "flex flex-col border-r border-neutral-200 bg-white relative",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute -right-3 top-4 h-6 w-6 bg-white border border-neutral-200 rounded-full z-10 shadow-sm hover:bg-neutral-100" 
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
        
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
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      !isCollapsed && "mr-3",
                      isActive ? "text-primary-600" : "text-neutral-500"
                    )}
                  />
                  {!isCollapsed && item.name}
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
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700" aria-label="Menu">
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
                  onClick={() => setIsSheetOpen(false)}
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
  );

  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  );
}
