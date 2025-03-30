import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
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
import { AlertCircle, LockIcon, LogIn } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

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

export default function AdminPage() {
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Check if user is already logged in
  const authStatusQuery = useQuery<AuthStatusResponse>({
    queryKey: ['/api/auth/status'],
    refetchOnWindowFocus: false,
  });
  
  // Redirect to admin dashboard if already logged in
  if (authStatusQuery.data?.isLoggedIn) {
    window.location.href = '/admin/dashboard';
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
    onSuccess: () => {
      toast({
        title: 'Login successful',
        description: 'You are now logged in as admin',
      });
      setLoginError(null);
      // Redirect to admin dashboard
      window.location.href = '/admin/dashboard';
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
    <DashboardLayout>
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md shadow-lg border-blue-100">
          <CardHeader className="space-y-1 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <LockIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center text-blue-900">Admin Login</CardTitle>
            <CardDescription className="text-center text-blue-700">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loginError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Authentication Failed</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-800">Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your username" 
                          {...field} 
                          className="border-blue-200 focus-visible:ring-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-800">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your password" 
                          {...field} 
                          className="border-blue-200 focus-visible:ring-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="bg-gray-50 border-t border-blue-100 py-3 flex justify-center">
            <p className="text-sm text-blue-700">
              Only authorized administrators can access this page
            </p>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
