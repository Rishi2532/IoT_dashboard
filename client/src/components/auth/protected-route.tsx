import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';

interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  // Check authentication status
  const { data, isLoading, isError } = useQuery<AuthStatusResponse>({
    queryKey: ['/api/auth/status'],
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!isLoading) {
      setIsChecking(false);
      if (!data?.isLoggedIn || !data?.isAdmin) {
        // Redirect to login page if not authenticated
        setLocation('/admin');
      }
    }
  }, [data, isLoading, setLocation]);

  if (isChecking || isLoading) {
    // Show loading spinner while checking auth status
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <p className="text-blue-700 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.isLoggedIn || !data?.isAdmin) {
    // If there's an error or not authenticated, return null 
    // (useEffect will handle redirect)
    return null;
  }

  // If authenticated, render the children
  return <>{children}</>;
}