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
import { AlertCircle, CheckCircle, FileSpreadsheet, Info, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { validateExcelFile } from '@/lib/excel-validator';

export default function SchemeImporter() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [importDetails, setImportDetails] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('excelFile', file);

      const response = await fetch('/api/admin/import-excel', {
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
      setImportDetails(data);
      toast({
        title: 'Import Successful',
        description: `${data.updatedCount || 0} schemes updated successfully`,
      });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      setUploadSuccess(false);
      setImportDetails(null);
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
      setUploadSuccess(false);
      setImportDetails(null);
    }
  };

  const [validating, setValidating] = useState(false);
  const [validationDetails, setValidationDetails] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select an Excel file to upload',
        variant: 'destructive',
      });
      return;
    }
    
    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls') {
      toast({
        title: 'Invalid file type',
        description: 'Please select an Excel file (.xlsx or .xls)',
        variant: 'destructive',
      });
      return;
    }

    // Validate Excel structure before uploading
    try {
      setValidating(true);
      setValidationDetails(null);
      
      // Read the file as ArrayBuffer
      const fileBuffer = await file.arrayBuffer();
      
      // Validate the Excel file structure
      const validationResult = await validateExcelFile(fileBuffer);
      setValidationDetails(validationResult);
      
      if (!validationResult.isValid) {
        setUploadError(validationResult.message);
        toast({
          title: 'Invalid Excel File',
          description: validationResult.message,
          variant: 'destructive',
        });
        setValidating(false);
        return;
      }
      
      // Continue with upload if validation passes
      setValidating(false);
      await importMutation.mutate(file);
    } catch (error) {
      setValidating(false);
      setUploadError(`Error validating Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Validation Error',
        description: `Could not validate Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Import Scheme Data From Excel
        </CardTitle>
        <CardDescription>
          Upload Excel spreadsheet to update scheme status data in the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-800">Excel Format Requirements</AlertTitle>
          <AlertDescription className="text-blue-700">
            <p className="mb-2">The Excel file should contain the following:</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Multiple sheets with region names (Amravati, Nashik, Nagpur, Pune, Konkan, and CS for Chhatrapati Sambhajinagar)</li>
              <li>Must contain <strong>Scheme ID</strong> column for identifying schemes</li>
              <li>Required data columns (one or more of the following):
                <ul className="list-disc pl-5 mt-1">
                  <li><strong>Total Villages Integrated</strong></li>
                  <li><strong>Fully Completed Villages</strong></li>
                  <li><strong>Total ESR Integrated</strong></li>
                  <li><strong>No. Fully Completed ESR</strong></li>
                  <li><strong>Flow Meters Connected</strong> or <strong> Flow Meters Connected</strong> (note the space)</li>
                  <li><strong>Residual Chlorine Analyzer Connected</strong></li>
                  <li><strong>Pressure Transmitter Connected</strong></li>
                  <li><strong>Fully completion Scheme Status</strong> (values will be automatically adjusted: "Partial" → "In Progress")</li>
                </ul>
              </li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Input 
              type="file" 
              accept=".xlsx,.xls" 
              id="excel-file" 
              onChange={handleFileChange}
              disabled={importMutation.isPending}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">
              Select the updated Excel file with scheme data
            </p>
          </div>
          
          {file && (
            <div className="flex items-center px-3 py-1 text-sm rounded-md bg-green-50 text-green-700 border border-green-200 max-w-sm">
              <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
              <span className="truncate">{file.name}</span>
              <span className="ml-2 text-xs text-green-500">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || importMutation.isPending || validating}
            className="w-full sm:w-auto"
          >
            {importMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : validating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating Excel...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload and Process Excel
              </>
            )}
          </Button>
          
          {validationDetails && validationDetails.isValid && !uploadSuccess && !uploadError && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-800">Excel File Validated</AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                {validationDetails.message}
              </AlertDescription>
            </Alert>
          )}
          
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
          
          {uploadSuccess && importDetails && (
            <Alert variant="default" className="bg-green-50 border-green-200 text-green-800">
              <div className="flex-col space-y-2">
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <AlertTitle className="text-green-800">Import Successful</AlertTitle>
                </div>
                <AlertDescription>
                  <p>{importDetails.message}</p>
                  <Accordion type="single" collapsible className="mt-2">
                    <AccordionItem value="details">
                      <AccordionTrigger className="text-sm font-medium text-green-700">View Details</AccordionTrigger>
                      <AccordionContent>
                        <div className="text-sm">
                          <p><span className="font-medium">Total Updated:</span> {importDetails.updatedCount} schemes</p>
                          {importDetails.schemasProcessed && importDetails.schemasProcessed.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">Processed Scheme IDs:</p>
                              <div className="max-h-24 overflow-y-auto mt-1 p-2 bg-white/50 rounded border border-green-100 text-xs">
                                {importDetails.schemasProcessed.slice(0, 20).map((id: string, index: number) => (
                                  <span key={index} className="inline-block px-1.5 py-0.5 mr-1 mb-1 rounded bg-green-100 text-green-800">
                                    {id}
                                  </span>
                                ))}
                                {importDetails.schemasProcessed.length > 20 && (
                                  <span className="text-green-600 italic">
                                    ...and {importDetails.schemasProcessed.length - 20} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 text-xs text-gray-500 rounded-b-lg py-3">
        Existing schemes will be updated with new values from the Excel file.
        Scheme status values will be automatically updated (Partial → In Progress).
      </CardFooter>
    </Card>
  );
}