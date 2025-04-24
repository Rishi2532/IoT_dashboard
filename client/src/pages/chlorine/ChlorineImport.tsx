import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, FileCheck, AlertCircle, XCircle, CheckCircle, Download, FileSpreadsheet } from 'lucide-react';

interface ImportResult {
  message?: string;
  inserted: number;
  updated: number;
  errors: string[];
}

const ChlorineImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Import Excel mutation
  const excelMutation = useMutation({
    mutationFn: async () => {
      if (!excelFile) {
        throw new Error('No Excel file selected');
      }
      
      const formData = new FormData();
      formData.append('file', excelFile);
      
      return apiRequest('/api/chlorine/import/excel', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, it will be automatically set with the boundary
        },
      });
    },
    onSuccess: (data: ImportResult) => {
      toast({
        title: 'Excel Import Successful',
        description: `Imported ${data.inserted} records, updated ${data.updated} records`,
        variant: 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/chlorine'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chlorine/dashboard-stats'] });
      
      // Reset file input
      setExcelFile(null);
    },
    onError: (error) => {
      toast({
        title: 'Excel Import Failed',
        description: (error as Error)?.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Import CSV mutation
  const csvMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile) {
        throw new Error('No CSV file selected');
      }
      
      const formData = new FormData();
      formData.append('file', csvFile);
      
      return apiRequest('/api/chlorine/import/csv', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type here, it will be automatically set with the boundary
        },
      });
    },
    onSuccess: (data: ImportResult) => {
      toast({
        title: 'CSV Import Successful',
        description: `Imported ${data.inserted} records, updated ${data.updated} records`,
        variant: 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/chlorine'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chlorine/dashboard-stats'] });
      
      // Reset file input
      setCsvFile(null);
    },
    onError: (error) => {
      toast({
        title: 'CSV Import Failed',
        description: (error as Error)?.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Handle file change for Excel
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setExcelFile(e.target.files[0]);
    }
  };
  
  // Handle file change for CSV
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };
  
  // Handle Excel import
  const handleExcelImport = () => {
    excelMutation.mutate();
  };
  
  // Handle CSV import
  const handleCsvImport = () => {
    csvMutation.mutate();
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Import Chlorine Data</CardTitle>
            <CardDescription>Upload Excel or CSV files to update chlorine measurements for ESRs</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="excel">
            <TabsList className="mb-6">
              <TabsTrigger value="excel">Excel (With Headers)</TabsTrigger>
              <TabsTrigger value="csv">CSV (With Headers)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="excel">
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Excel File Requirements</AlertTitle>
                  <AlertDescription>
                    <p>Excel file must include headers with the following expected column names:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Region, Scheme ID, Scheme Name, Village Name, ESR Name</li>
                      <li>Chlorine Value Day 1-7, Chlorine Date Day 1-7</li>
                      <li>Sensor ID (optional)</li>
                    </ul>
                    <p className="mt-2 text-primary font-medium">
                      The most recent chlorine measurement should be in "Chlorine Value Day 7" with date in "Chlorine Date Day 7".
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col space-y-4">
                  <div>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelFileChange}
                      disabled={excelMutation.isPending}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {excelFile ? `Selected: ${excelFile.name}` : 'No file selected'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleExcelImport}
                    disabled={!excelFile || excelMutation.isPending}
                    className="w-fit"
                  >
                    {excelMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Import Excel
                      </>
                    )}
                  </Button>
                </div>
                
                {excelMutation.isSuccess && (
                  <div className="mt-4">
                    <Alert className="bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-600">Import Successful</AlertTitle>
                      <AlertDescription className="text-green-800">
                        <p>Chlorine data has been successfully imported.</p>
                        <p className="mt-2">
                          Created: {excelMutation.data.inserted} records | 
                          Updated: {excelMutation.data.updated} records
                        </p>
                        
                        {excelMutation.data.errors && excelMutation.data.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold">Errors ({excelMutation.data.errors.length}):</p>
                            <ul className="list-disc list-inside mt-1">
                              {excelMutation.data.errors.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-red-600">{error}</li>
                              ))}
                              {excelMutation.data.errors.length > 5 && (
                                <li>...and {excelMutation.data.errors.length - 5} more errors</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {excelMutation.isError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Import Failed</AlertTitle>
                    <AlertDescription>
                      {(excelMutation.error as Error)?.message || 'An unknown error occurred'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="csv">
              <div className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>CSV File Requirements</AlertTitle>
                  <AlertDescription>
                    <p>CSV file must include headers with the following column names:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Region, Scheme ID, Scheme Name, Village Name, ESR Name</li>
                      <li>Chlorine Value Day 1-7, Chlorine Date Day 1-7</li>
                      <li>Sensor ID (optional)</li>
                    </ul>
                    <p className="mt-2 text-primary font-medium">
                      The most recent chlorine measurement should be in "Chlorine Value Day 7" with date in "Chlorine Date Day 7".
                    </p>
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col space-y-4">
                  <div>
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      disabled={csvMutation.isPending}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {csvFile ? `Selected: ${csvFile.name}` : 'No file selected'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleCsvImport}
                    disabled={!csvFile || csvMutation.isPending}
                    className="w-fit"
                  >
                    {csvMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Import CSV
                      </>
                    )}
                  </Button>
                </div>
                
                {csvMutation.isSuccess && (
                  <div className="mt-4">
                    <Alert className="bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-600">Import Successful</AlertTitle>
                      <AlertDescription className="text-green-800">
                        <p>Chlorine data has been successfully imported.</p>
                        <p className="mt-2">
                          Created: {csvMutation.data.inserted} records | 
                          Updated: {csvMutation.data.updated} records
                        </p>
                        
                        {csvMutation.data.errors && csvMutation.data.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold">Errors ({csvMutation.data.errors.length}):</p>
                            <ul className="list-disc list-inside mt-1">
                              {csvMutation.data.errors.slice(0, 5).map((error, index) => (
                                <li key={index} className="text-red-600">{error}</li>
                              ))}
                              {csvMutation.data.errors.length > 5 && (
                                <li>...and {csvMutation.data.errors.length - 5} more errors</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {csvMutation.isError && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Import Failed</AlertTitle>
                    <AlertDescription>
                      {(csvMutation.error as Error)?.message || 'An unknown error occurred'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChlorineImport;