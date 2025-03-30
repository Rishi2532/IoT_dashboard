import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import FileUpload from './file-upload';
import { useToast } from '@/hooks/use-toast';

export default function SchemeImporter() {
  const { toast } = useToast();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/import/schemes', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import scheme data');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setUploadError(null);
      setUploadSuccess(true);
      toast({
        title: 'Import Successful',
        description: `${data.updatedCount || 0} schemes updated successfully`,
      });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      setUploadSuccess(false);
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);
    await importMutation.mutate(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Scheme Data</CardTitle>
        <CardDescription>
          Upload Excel file to update scheme data in the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-800">Important</AlertTitle>
          <AlertDescription className="text-blue-700">
            <p className="mb-2">Please ensure your Excel file follows the required format:</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>The file must contain columns for scheme details</li>
              <li>Columns must include: Scheme ID, Scheme Name, Region Name, Agency, etc.</li>
              <li>Data must begin from row 2 (row 1 is assumed to be headers)</li>
              <li>Each scheme should have a unique ID for proper updating</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <FileUpload
          onFileUpload={handleFileUpload}
          uploading={importMutation.isPending}
          error={uploadError}
          success={uploadSuccess}
          buttonText="Select Excel File"
        />
      </CardContent>
      <CardFooter className="bg-gray-50 text-xs text-gray-500 rounded-b-lg py-3">
        Data will be processed and the database will be updated automatically.
      </CardFooter>
    </Card>
  );
}