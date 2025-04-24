import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, FilePlus, UploadCloud, Download } from 'lucide-react';

const PressureImport: React.FC = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    inserted: number;
    updated: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        const newProgress = prev + 5;
        if (newProgress >= 90) {
          clearInterval(interval);
          return 90;
        }
        return newProgress;
      });
    }, 100);

    return interval;
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'csv') {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    const progressInterval = simulateProgress();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/pressure/import/csv', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }

      const result = await response.json();
      setUploadProgress(100);

      setUploadResult({
        success: true,
        inserted: result.inserted || 0,
        updated: result.updated || 0,
        errors: result.errors || [],
      });

      toast({
        title: "Upload successful",
        description: `Processed ${result.inserted + result.updated} records`,
      });
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      
      setUploadResult({
        success: false,
        inserted: 0,
        updated: 0,
        errors: [error.message || 'An unknown error occurred'],
      });
      
      toast({
        title: "Upload failed",
        description: error.message || 'Failed to upload file',
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Import Pressure Data</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Pressure Data CSV</CardTitle>
          <CardDescription>
            Upload a CSV file containing pressure data for ESRs. The file should include scheme_id, village_name, 
            esr_name, and pressure values for each day.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="csvFile">Select CSV file</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition-colors
                      ${file ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
                  >
                    <Input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="csvFile" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        {file ? (
                          <>
                            <FilePlus className="h-10 w-10 text-blue-500 mb-2" />
                            <p className="text-sm font-medium text-blue-700">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                            <p className="text-sm font-medium">Click to select a CSV file</p>
                            <p className="text-xs text-gray-500">
                              or drag and drop here
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                
                <Button 
                  disabled={!file || isUploading} 
                  onClick={handleUpload}
                  className="min-w-[120px]"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
            
            {uploadResult && (
              <Alert 
                variant={uploadResult.success ? "default" : "destructive"}
                className={uploadResult.success ? "border-green-300 bg-green-50" : ""}
              >
                {uploadResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {uploadResult.success ? "Upload Successful" : "Upload Failed"}
                </AlertTitle>
                <AlertDescription>
                  {uploadResult.success ? (
                    <div className="space-y-2">
                      <p>
                        Successfully processed the CSV file.
                      </p>
                      <ul className="list-disc list-inside text-sm">
                        <li>Inserted records: {uploadResult.inserted}</li>
                        <li>Updated records: {uploadResult.updated}</li>
                        <li>Total processed: {uploadResult.inserted + uploadResult.updated}</li>
                      </ul>
                      
                      {uploadResult.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Some records had errors:</p>
                          <div className="max-h-40 overflow-y-auto mt-1 p-2 bg-red-50 rounded border border-red-200 text-sm">
                            {uploadResult.errors.map((error, idx) => (
                              <p key={idx} className="text-red-800">{error}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>
                        Failed to process the CSV file. Please check the format and try again.
                      </p>
                      {uploadResult.errors.length > 0 && (
                        <div className="max-h-40 overflow-y-auto mt-1 p-2 bg-red-50 rounded border border-red-200 text-sm">
                          {uploadResult.errors.map((error, idx) => (
                            <p key={idx}>{error}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-4 bg-gray-50">
          <div className="text-sm text-gray-500">
            <p>Supported format: CSV</p>
            <p>Maximum file size: 10MB</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Generate sample CSV content with header row
                const sampleData = [
                  "region,circle,division,sub_division,block,scheme_id,scheme_name,village_name,esr_name,pressure_value_1,pressure_value_2,pressure_value_3,pressure_value_4,pressure_value_5,pressure_value_6,pressure_value_7,pressure_date_day_1,pressure_date_day_2,pressure_date_day_3,pressure_date_day_4,pressure_date_day_5,pressure_date_day_6,pressure_date_day_7,number_of_consistent_zero_value_in_pressure,pressure_less_than_02_bar,pressure_between_02_07_bar,pressure_greater_than_07_bar",
                  "Amravati,Circle1,Division1,SubDiv1,Block1,AMR2001,Sample Scheme,Village1,ESR1,0.3,0.4,0.5,0.3,0.4,0.2,0.5,2025-04-17,2025-04-18,2025-04-19,2025-04-20,2025-04-21,2025-04-22,2025-04-23,0,0,1,0",
                  "Nagpur,Circle2,Division2,SubDiv2,Block2,NAG2002,Sample Scheme 2,Village2,ESR2,0.1,0.2,0.1,0.3,0.1,0.1,0.2,2025-04-17,2025-04-18,2025-04-19,2025-04-20,2025-04-21,2025-04-22,2025-04-23,0,1,0,0"
                ].join('\n');
                
                // Create blob and download
                const blob = new Blob([sampleData], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'pressure_data_template.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Download Template
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setFile(null);
                setUploadResult(null);
              }}
              disabled={isUploading}
            >
              Clear
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>CSV Format Instructions</CardTitle>
          <CardDescription>
            Your CSV file must include the following columns:
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">CSV Column Index</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Field Name</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Description</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Required</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">0</td>
                    <td className="border border-gray-200 px-4 py-2">region</td>
                    <td className="border border-gray-200 px-4 py-2">Region name</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">1</td>
                    <td className="border border-gray-200 px-4 py-2">circle</td>
                    <td className="border border-gray-200 px-4 py-2">Circle name</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">2</td>
                    <td className="border border-gray-200 px-4 py-2">division</td>
                    <td className="border border-gray-200 px-4 py-2">Division name</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">3</td>
                    <td className="border border-gray-200 px-4 py-2">sub_division</td>
                    <td className="border border-gray-200 px-4 py-2">Sub-division name</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">4</td>
                    <td className="border border-gray-200 px-4 py-2">block</td>
                    <td className="border border-gray-200 px-4 py-2">Block name</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">5</td>
                    <td className="border border-gray-200 px-4 py-2">scheme_id</td>
                    <td className="border border-gray-200 px-4 py-2">Unique identifier for the scheme</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">6</td>
                    <td className="border border-gray-200 px-4 py-2">scheme_name</td>
                    <td className="border border-gray-200 px-4 py-2">Name of the scheme</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">7</td>
                    <td className="border border-gray-200 px-4 py-2">village_name</td>
                    <td className="border border-gray-200 px-4 py-2">Name of the village</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">8</td>
                    <td className="border border-gray-200 px-4 py-2">esr_name</td>
                    <td className="border border-gray-200 px-4 py-2">Name of the ESR</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">9-15</td>
                    <td className="border border-gray-200 px-4 py-2">pressure_value_1 to pressure_value_7</td>
                    <td className="border border-gray-200 px-4 py-2">Pressure values for each day (bar)</td>
                    <td className="border border-gray-200 px-4 py-2">At least one</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">16-22</td>
                    <td className="border border-gray-200 px-4 py-2">pressure_date_day_1 to pressure_date_day_7</td>
                    <td className="border border-gray-200 px-4 py-2">Dates for each pressure reading</td>
                    <td className="border border-gray-200 px-4 py-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">23</td>
                    <td className="border border-gray-200 px-4 py-2">number_of_consistent_zero_value_in_pressure</td>
                    <td className="border border-gray-200 px-4 py-2">Count of consistent zero values</td>
                    <td className="border border-gray-200 px-4 py-2">No</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">24</td>
                    <td className="border border-gray-200 px-4 py-2">pressure_less_than_02_bar</td>
                    <td className="border border-gray-200 px-4 py-2">Indicates pressure below required range</td>
                    <td className="border border-gray-200 px-4 py-2">No</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">25</td>
                    <td className="border border-gray-200 px-4 py-2">pressure_between_02_07_bar</td>
                    <td className="border border-gray-200 px-4 py-2">Indicates pressure in optimal range</td>
                    <td className="border border-gray-200 px-4 py-2">No</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-2">26</td>
                    <td className="border border-gray-200 px-4 py-2">pressure_greater_than_07_bar</td>
                    <td className="border border-gray-200 px-4 py-2">Indicates pressure above required range</td>
                    <td className="border border-gray-200 px-4 py-2">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2">Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The system will update records if they already exist based on scheme_id, village_name, and esr_name</li>
                <li>Pressure values should be in bar units (e.g., 0.5 for 0.5 bar)</li>
                <li>The optimal pressure range is 0.2-0.7 bar</li>
                <li>Date format should be YYYY-MM-DD (e.g., 2025-04-25)</li>
                <li>The last four columns (23-26) are used for analysis and can be calculated automatically if not provided</li>
                <li>Each row represents one ESR's pressure measurements</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PressureImport;