import { ReactNode } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        {/* Only show the sidebar on desktop - it's in the header on mobile */}
        {!isMobile && <Sidebar />}
        <div className="flex-1 overflow-auto">
          <main className="py-4 sm:py-6">
            <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 max-w-full lg:max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
