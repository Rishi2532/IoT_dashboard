import { ReactNode } from "react";
import Header from "./header";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="absolute inset-0 bg-[url('/images/water-pattern.svg')] opacity-[0.03] bg-repeat z-0 pointer-events-none"></div>
      <Header />
      <main className="flex-1 pt-6 sm:pt-8 lg:pt-10 2xl:pt-12 pb-4 sm:pb-6 lg:pb-8 2xl:pb-10 overflow-auto relative z-10">
        <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 max-w-full lg:max-w-[90rem] 2xl:max-w-[120rem]">
          {children}
        </div>
      </main>
    </div>
  );
}
