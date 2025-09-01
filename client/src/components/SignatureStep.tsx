import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";

const signatureSchema = z.object({
  signatureType: z.enum(["typed", "drawn"]),
  signatureData: z.string().min(1, "Signature is required"),
  acceptedTerms: z.boolean().refine(val => val === true, "You must accept the terms"),
});

type SignatureFormData = z.infer<typeof signatureSchema>;

interface SignatureStepProps {
  createdJobId: string | null;
  onComplete: () => void;
}

export default function SignatureStep({ createdJobId, onComplete }: SignatureStepProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);

  const { data: job } = useQuery({
    queryKey: ["/api/jobs", createdJobId],
    enabled: !!createdJobId,
  });

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
      if (!job) throw new Error("No job found");
      
      const signatureData = {
        jobId: (job as any).id,
        customerId: (job as any).customerId,
        policyId: (job as any).policyId,
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
      onComplete();
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
        description: "Failed to create signature. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignatureFormData) => {
    if (data.signatureType === "drawn" && (!signatureDrawn || !data.signatureData)) {
      toast({
        title: "Signature Required",
        description: "Please draw your signature in the canvas above.",
        variant: "destructive",
      });
      return;
    }
    
    createSignatureMutation.mutate(data);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas and set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Reset drawing styles
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        setSignatureDrawn(false);
        form.setValue('signatureData', '');
        console.log('Signature cleared and canvas reset');
      }
    }
  };

  const getSignatureData = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      return canvas.toDataURL();
    }
    return '';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 400;
    canvas.height = 150;

    // Initialize with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing styles
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const getCoords = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing = true;
      const coords = getCoords(e);
      lastX = coords.x;
      lastY = coords.y;
      console.log('Started drawing at:', coords);
      
      // Draw a dot to show drawing started
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, 1, 0, 2 * Math.PI);
      ctx.fill();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      
      const coords = getCoords(e);
      console.log('Drawing line from', {x: lastX, y: lastY}, 'to', coords);
      
      // Ensure stroke style is set
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      
      lastX = coords.x;
      lastY = coords.y;
      
      setSignatureDrawn(true);
      form.setValue('signatureData', canvas.toDataURL());
    };

    const stopDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing = false;
    };

    // Add event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [form, setSignatureDrawn]);

  if (!job) {
    return <div>Loading job details...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Job Summary</h4>
        <div className="text-sm text-blue-800">
          <p><strong>Job #:</strong> {(job as any).jobNumber}</p>
          <p><strong>Customer:</strong> {(job as any).customer?.name}</p>
          <p><strong>Machine:</strong> {(job as any).machine?.brand} {(job as any).machine?.model}</p>
          <p><strong>Policy:</strong> {(job as any).policy?.title}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 mb-2">⚠️ Important</h4>
        <p className="text-sm text-amber-800">
          The customer must review and digitally sign the policy agreement before work can begin.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="signatureType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signature Method</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="typed" id="typed" />
                      <Label htmlFor="typed">Type Full Name</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="drawn" id="drawn" />
                      <Label htmlFor="drawn">Draw Signature</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="signatureData"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch("signatureType") === "typed" ? "Full Legal Name" : "Signature"}
                </FormLabel>
                <FormControl>
                  {form.watch("signatureType") === "typed" ? (
                    <Input
                      {...field}
                      placeholder="Enter your full legal name as your digital signature"
                      data-testid="input-typed-signature"
                    />
                  ) : (
                    <div className="border border-gray-300 rounded-md p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-500">Draw your signature below:</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearSignature}
                          data-testid="button-clear-signature"
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="border-2 border-gray-300 rounded bg-white">
                        <canvas
                          ref={canvasRef}
                          className="cursor-crosshair touch-none block"
                          data-testid="canvas-drawn-signature"
                          width="400"
                          height="150"
                          style={{ width: '100%', height: '150px', display: 'block', maxWidth: '400px' }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Use your mouse or finger to draw your signature above
                      </p>
                    </div>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="acceptedTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-accept-terms"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I agree to the terms and conditions
                  </FormLabel>
                  <p className="text-sm text-gray-600">
                    By checking this box and providing my digital signature, I acknowledge that I have read, 
                    understood, and agree to the policy terms outlined in this job card.
                  </p>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button 
              type="submit" 
              disabled={createSignatureMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-complete-signature"
            >
              {createSignatureMutation.isPending ? "Processing..." : "Complete Signature"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}