import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle,
  FilePlus,
  UploadCloud,
  Download,
} from "lucide-react";
import ImportLayout from "@/components/dashboard/import-layout";

const PressureImport: React.FC = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clearExisting, setClearExisting] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    records?: number;
    errors?: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress (in a real implementation, you would use XHR or fetch with progress)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clearExisting", clearExisting.toString());

      const response = await fetch("/api/pressure/import", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok) {
        setUploadResult({
          success: true,
          message: data.message || "Import successful",
          records: data.totalProcessed || (data.inserted + data.updated) || 0,
          errors: data.errors || [],
        });
        toast({
          title: "Import successful",
          description: `Successfully imported pressure data. ${data.totalProcessed || (data.inserted + data.updated) || 0} records processed.`,
        });
      } else {
        setUploadResult({
          success: false,
          message: data.message || "Import failed",
          errors: data.errors || [],
        });
        toast({
          title: "Import failed",
          description: data.message || "Failed to import pressure data",
          variant: "destructive",
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploadResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to import data",
      });
      toast({
        title: "Import failed",
        description: "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create sample CSV data
    const sampleData =
      "Region,Circle,Division,Sub Division,Block,Scheme ID,Scheme Name,Village Name,ESR Name,Pressure (bar),Date\n" +
      "Nagpur,Circle1,Division1,SubDivision1,Block1,20001234,Sample Scheme,Sample Village 1,ESR 1,2.5,2023-10-01\n" +
      "Nagpur,Circle1,Division1,SubDivision1,Block1,20001234,Sample Scheme,Sample Village 1,ESR 2,3.1,2023-10-01\n" +
      "Nagpur,Circle1,Division1,SubDivision1,Block1,20001234,Sample Scheme,Sample Village 2,ESR 1,2.8,2023-10-01";

    // Create and download the file
    const blob = new Blob([sampleData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pressure_data_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ImportLayout>
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-2">Import Pressure Data</h1>
        <p className="mb-6 text-gray-600">
          Upload Excel or CSV files with pressure measurements (in bar) for Elevated Storage Reservoirs (ESRs).
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Upload Pressure Data</CardTitle>
            <CardDescription>
              Import pressure data from Excel (.xlsx) or CSV (.csv) files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-sm font-medium">
                  Select File
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer block text-center"
                  >
                    <UploadCloud className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm font-medium">
                      Click to select a file or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      Support for Excel (.xlsx, .xls) and CSV (.csv)
                    </p>
                    {file && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-left max-w-md mx-auto">
                        <div className="flex items-center">
                          <FilePlus className="h-5 w-5 text-blue-500 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-blue-700">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clear-existing"
                  checked={clearExisting}
                  onCheckedChange={(checked) =>
                    setClearExisting(checked as boolean)
                  }
                />
                <Label
                  htmlFor="clear-existing"
                  className="text-sm font-medium cursor-pointer"
                >
                  Clear existing data before import
                </Label>
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
                  className={
                    uploadResult.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }
                >
                  {uploadResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertTitle>
                    {uploadResult.success
                      ? "Import successful"
                      : "Import failed"}
                  </AlertTitle>
                  <AlertDescription>
                    <p>{uploadResult.message}</p>
                    {uploadResult.success &&
                      uploadResult.records !== undefined && (
                        <p className="mt-1 text-sm">
                          Processed {uploadResult.records} records
                        </p>
                      )}
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-sm">Errors:</p>
                        <div className="max-h-32 overflow-y-auto mt-1 p-2 bg-white bg-opacity-50 rounded text-sm">
                          {uploadResult.errors.map((error, idx) => (
                            <p key={idx} className="text-red-700">
                              {error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              disabled={isUploading}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? (
                <>Uploading...</>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ImportLayout>
  );
};

export default PressureImport;
