import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  UploadCloud,
  FileCheck,
  AlertCircle,
  XCircle,
  CheckCircle,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import ImportLayout from "@/components/dashboard/import-layout";

interface ImportResult {
  message: string;
  inserted: number;
  updated: number;
  errors: string[];
}

const LpcdImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [amravatiFile, setAmravatiFile] = useState<File | null>(null);

  // Import Excel mutation
  const excelMutation = useMutation({
    mutationFn: async () => {
      if (!excelFile) {
        throw new Error("No Excel file selected");
      }

      const formData = new FormData();
      formData.append("file", excelFile);

      const response = await fetch("/api/lpcd/import/excel", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import Excel file");
      }

      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lpcd"] });
      toast({
        title: "Import successful",
        description: `${data.message} (${data.inserted} inserted, ${data.updated} updated)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import CSV mutation
  const csvMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile) {
        throw new Error("No CSV file selected");
      }

      const formData = new FormData();
      formData.append("file", csvFile);

      const response = await fetch("/api/lpcd/import/csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import CSV file");
      }

      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lpcd"] });
      toast({
        title: "Import successful",
        description: `${data.message} (${data.inserted} inserted, ${data.updated} updated)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import Amravati format mutation
  const amravatiMutation = useMutation({
    mutationFn: async () => {
      if (!amravatiFile) {
        throw new Error("No Excel file selected");
      }

      const formData = new FormData();
      formData.append("file", amravatiFile);

      const response = await fetch("/api/lpcd/import/amravati", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || "Failed to import Amravati format file",
        );
      }

      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lpcd"] });
      toast({
        title: "Import successful",
        description: `${data.message} (${data.inserted} inserted, ${data.updated} updated)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setExcelFile(e.target.files[0]);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleAmravatiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAmravatiFile(e.target.files[0]);
    }
  };

  const isExcelMutating = excelMutation.isPending;
  const isCsvMutating = csvMutation.isPending;
  const isAmravatiMutating = amravatiMutation.isPending;

  const handleExcelSubmit = () => {
    excelMutation.mutate();
  };

  const handleCsvSubmit = () => {
    csvMutation.mutate();
  };

  const handleAmravatiSubmit = () => {
    amravatiMutation.mutate();
  };

  const downloadTemplate = () => {
    // Create a sample template for download
    const sampleData =
      "Region,Circle,Division,Sub-Division,Block,Scheme ID,Scheme Name,Village Name,Population,Number of ESR,Water Value Day 1-7,LPCD Value Day 1-7,Water Date Day 1-6,LPCD Date Day 1-7\n" +
      "Amravati,Circle1,Division1,SubDiv1,Block1,20001234,Sample Scheme,Sample Village,2500,2,45000,18,44000,17.6,43000,17.2,45500,18.2,46000,18.4,45500,18.2,46500,18.6,2025-04-17,2025-04-18,2025-04-19,2025-04-20,2025-04-21,2025-04-22,2025-04-17,2025-04-18,2025-04-19,2025-04-20,2025-04-21,2025-04-22,2025-04-23";

    const blob = new Blob([sampleData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lpcd_data_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ImportLayout>
      <div className="w-full">
        {/* <h1 className="text-2xl font-bold mb-6">Import LPCD Data</h1>
        <p className="mb-6 text-gray-600">
          Upload Excel or CSV files containing LPCD (Liters Per Capita per Day) data for water schemes.
        </p> */}

        <Tabs defaultValue="excel">
          <TabsList className="mb-4">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel (With Headers)
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              CSV (No Headers)
            </TabsTrigger>
            <TabsTrigger value="amravati" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Amravati Format
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel">
            <Card>
              <CardHeader>
                <CardTitle>Import Water Scheme Data</CardTitle>
                <CardDescription>
                  Upload Excel or CSV files to update water scheme data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1 text-blue-500" />
                      Excel File Requirements
                    </h3>
                    <div className="text-sm text-gray-600 mb-4 pl-5">
                      <p>
                        Excel file must include headers with the following
                        expected column names:
                      </p>
                      <ul className="list-disc ml-5 mt-1 space-y-1">
                        <li>Region, Circle, Division, Sub-Division, Block</li>
                        <li>
                          Scheme ID, Scheme Name, Village Name, Population,
                          Number of ESR
                        </li>
                        <li>Water Value Day 1-7, LPCD Value Day 1-7</li>
                        <li>Water Date Day 1-6, LPCD Date Day 1-7</li>
                      </ul>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                      <Input
                        id="excelFile"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelFileChange}
                        className="hidden"
                      />
                      <label htmlFor="excelFile" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                          <p className="text-sm font-medium">
                            Click to select an Excel file
                          </p>
                          <p className="text-xs text-gray-500">
                            or drag and drop it here
                          </p>
                          {excelFile && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md text-left w-full">
                              <p className="text-sm font-medium text-blue-700">
                                {excelFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(excelFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Button
                      onClick={downloadTemplate}
                      variant="outline"
                      className="text-sm"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Template
                    </Button>

                    <Button
                      onClick={handleExcelSubmit}
                      disabled={!excelFile || isExcelMutating}
                    >
                      {isExcelMutating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        "Import Excel"
                      )}
                    </Button>
                  </div>

                  {excelMutation.isSuccess && (
                    <Alert className="mt-4 bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertTitle>Import successful</AlertTitle>
                      <AlertDescription>
                        <p>{excelMutation.data?.message}</p>
                        <ul className="list-disc list-inside mt-1 text-sm">
                          <li>
                            Inserted records:{" "}
                            {excelMutation.data?.inserted || 0}
                          </li>
                          <li>
                            Updated records: {excelMutation.data?.updated || 0}
                          </li>
                          <li>
                            Total processed:{" "}
                            {(excelMutation.data?.inserted || 0) +
                              (excelMutation.data?.updated || 0)}
                          </li>
                        </ul>

                        {excelMutation.data?.errors &&
                          excelMutation.data.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">
                                Some records had errors:
                              </p>
                              <div className="max-h-40 overflow-y-auto mt-1 p-2 bg-red-50 rounded text-sm">
                                {excelMutation.data.errors.map((error, idx) => (
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

                  {excelMutation.isError && (
                    <Alert variant="destructive" className="mt-4">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Import failed</AlertTitle>
                      <AlertDescription>
                        {excelMutation.error instanceof Error
                          ? excelMutation.error.message
                          : "Failed to import file"}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv">
            <Card>
              <CardHeader>
                <CardTitle>Import Water Scheme Data</CardTitle>
                <CardDescription>
                  Upload CSV files to update water scheme data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1 text-blue-500" />
                      CSV File Requirements
                    </h3>
                    <div className="text-sm text-gray-600 mb-4 pl-5">
                      <p>
                        CSV file should NOT have a header row and follow this
                        exact column order:
                      </p>
                      <ol className="list-decimal ml-5 mt-1 space-y-1">
                        <li>Region name</li>
                        <li>Circle</li>
                        <li>Division</li>
                        <li>Sub-Division</li>
                        <li>Block</li>
                        <li>Scheme ID</li>
                        <li>Scheme Name</li>
                        <li>Village Name</li>
                        <li>Population</li>
                        <li>Number of ESR</li>
                        <li>Water Value Day 1-7</li>
                        <li>LPCD Value Day 1-7</li>
                        <li>Water Date Day 1-7</li>
                        <li>LPCD Date Day 1-7</li>
                      </ol>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                      <Input
                        id="csvFile"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvFileChange}
                        className="hidden"
                      />
                      <label htmlFor="csvFile" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                          <p className="text-sm font-medium">
                            Click to select a CSV file
                          </p>
                          <p className="text-xs text-gray-500">
                            or drag and drop it here
                          </p>
                          {csvFile && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md text-left w-full">
                              <p className="text-sm font-medium text-blue-700">
                                {csvFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(csvFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Button
                      onClick={downloadTemplate}
                      variant="outline"
                      className="text-sm"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download Template
                    </Button>

                    <Button
                      onClick={handleCsvSubmit}
                      disabled={!csvFile || isCsvMutating}
                    >
                      {isCsvMutating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        "Import CSV"
                      )}
                    </Button>
                  </div>

                  {csvMutation.isSuccess && (
                    <Alert className="mt-4 bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertTitle>Import successful</AlertTitle>
                      <AlertDescription>
                        <p>{csvMutation.data?.message}</p>
                        <ul className="list-disc list-inside mt-1 text-sm">
                          <li>
                            Inserted records: {csvMutation.data?.inserted || 0}
                          </li>
                          <li>
                            Updated records: {csvMutation.data?.updated || 0}
                          </li>
                          <li>
                            Total processed:{" "}
                            {(csvMutation.data?.inserted || 0) +
                              (csvMutation.data?.updated || 0)}
                          </li>
                        </ul>

                        {csvMutation.data?.errors &&
                          csvMutation.data.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">
                                Some records had errors:
                              </p>
                              <div className="max-h-40 overflow-y-auto mt-1 p-2 bg-red-50 rounded text-sm">
                                {csvMutation.data.errors.map((error, idx) => (
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

                  {csvMutation.isError && (
                    <Alert variant="destructive" className="mt-4">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Import failed</AlertTitle>
                      <AlertDescription>
                        {csvMutation.error instanceof Error
                          ? csvMutation.error.message
                          : "Failed to import file"}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="amravati">
            <Card>
              <CardHeader>
                <CardTitle>Import Amravati Format Data</CardTitle>
                <CardDescription>
                  Upload data in the Amravati-specific format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1 text-blue-500" />
                      Amravati Format Requirements
                    </h3>
                    <div className="text-sm text-gray-600 mb-4 pl-5">
                      <p>
                        Upload Excel files with the Amravati-specific format.
                      </p>
                      <p>
                        This format is specifically designed for the Amravati
                        region's data structure.
                      </p>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                      <Input
                        id="amravatiFile"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleAmravatiFileChange}
                        className="hidden"
                      />
                      <label htmlFor="amravatiFile" className="cursor-pointer">
                        <div className="flex flex-col items-center">
                          <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                          <p className="text-sm font-medium">
                            Click to select an Amravati format file
                          </p>
                          <p className="text-xs text-gray-500">
                            or drag and drop it here
                          </p>
                          {amravatiFile && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md text-left w-full">
                              <p className="text-sm font-medium text-blue-700">
                                {amravatiFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(amravatiFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end items-center">
                    <Button
                      onClick={handleAmravatiSubmit}
                      disabled={!amravatiFile || isAmravatiMutating}
                    >
                      {isAmravatiMutating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        "Import Amravati Format"
                      )}
                    </Button>
                  </div>

                  {amravatiMutation.isSuccess && (
                    <Alert className="mt-4 bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertTitle>Import successful</AlertTitle>
                      <AlertDescription>
                        <p>{amravatiMutation.data?.message}</p>
                        <ul className="list-disc list-inside mt-1 text-sm">
                          <li>
                            Inserted records:{" "}
                            {amravatiMutation.data?.inserted || 0}
                          </li>
                          <li>
                            Updated records:{" "}
                            {amravatiMutation.data?.updated || 0}
                          </li>
                          <li>
                            Total processed:{" "}
                            {(amravatiMutation.data?.inserted || 0) +
                              (amravatiMutation.data?.updated || 0)}
                          </li>
                        </ul>

                        {amravatiMutation.data?.errors &&
                          amravatiMutation.data.errors.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">
                                Some records had errors:
                              </p>
                              <div className="max-h-40 overflow-y-auto mt-1 p-2 bg-red-50 rounded text-sm">
                                {amravatiMutation.data.errors.map(
                                  (error, idx) => (
                                    <p key={idx} className="text-red-700">
                                      {error}
                                    </p>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {amravatiMutation.isError && (
                    <Alert variant="destructive" className="mt-4">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Import failed</AlertTitle>
                      <AlertDescription>
                        {amravatiMutation.error instanceof Error
                          ? amravatiMutation.error.message
                          : "Failed to import file"}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ImportLayout>
  );
};

export default LpcdImport;
