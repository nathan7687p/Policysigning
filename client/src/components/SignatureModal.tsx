import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { JobWithRelations } from "@shared/schema";

const signatureSchema = z.object({
  signatureType: z.enum(["typed", "drawn"]),
  signatureData: z.string().min(1, "Signature is required"),
  acceptedTerms: z.boolean().refine(val => val === true, "You must accept the terms"),
});

type SignatureFormData = z.infer<typeof signatureSchema>;

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  job: JobWithRelations | null;
}

export default function SignatureModal({ open, onClose, job }: SignatureModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SignatureFormData>({
    resolver: zodResolver(signatureSchema),
    defaultValues: {
      signatureType: "typed",
      signatureData: "",
      acceptedTerms: false,
    },
  });

  const createSignatureMutation = useMutation({
    mutationFn: async (data: SignatureFormData) => {
      if (!job) throw new Error("No job selected");
      
      const signatureData = {
        jobId: job.id,
        customerId: job.customerId,
        policyId: job.policyId,
        signatureType: data.signatureType,
        signatureData: data.signatureData,
      };
      
      return apiRequest("POST", "/api/signatures", signatureData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Digital signature completed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
      onClose();
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
        description: "Failed to complete signature. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignatureFormData) => {
    createSignatureMutation.mutate(data);
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Digital Signature Required</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Policy Display */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3" data-testid="text-policy-title">
              {job.policy.title}
            </h4>
            <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-4 text-sm text-gray-700" data-testid="text-policy-content">
              <div className="whitespace-pre-wrap">{job.policy.content}</div>
            </div>
          </div>

          {/* Job Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Job Summary</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Job #:</span> <span data-testid="text-job-number">{job.jobNumber}</span></p>
              <p><span className="font-medium">Customer:</span> <span data-testid="text-customer-name">{job.customer.name}</span></p>
              <p><span className="font-medium">Machine:</span> <span data-testid="text-machine-info">{job.machine.brand} {job.machine.model}</span></p>
              <p><span className="font-medium">Date:</span> <span data-testid="text-job-date">{new Date(job.createdAt).toLocaleDateString()}</span></p>
            </div>
          </div>

          {/* Signature Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="signatureType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signature Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="typed" id="typed" data-testid="radio-signature-typed" />
                          <Label htmlFor="typed" className="text-sm font-medium text-gray-700">
                            Type Signature
                          </Label>
                        </div>
                        
                        {field.value === "typed" && (
                          <FormField
                            control={form.control}
                            name="signatureData"
                            render={({ field: signatureField }) => (
                              <FormItem className="ml-6">
                                <FormLabel>Type your full legal name:</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...signatureField} 
                                    placeholder="Enter full legal name"
                                    data-testid="input-signature-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="drawn" id="drawn" data-testid="radio-signature-drawn" />
                          <Label htmlFor="drawn" className="text-sm font-medium text-gray-700">
                            Draw Signature
                          </Label>
                        </div>
                        
                        {field.value === "drawn" && (
                          <div className="ml-6">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center bg-gray-50">
                              <p className="text-gray-500 text-sm">Touch/click and drag to sign</p>
                            </div>
                            <div className="mt-2 flex justify-end">
                              <Button type="button" variant="link" size="sm" className="text-sm text-gray-600 hover:text-gray-800">
                                Clear
                              </Button>
                            </div>
                            <Input
                              type="hidden"
                              {...form.register("signatureData")}
                            />
                          </div>
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Agreement Checkbox */}
              <div className="p-4 bg-yellow-50 rounded-lg">
                <FormField
                  control={form.control}
                  name="acceptedTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-accept-terms"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm text-gray-700">
                          I have read and understood the above policy terms and conditions. I agree to the terms and authorize the work described in the job card. I understand this constitutes a legal agreement.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  data-testid="button-cancel-signature"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSignatureMutation.isPending}
                  data-testid="button-complete-signature"
                >
                  {createSignatureMutation.isPending ? "Processing..." : "Complete Signature"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
