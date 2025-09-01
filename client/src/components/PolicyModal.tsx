import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { Policy } from "@shared/schema";

const policySchema = z.object({
  policyId: z.string().min(1, "Policy ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  version: z.string().min(1, "Version is required"),
});

type PolicyFormData = z.infer<typeof policySchema>;

interface PolicyModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PolicyModal({ open, onClose }: PolicyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);

  const form = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      policyId: "",
      title: "",
      description: "",
      content: "",
      version: "1.0",
    },
  });

  const { data: policies, isLoading } = useQuery({
    queryKey: ["/api/policies"],
    retry: false,
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (data: PolicyFormData) => {
      if (editingPolicy) {
        return apiRequest("PUT", `/api/policies/${editingPolicy.id}`, data);
      } else {
        return apiRequest("POST", "/api/policies", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: editingPolicy ? "Policy updated successfully!" : "Policy created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      handleCancel();
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
        description: "Failed to save policy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNewPolicy = () => {
    setEditingPolicy(null);
    form.reset({
      policyId: "",
      title: "",
      description: "",
      content: "",
      version: "1.0",
    });
    setShowForm(true);
  };

  const handleEditPolicy = (policy: Policy) => {
    setEditingPolicy(policy);
    form.reset({
      policyId: policy.policyId,
      title: policy.title,
      description: policy.description || "",
      content: policy.content,
      version: policy.version,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPolicy(null);
    form.reset();
  };

  const onSubmit = (data: PolicyFormData) => {
    createPolicyMutation.mutate(data);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Policy Management</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Policy List */}
          {!showForm && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Existing Policies</h4>
                <Button 
                  onClick={handleNewPolicy}
                  data-testid="button-add-policy"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Policy
                </Button>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-4">Loading policies...</div>
                ) : policies && policies.length > 0 ? (
                  policies.map((policy: Policy) => (
                    <Card key={policy.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900" data-testid={`policy-title-${policy.id}`}>
                              {policy.policyId} - {policy.title}
                            </h5>
                            <p className="text-sm text-gray-600 mt-1" data-testid={`policy-description-${policy.id}`}>
                              {policy.description || "No description provided"}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <span data-testid={`policy-version-${policy.id}`}>Version {policy.version}</span>
                              <span className="mx-2">•</span>
                              <span data-testid={`policy-updated-${policy.id}`}>
                                Updated {formatDate(policy.updatedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="text-primary-600 hover:text-primary-900 p-0 h-auto"
                              onClick={() => handleEditPolicy(policy)}
                              data-testid={`button-edit-policy-${policy.id}`}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No policies found. Create your first policy to get started.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New/Edit Policy Form */}
          {showForm && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                {editingPolicy ? "Edit Policy" : "Create New Policy"}
              </h4>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Title *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-policy-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="policyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy ID *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., POLICY003"
                              data-testid="input-policy-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-policy-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-policy-version" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Policy Content *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={8} 
                            placeholder="Enter the full policy text that customers will need to accept..."
                            data-testid="textarea-policy-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancel}
                      data-testid="button-cancel-policy"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPolicyMutation.isPending}
                      data-testid="button-save-policy"
                    >
                      {createPolicyMutation.isPending ? "Saving..." : "Save Policy"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
