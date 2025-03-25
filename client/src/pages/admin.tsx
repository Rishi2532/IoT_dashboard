import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { type Region, type SchemeStatus } from '@/types';
import { formatNumber } from '@/lib/utils';

// Schema for creating/updating scheme
const schemeFormSchema = z.object({
  scheme_id: z.number().optional(),
  scheme_name: z.string().min(1, 'Scheme name is required'),
  region_name: z.string().min(1, 'Region is required'),
  agency: z.string().nullable(),
  total_villages_in_scheme: z.number().min(0, 'Must be positive'),
  total_esr_in_scheme: z.number().min(0, 'Must be positive'),
  villages_integrated_on_iot: z.number().min(0, 'Must be positive').nullable(),
  fully_completed_villages: z.number().min(0, 'Must be positive').nullable(),
  esr_request_received: z.number().min(0, 'Must be positive').nullable(),
  esr_integrated_on_iot: z.number().min(0, 'Must be positive').nullable(),
  fully_completed_esr: z.number().min(0, 'Must be positive').nullable(),
  balance_for_fully_completion: z.number().min(0, 'Must be positive').nullable(),
  fm_integrated: z.number().min(0, 'Must be positive').nullable(),
  rca_integrated: z.number().min(0, 'Must be positive').nullable(),
  pt_integrated: z.number().min(0, 'Must be positive').nullable(),
  scheme_completion_status: z.string().min(1, 'Status is required')
});

