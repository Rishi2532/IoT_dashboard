import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { 
  Card
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
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';

// Forgot password form schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [, setLocation] = useLocation();
  
  // Form setup
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    }
  });

  // Password reset mutation
  const resetMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormValues) => {
      // Normally would make API call here
      // This is just a placeholder for now
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1500);
      });
    },
    onSuccess: () => {
      setResetSuccess(true);
      setResetError(null);
      form.reset();
    },
    onError: (error: Error) => {
      setResetError(error.message);
      setResetSuccess(false);
    }
  });

  // Form submission handler
  const onSubmit = (data: ForgotPasswordFormValues) => {
    resetMutation.mutate(data);
  };

  return (
    <div className="flex flex-col min-h-screen bg-cover bg-center" 
         style={{ backgroundImage: "url('/images/jal-jeevan-mission.png')" }}>
      <div className="absolute top-10 left-10">
        <div className="flex items-center text-blue-800">
          <div className="ml-3">
            <h1 className="text-3xl font-bold text-white">Jal Jeevan</h1>
            <h2 className="text-2xl font-bold text-white">Mission</h2>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-end px-12">
        <Card className="w-full max-w-sm shadow-xl border-0 bg-white rounded-lg overflow-hidden">
          <div className="p-6 pb-4">
            <h1 className="text-xl font-bold text-center text-blue-900 mb-6">
              Reset Password
            </h1>
            
            {resetError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{resetError}</AlertDescription>
              </Alert>
            )}
            
            {resetSuccess ? (
              <div className="text-center space-y-4">
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <AlertTitle className="text-green-800">Email Sent</AlertTitle>
                  <AlertDescription className="text-green-700">
                    If an account exists with that email, you will receive password reset instructions.
                  </AlertDescription>
                </Alert>
                <Button 
                  className="mt-4 bg-blue-900 hover:bg-blue-800"
                  onClick={() => setLocation('/login')}
                >
                  Return to Login
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-800 font-medium">Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your email address" 
                            type="email"
                            {...field} 
                            className="border-gray-300 focus-visible:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-900 hover:bg-blue-800 py-6 mt-2"
                    disabled={resetMutation.isPending}
                  >
                    {resetMutation.isPending ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </Form>
            )}
            
            <div className="mt-4 text-sm text-center">
              <div className="mt-2">
                <Link href="/login" className="text-blue-600 hover:underline flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}