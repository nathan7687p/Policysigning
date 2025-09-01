import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import SignatureStep from "@/components/SignatureStep";
// import { ObjectUploader } from "@/components/ObjectUploader";
// import type { UploadResult } from "@uppy/core";

const newJobSchema = z.object({
  customer: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
  }),
  machine: z.object({
    brand: z.string().min(1, "Brand is required"),
    model: z.string().min(1, "Model is required"),
    serialNumber: z.string().optional(),
    condition: z.string().optional(),
    description: z.string().optional(),
    photoUrls: z.array(z.string()).optional(),
  }),
  policyId: z.string().min(1, "Policy selection is required"),
});

type NewJobFormData = z.infer<typeof newJobSchema>;

interface NewJobModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NewJobModal({ open, onClose }: NewJobModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const form = useForm<NewJobFormData>({
    resolver: zodResolver(newJobSchema),
    defaultValues: {
      customer: {
        name: "",
        phone: "",
        email: "",
        address: "",
      },
      machine: {
        brand: "",
        model: "",
        serialNumber: "",
        condition: "",
        description: "",
        photoUrls: [],
      },
      policyId: "",
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["/api/policies"],
    retry: false,
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: NewJobFormData) => {
      const jobData = {
        ...data,
        machine: {
          ...data.machine,
          photoUrls: uploadedPhotos,
        },
      };
      return apiRequest("POST", "/api/jobs", jobData);
    },
    onSuccess: async (response) => {
      const job = await response.json();
      setCreatedJobId(job.id);
      setCurrentStep(3); // Move to signature step
      toast({
        title: "Job Created",
        description: "Now let's get the customer's signature!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
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
        description: "Failed to create job card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    if (fileArray.length > 5) {
      toast({
        title: "Too many files",
        description: "Please select up to 5 photos only.",
        variant: "destructive",
      });
      return;
    }

    // Convert files to base64 for preview (in a real app, you'd upload to server)
    const newPhotos: string[] = [];
    fileArray.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPhotos.push(e.target.result as string);
          if (newPhotos.length === fileArray.length) {
            setUploadedPhotos(prev => [...prev, ...newPhotos]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
  //   try {
  //     for (const file of result.successful) {
  //       if (file.uploadURL) {
  //         const response = await apiRequest("PUT", "/api/machine-photos", {
  //           photoURL: file.uploadURL,
  //         });
  //         const data = await response.json();
  //         setUploadedPhotos(prev => [...prev, data.objectPath]);
  //       }
  //     }
  //     toast({
  //       title: "Success",
  //       description: "Photos uploaded successfully!",
  //     });
  //   } catch (error) {
  //     console.error("Error processing uploaded photos:", error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to process uploaded photos.",
  //       variant: "destructive",
  //     });
  //   }
  // };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: NewJobFormData) => {
    if (currentStep === 2) {
      // Submit job creation
      const jobData = {
        ...data,
        machine: {
          ...data.machine,
          photoUrls: uploadedPhotos,
        },
      };
      createJobMutation.mutate(jobData);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCloseModal = () => {
    setCurrentStep(1);
    setCreatedJobId(null);
    setUploadedPhotos([]);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 3 ? "Customer Signature Required" : "Create New Job Card"}
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {step}
                    </div>
                    {step < 3 && <div className={`w-12 h-1 ${step < currentStep ? 'bg-primary-600' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-2 text-sm text-gray-600">
              {currentStep === 1 && "Customer & Machine Info"}
              {currentStep === 2 && "Policy Selection"}
              {currentStep === 3 && "Digital Signature"}
            </div>
          </DialogTitle>
        </DialogHeader>

        {currentStep === 3 ? (
          <SignatureStep 
            createdJobId={createdJobId}
            onComplete={handleCloseModal}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Information */}
              {currentStep === 1 && (
              <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" data-testid="input-customer-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-customer-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-customer-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </div>
              )}

              {/* Machine Information */}
              {currentStep === 1 && (
              <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Machine Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="machine.brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-machine-brand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="machine.model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-machine-model" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="machine.serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-machine-serial" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="machine.condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-machine-condition">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="machine.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problem Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3} 
                          placeholder="Describe the issue or service required..."
                          data-testid="textarea-machine-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </div>
              )}

              {/* Policy Selection */}
              {currentStep === 2 && (
              <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Policy Assignment</h4>
              <FormField
                control={form.control}
                name="policyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Policy *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-policy">
                          <SelectValue placeholder="Choose a policy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(policies as any)?.map((policy: any) => (
                          <SelectItem key={policy.id} value={policy.id}>
                            {policy.policyId} - {policy.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
                </div>
              )}

              {/* Photo Upload */}
              {currentStep === 1 && (
              <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Machine Photos</h4>
              <div className="space-y-4">
                <div className="space-y-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    data-testid="input-photo-upload"
                  />
                  <p className="text-sm text-gray-500">Upload up to 5 photos (10MB max each)</p>
                </div>

                {/* Photo Preview */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedPhotos.map((photoPath, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={photoPath} 
                          alt={`Machine photo ${index + 1}`} 
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                          data-testid={`image-preview-${index}`}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => removePhoto(index)}
                          data-testid={`button-remove-photo-${index}`}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-between space-x-3 pt-6 border-t border-gray-200">
                <div>
                  {currentStep > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={prevStep}
                      data-testid="button-previous"
                    >
                      Previous
                    </Button>
                  )}
                </div>
                <div className="space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseModal}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  {currentStep < 2 ? (
                    <Button 
                      type="button" 
                      onClick={nextStep}
                      data-testid="button-next"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={createJobMutation.isPending}
                      data-testid="button-create-job"
                    >
                      {createJobMutation.isPending ? "Creating..." : "Create Job Card"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
