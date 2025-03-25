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
    select: (data: Region[]) => data
  });

  // Fetch schemes data with region filter
  const { data: schemes, isLoading: isLoadingSchemes } = useQuery({
    queryKey: ['/api/schemes', selectedRegion],
    queryFn: () => 
      apiRequest(`/api/schemes${selectedRegion !== 'all' ? `?region=${selectedRegion}` : ''}`),
    select: (data: SchemeStatus[]) => data
  });

  // Create scheme mutation
  const createSchemeMutation = useMutation({
    mutationFn: (data: Omit<SchemeFormValues, 'scheme_id'>) =>
      apiRequest('/api/schemes', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      }),
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
    mutationFn: (data: SchemeFormValues) =>
      apiRequest(`/api/schemes/${data.scheme_id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      }),
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
    mutationFn: (schemeId: number) =>
      apiRequest(`/api/schemes/${schemeId}`, {
        method: 'DELETE'
      }),
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
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Scheme Management</CardTitle>
              <Button onClick={handleNewScheme}>Add New Scheme</Button>
            </div>
            <CardDescription>
              View, add, edit, and delete water schemes. Changes update the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label htmlFor="region-filter">Filter by Region:</Label>
              <Select
                value={selectedRegion}
                onValueChange={setSelectedRegion}
              >
                <SelectTrigger id="region-filter" className="w-[250px]">
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

            {isLoadingSchemes ? (
              <div className="text-center py-4">Loading schemes...</div>
            ) : schemes && schemes.length > 0 ? (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scheme Name</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Agency</TableHead>
                      <TableHead>Villages</TableHead>
                      <TableHead>ESRs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schemes.map((scheme) => (
                      <TableRow key={scheme.scheme_id}>
                        <TableCell className="font-medium">{scheme.scheme_name}</TableCell>
                        <TableCell>{scheme.region_name}</TableCell>
                        <TableCell>{scheme.agency || '-'}</TableCell>
                        <TableCell>{formatNumber(scheme.total_villages_in_scheme)}</TableCell>
                        <TableCell>{formatNumber(scheme.total_esr_in_scheme)}</TableCell>
                        <TableCell>
                          <span className={
                            scheme.scheme_completion_status === 'Fully-Completed' ? 'text-green-600 font-medium' :
                            scheme.scheme_completion_status === 'Partial' ? 'text-amber-600 font-medium' :
                            'text-red-600 font-medium'
                          }>
                            {scheme.scheme_completion_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditScheme(scheme)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                setSchemeToDelete(scheme);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
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
              <div className="text-center py-6 text-muted-foreground">
                No schemes found. {selectedRegion !== 'all' ? 'Try selecting a different region.' : 'Add your first scheme.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scheme Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editScheme ? 'Edit Scheme' : 'Add New Scheme'}</DialogTitle>
            <DialogDescription>
              {editScheme 
                ? 'Update the details of this water scheme.' 
                : 'Add a new water scheme to the system.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheme_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheme Name*</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="region_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region*</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="agency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agency</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="scheme_completion_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completion Status*</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Not-Connected">Not Connected</SelectItem>
                          <SelectItem value="Partial">Partial</SelectItem>
                          <SelectItem value="Fully-Completed">Fully Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="total_villages_in_scheme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Villages*</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="villages_integrated_on_iot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Villages on IoT</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fully_completed_villages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completed Villages</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="total_esr_in_scheme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total ESRs*</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="esr_request_received"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ESR Requests</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="esr_integrated_on_iot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ESRs on IoT</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fully_completed_esr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Completed ESRs</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="balance_for_fully_completion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Balance for Completion</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fm_integrated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FM Integrated</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rca_integrated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RCA Integrated</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pt_integrated"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PT Integrated</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSchemeMutation.isPending || updateSchemeMutation.isPending}
                >
                  {createSchemeMutation.isPending || updateSchemeMutation.isPending 
                    ? 'Saving...' 
                    : editScheme ? 'Update Scheme' : 'Create Scheme'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the scheme "{schemeToDelete?.scheme_name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteSchemeMutation.isPending}
            >
              {deleteSchemeMutation.isPending ? 'Deleting...' : 'Delete Scheme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}