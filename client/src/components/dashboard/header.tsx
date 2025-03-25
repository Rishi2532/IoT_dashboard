import { Button } from "../ui/button";
import { UserCircle, Settings } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-primary mr-2"
              >
                <path d="M8.75 6.75C10.7855 6.75 12.25 8.21447 12.25 10.25C12.25 12.2855 10.7855 13.75 8.75 13.75H2.5V6.75H8.75Z" />
                <path d="M12.25 10.25C12.25 8.21447 13.7145 6.75 15.75 6.75H22V17.25H15.75C13.7145 17.25 12.25 15.7855 12.25 13.75V10.25Z" />
                <path d="M7 13.75V17.25H2.5" />
              </svg>
              <span className="font-semibold text-xl">Water Scheme Dashboard</span>
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon">
              <UserCircle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="ml-2">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