type SchemeFormValues = z.infer<typeof schemeFormSchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [editScheme, setEditScheme] = useState<SchemeStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [schemeToDelete, setSchemeToDelete] = useState<SchemeStatus | null>(null);

  // Form setup
  const form = useForm<SchemeFormValues>({
    resolver: zodResolver(schemeFormSchema),
    defaultValues: {
      scheme_name: '',
      region_name: '',
      agency: '',
      total_villages_in_scheme: 0,
      total_esr_in_scheme: 0,
      villages_integrated_on_iot: 0,
      fully_completed_villages: 0,
      esr_request_received: 0,
      esr_integrated_on_iot: 0,
      fully_completed_esr: 0,
      balance_for_fully_completion: 0,
      fm_integrated: 0,
      rca_integrated: 0,
      pt_integrated: 0,
      scheme_completion_status: 'Not-Connected'
    }
  });

  // Fetch regions data
  const { data: regions, isLoading: isLoadingRegions } = useQuery({
    queryKey: ['/api/regions'],
    queryFn: async () => {
      const response = await fetch('/api/regions');
      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }
      return response.json() as Promise<Region[]>;
    }
  });

  // Fetch schemes data with region filter
  const { data: schemes, isLoading: isLoadingSchemes } = useQuery({
    queryKey: ['/api/schemes', selectedRegion],
    queryFn: async () => {
      const response = await fetch(`/api/schemes${selectedRegion !== 'all' ? `?region=${selectedRegion}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch schemes');
      }
      return response.json() as Promise<SchemeStatus[]>;
    }
  });

  // Create scheme mutation
  const createSchemeMutation = useMutation({
    mutationFn: async (data: Omit<SchemeFormValues, 'scheme_id'>) => {
      const response = await fetch('/api/schemes', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create scheme');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Scheme created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schemes'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create scheme: ${error.toString()}`,
        variant: 'destructive'
      });
    }
  });

  // Update scheme mutation
  const updateSchemeMutation = useMutation({
    mutationFn: async (data: SchemeFormValues) => {
      const response = await fetch(`/api/schemes/${data.scheme_id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update scheme');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Scheme updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schemes'] });
      setIsDialogOpen(false);
      setEditScheme(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update scheme: ${error.toString()}`,
        variant: 'destructive'
      });
    }
  });

  // Delete scheme mutation
  const deleteSchemeMutation = useMutation({
    mutationFn: async (schemeId: number) => {
      const response = await fetch(`/api/schemes/${schemeId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete scheme');
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Scheme deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schemes'] });
      setIsDeleteDialogOpen(false);
      setSchemeToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete scheme: ${error.toString()}`,
        variant: 'destructive'
      });
    }
  });

  // Open edit dialog with scheme data
  const handleEditScheme = (scheme: SchemeStatus) => {
    setEditScheme(scheme);
    form.reset({
      scheme_id: scheme.scheme_id,
      scheme_name: scheme.scheme_name,
      region_name: scheme.region_name,
      agency: scheme.agency,
      total_villages_in_scheme: scheme.total_villages_in_scheme,
      total_esr_in_scheme: scheme.total_esr_in_scheme,
      villages_integrated_on_iot: scheme.villages_integrated_on_iot,
      fully_completed_villages: scheme.fully_completed_villages,
      esr_request_received: scheme.esr_request_received,
      esr_integrated_on_iot: scheme.esr_integrated_on_iot,
      fully_completed_esr: scheme.fully_completed_esr,
      balance_for_fully_completion: scheme.balance_for_fully_completion,
      fm_integrated: scheme.fm_integrated,
      rca_integrated: scheme.rca_integrated,
      pt_integrated: scheme.pt_integrated,
      scheme_completion_status: scheme.scheme_completion_status
    });
    setIsDialogOpen(true);
  };

  // Open create dialog
  const handleNewScheme = () => {
    setEditScheme(null);
    form.reset({
      scheme_name: '',
      region_name: selectedRegion !== 'all' ? selectedRegion : '',
      agency: '',
      total_villages_in_scheme: 0,
      total_esr_in_scheme: 0,
      villages_integrated_on_iot: 0,
      fully_completed_villages: 0,
      esr_request_received: 0,
      esr_integrated_on_iot: 0,
      fully_completed_esr: 0,
      balance_for_fully_completion: 0,
      fm_integrated: 0,
      rca_integrated: 0,
      pt_integrated: 0,
      scheme_completion_status: 'Not-Connected'
    });
    setIsDialogOpen(true);
  };

  // Confirm scheme deletion
  const handleDeleteConfirm = () => {
    if (schemeToDelete) {
      deleteSchemeMutation.mutate(schemeToDelete.scheme_id);
    }
  };

  // Form submission handler
  const onSubmit = (data: SchemeFormValues) => {
    // Convert string values to numbers
    const formattedData = {
      ...data,
      total_villages_in_scheme: Number(data.total_villages_in_scheme),
      total_esr_in_scheme: Number(data.total_esr_in_scheme),
      villages_integrated_on_iot: data.villages_integrated_on_iot !== null ? Number(data.villages_integrated_on_iot) : null,
      fully_completed_villages: data.fully_completed_villages !== null ? Number(data.fully_completed_villages) : null,
      esr_request_received: data.esr_request_received !== null ? Number(data.esr_request_received) : null,
      esr_integrated_on_iot: data.esr_integrated_on_iot !== null ? Number(data.esr_integrated_on_iot) : null,
      fully_completed_esr: data.fully_completed_esr !== null ? Number(data.fully_completed_esr) : null,
      balance_for_fully_completion: data.balance_for_fully_completion !== null ? Number(data.balance_for_fully_completion) : null,
      fm_integrated: data.fm_integrated !== null ? Number(data.fm_integrated) : null,
      rca_integrated: data.rca_integrated !== null ? Number(data.rca_integrated) : null,
      pt_integrated: data.pt_integrated !== null ? Number(data.pt_integrated) : null,
    };

    if (editScheme) {
      updateSchemeMutation.mutate(formattedData as SchemeFormValues);
    } else {
      // Remove scheme_id for new schemes
      const { scheme_id, ...createData } = formattedData;
      createSchemeMutation.mutate(createData);
    }
  };

  return (
    <DashboardLayout>
      {/* Admin Header with gradient */}
      <div className="p-6 bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 rounded-lg mb-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-indigo-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-indigo-700/80 font-medium">
              Manage water schemes and update integration status
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-8">
        <Card className="border border-indigo-100 overflow-hidden shadow-md">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-indigo-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-indigo-800 text-xl">Scheme Management</CardTitle>
                <CardDescription className="text-indigo-600/80 mt-1">
                  Create, edit and delete water schemes to update integration status
                </CardDescription>
              </div>
              <Button 
                onClick={handleNewScheme} 
                className="bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-circle">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                Add New Scheme
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
              <h3 className="text-sm font-medium text-indigo-800 mb-2">Filter Schemes</h3>
              <div className="flex items-center gap-3">
                <Label htmlFor="region-filter" className="text-indigo-700 min-w-[100px]">Region:</Label>
                <Select
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                >
                  <SelectTrigger id="region-filter" className="w-[250px] border-indigo-200 bg-white">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions?.map((region) => (
                      <SelectItem key={region.region_id} value={region.region_name}>
                        {region.region_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingSchemes ? (
              <div className="flex items-center justify-center py-12 text-indigo-800">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading schemes...</span>
              </div>
            ) : schemes && schemes.length > 0 ? (
              <div className="rounded-md border border-indigo-100 overflow-auto">
                <Table>
                  <TableHeader className="bg-indigo-50/50">
                    <TableRow className="hover:bg-indigo-50/80">
                      <TableHead className="text-indigo-800 font-medium">Scheme Name</TableHead>
                      <TableHead className="text-indigo-800 font-medium">Region</TableHead>
                      <TableHead className="text-indigo-800 font-medium">Agency</TableHead>
                      <TableHead className="text-indigo-800 font-medium">Villages</TableHead>
                      <TableHead className="text-indigo-800 font-medium">ESRs</TableHead>
                      <TableHead className="text-indigo-800 font-medium">Status</TableHead>
                      <TableHead className="text-indigo-800 font-medium text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.map((scheme) => (
                      <TableRow key={scheme.scheme_id} className="hover:bg-indigo-50/30 transition-colors">
                        <TableCell className="font-medium text-indigo-900">{scheme.scheme_name}</TableCell>
                        <TableCell className="text-indigo-700">{scheme.region_name}</TableCell>
                        <TableCell className="text-indigo-700">{scheme.agency || '-'}</TableCell>
                        <TableCell className="text-indigo-700">{formatNumber(scheme.total_villages_in_scheme)}</TableCell>
                        <TableCell className="text-indigo-700">{formatNumber(scheme.total_esr_in_scheme)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            scheme.scheme_completion_status === 'Fully-Completed' ? 'bg-green-100 text-green-800' :
                            scheme.scheme_completion_status === 'Partial' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {scheme.scheme_completion_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                              onClick={() => handleEditScheme(scheme)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil mr-1">
                                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                                <path d="m15 5 4 4"></path>
                              </svg>
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 border-none"
                              onClick={() => {
                                setSchemeToDelete(scheme);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2 mr-1">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 bg-indigo-50/30 rounded-lg border border-indigo-100">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-database">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-indigo-800 mb-1">No schemes found</h3>
                <p className="text-indigo-600 max-w-md mx-auto mb-4">
                  {selectedRegion !== 'all' 
                    ? `No schemes found for ${selectedRegion}. Try selecting a different region.` 
                    : 'No schemes found in the database. Add your first scheme to get started.'}
                </p>
                <Button 
                  onClick={handleNewScheme} 
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Add First Scheme
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scheme Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 py-4 px-6 flex items-center">
            <div className="rounded-full bg-white/20 p-2 flex-shrink-0 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                {editScheme ? (
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                ) : (
                  <g>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </g>
                )}
              </svg>
            </div>
            <div>
              <DialogTitle className="text-white text-xl m-0 p-0">
                {editScheme ? 'Edit Water Scheme' : 'Add New Water Scheme'}
              </DialogTitle>
              <DialogDescription className="text-white/80 m-0 p-0 mt-1">
                {editScheme 
                  ? 'Update the details and implementation status of this water scheme.' 
                  : 'Add a new water scheme to the system with all relevant details.'}
              </DialogDescription>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-4">
              <div className="bg-indigo-50 rounded-lg p-4 mb-6 border border-indigo-100">
                <h3 className="text-sm font-medium text-indigo-800 mb-2">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scheme_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-indigo-700">Scheme Name*</FormLabel>
                        <FormControl>
                          <Input {...field} className="border-indigo-200 focus:border-indigo-400" />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="region_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-indigo-700">Region*</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="border-indigo-200 focus:border-indigo-400">
                              <SelectValue placeholder="Select Region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regions?.map((region) => (
                              <SelectItem key={region.region_id} value={region.region_name}>
                                {region.region_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="agency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-indigo-700">Agency</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} className="border-indigo-200 focus:border-indigo-400" />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="scheme_completion_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-indigo-700">Completion Status*</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="border-indigo-200 focus:border-indigo-400">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Not-Connected">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                                Not Connected
                              </div>
                            </SelectItem>
                            <SelectItem value="Partial">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                                Partial
                              </div>
                            </SelectItem>
                            <SelectItem value="Fully-Completed">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                Fully Completed
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
                
              <div className="bg-amber-50 rounded-lg p-4 mb-6 border border-amber-100">
                <h3 className="text-sm font-medium text-amber-800 mb-2">Village Integration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="total_villages_in_scheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-700">Total Villages*</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(Number(e.target.value))} 
                            className="border-amber-200 focus:border-amber-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="villages_integrated_on_iot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-700">Villages on IoT</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-amber-200 focus:border-amber-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="fully_completed_villages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-amber-700">Completed Villages</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-amber-200 focus:border-amber-400"  
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800 mb-2">ESR Integration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="total_esr_in_scheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700">Total ESRs*</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(Number(e.target.value))} 
                            className="border-blue-200 focus:border-blue-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="esr_request_received"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700">ESR Requests</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-blue-200 focus:border-blue-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="esr_integrated_on_iot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700">ESRs on IoT</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-blue-200 focus:border-blue-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                
                  <FormField
                    control={form.control}
                    name="fully_completed_esr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700">Completed ESRs</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-blue-200 focus:border-blue-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="balance_for_fully_completion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700">Balance for Completion</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-blue-200 focus:border-blue-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="bg-teal-50 rounded-lg p-4 mb-6 border border-teal-100">
                <h3 className="text-sm font-medium text-teal-800 mb-2">Component Integration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="fm_integrated"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-teal-700">FM Integrated</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-teal-200 focus:border-teal-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="rca_integrated"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-teal-700">RCA Integrated</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-teal-200 focus:border-teal-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pt_integrated"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-teal-700">PT Integrated</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} 
                            className="border-teal-200 focus:border-teal-400"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            
              <DialogFooter className="gap-2 border-t border-gray-100 pt-4 mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSchemeMutation.isPending || updateSchemeMutation.isPending}
                  className={`${editScheme ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                >
                  {createSchemeMutation.isPending || updateSchemeMutation.isPending 
                    ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) 
                    : editScheme ? 'Update Scheme' : 'Create Scheme'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-white p-0 overflow-hidden sm:max-w-md">
          <div className="bg-gradient-to-r from-red-600 to-red-700 py-4 px-6 flex items-center">
            <div className="rounded-full bg-white/20 p-2 flex-shrink-0 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <DialogTitle className="text-white text-xl m-0 p-0">Confirm Deletion</DialogTitle>
          </div>
          
          <div className="p-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6">
              <DialogDescription className="text-red-800 m-0 p-0 text-center font-medium">
                Are you sure you want to delete this scheme?
              </DialogDescription>
              <p className="text-gray-700 mt-2 mb-0 text-center">
                <span className="font-medium">{schemeToDelete?.scheme_name}</span>
              </p>
              <p className="text-red-700 mt-3 mb-0 text-center text-sm">
                This action cannot be undone.
              </p>
            </div>

            <DialogFooter className="flex justify-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                className="border-gray-300 flex-1"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm}
                disabled={deleteSchemeMutation.isPending}
                className="bg-red-600 hover:bg-red-700 flex-1"
              >
                {deleteSchemeMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Delete Scheme
                  </span>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}