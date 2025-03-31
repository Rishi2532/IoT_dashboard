import { ReactNode } from "react";
import Header from "./header";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-4 sm:py-6 lg:py-8 2xl:py-10 overflow-auto">
        <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 max-w-full lg:max-w-[90rem] 2xl:max-w-[120rem]">
          {children}
        </div>
      </main>
    </div>
  );
}
