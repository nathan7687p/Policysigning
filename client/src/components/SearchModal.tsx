import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { generateJobPDF } from "@/utils/pdfGenerator";
import type { JobWithRelations } from "@shared/schema";

interface SearchFilters {
  jobNumber: string;
  customerName: string;
  machine: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const { toast } = useToast();
  const [searchResults, setSearchResults] = useState<JobWithRelations[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const form = useForm<SearchFilters>({
    defaultValues: {
      jobNumber: "",
      customerName: "",
      machine: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (filters: SearchFilters) => {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => {
          // Exclude empty values and "all" status
          return value && value.trim() !== "" && !(key === "status" && value === "all");
        })
      );
      
      const response = await apiRequest("POST", "/api/jobs/search", cleanFilters);
      return response.json();
    },
    onSuccess: (data: JobWithRelations[]) => {
      setSearchResults(data);
      setHasSearched(true);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to search jobs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SearchFilters) => {
    searchMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const clearSearch = () => {
    form.reset();
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleSaveToPDF = async (job: JobWithRelations) => {
    try {
      await generateJobPDF(job);
      toast({
        title: "Success",
        description: "PDF has been saved to your device",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Jobs & Customers</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Filters */}
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="jobNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Number</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., J-2025-001"
                            data-testid="input-search-job-number"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., John Smith"
                            data-testid="input-search-customer-name"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="machine"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Machine Type</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., Lawnmower"
                            data-testid="input-search-machine"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="dateFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date From</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            data-testid="input-search-date-from"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date To</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="date"
                            data-testid="input-search-date-to"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-search-status">
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending Signature</SelectItem>
                            <SelectItem value="signed">Signed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={clearSearch}
                    data-testid="button-clear-search"
                  >
                    Clear
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={searchMutation.isPending}
                    data-testid="button-search"
                  >
                    {searchMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Search Results */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Search Results</h4>
            
            {searchMutation.isPending ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Searching...</p>
              </div>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search criteria.</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary-600" data-testid={`search-result-job-${job.id}`}>
                          {job.jobNumber}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" data-testid={`search-result-customer-${job.id}`}>
                          {job.customer.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" data-testid={`search-result-machine-${job.id}`}>
                          {job.machine.brand} {job.machine.model}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={`${getStatusColor(job.status)} capitalize`} data-testid={`search-result-status-${job.id}`}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" data-testid={`search-result-date-${job.id}`}>
                          {formatDate(job.createdAt ? job.createdAt.toString() : "")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <Button variant="link" size="sm" className="text-primary-600 hover:text-primary-900 p-0 h-auto mr-3" data-testid={`search-view-${job.id}`}>
                            View
                          </Button>
                          <Button variant="link" size="sm" className="text-gray-600 hover:text-gray-900 p-0 h-auto mr-3" data-testid={`search-print-${job.id}`}>
                            Print
                          </Button>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-green-600 hover:text-green-900 p-0 h-auto" 
                            data-testid={`search-save-${job.id}`}
                            onClick={() => handleSaveToPDF(job)}
                          >
                            Save to Device
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Enter search criteria and click Search to find jobs.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
