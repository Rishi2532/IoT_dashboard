import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Link, useLocation } from 'wouter';

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Auth status response type
interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function LoginPage() {
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string | null>(null);
  // Get the location object for navigation
  const [, setLocation] = useLocation();
  
  // Check if user is already logged in
  const authStatusQuery = useQuery<AuthStatusResponse>({
    queryKey: ['/api/auth/status'],
    refetchOnWindowFocus: false,
  });
  
  // Redirect to dashboard if already logged in
  if (authStatusQuery.data?.isLoggedIn) {
    if (authStatusQuery.data.isAdmin) {
      setLocation('/admin/dashboard');
    } else {
      setLocation('/dashboard');
    }
    return null;
  }

  // Login form setup
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormValues) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Login successful',
        description: `Welcome back, ${data.name || data.username}`,
      });
      setLoginError(null);
      
      // Redirect based on role
      if (data.isAdmin) {
        setLocation('/admin/dashboard');
      } else {
        setLocation('/dashboard');
      }
    },
    onError: (error: Error) => {
      setLoginError(error.message);
      console.error('Login error:', error);
    }
  });

  // Form submission handler
  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-100 to-blue-50">
      <div className="absolute top-10 left-10">
        <div className="flex items-center text-blue-800">
          <div className="flex items-center">
            <svg className="w-12 h-12 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3Z" />
            </svg>
            <div className="ml-3">
              <h1 className="text-3xl font-bold text-blue-900">Jal Jeevan</h1>
              <h2 className="text-2xl font-bold text-blue-700">Mission</h2>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-blue-900">
            Water Infrastructure Portal
          </h1>
          <p className="text-blue-700 text-xl mt-2">
            Select login type to continue
          </p>
        </div>
        
        <div className="flex gap-8 items-stretch">
          {/* Admin Login Card */}
          <Card 
            className="w-72 shadow-lg border border-blue-100 bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
            onClick={() => setLocation('/admin')}
          >
            <div className="p-6 flex flex-col items-center h-full">
              <div className="w-24 h-24 rounded-full bg-blue-900 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-white">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-center text-blue-900">
                Admin Login
              </h2>
              <p className="text-gray-600 text-center mt-3 mb-5 flex-grow">
                Access admin controls, upload data and manage system
              </p>
              <Button 
                className="w-full bg-blue-900 hover:bg-blue-800 py-5 text-lg"
              >
                Admin Access
              </Button>
            </div>
          </Card>
          
          {/* User Login Card */}
          <Card 
            className="w-72 shadow-lg border border-blue-100 bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
            onClick={() => {
              if (loginMutation.isPending) return;
              setLocation('/dashboard');
            }}
          >
            <div className="p-6 flex flex-col items-center h-full">
              <div className="w-24 h-24 rounded-full bg-blue-700 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-white">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-center text-blue-700">
                User Login
              </h2>
              <p className="text-gray-600 text-center mt-3 mb-5 flex-grow">
                Access data visualization and analytics dashboard
              </p>
              <Button 
                className="w-full bg-blue-700 hover:bg-blue-600 py-5 text-lg"
              >
                User Access
              </Button>
            </div>
          </Card>
        </div>
        
        {loginError && (
          <Alert variant="destructive" className="mt-6 max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Failed</AlertTitle>
            <AlertDescription>{loginError}</AlertDescription>
          </Alert>
        )}
                  
        <div className="mt-10 text-sm text-center">
          <div className="mt-2">
            <Link href="/register" className="text-blue-700 hover:underline">
              Don't have an account? Register
            </Link>
          </div>
          <div className="mt-2">
            <Link href="/forgot-password" className="text-blue-700 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}