import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { JobWithRelations } from "@shared/schema";

interface PDFModalProps {
  open: boolean;
  onClose: () => void;
  job: JobWithRelations | null;
}

export default function PDFModal({ open, onClose, job }: PDFModalProps) {
  
  const handleDownloadPDF = () => {
    // This would typically generate and download a PDF
    // For now, we'll just show a toast message
    console.log("Downloading PDF for job:", job?.jobNumber);
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Job Card Preview</span>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* PDF Content Preview */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] bg-gray-100 p-6">
          <div className="bg-white shadow-sm rounded-lg p-8 max-w-3xl mx-auto min-h-[11in]">
            {/* Company Header */}
            <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-200">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SignPro Services</h1>
                <p className="text-gray-600 mt-1">Professional Equipment Repair & Maintenance</p>
                <div className="mt-2 text-sm text-gray-600">
                  <p>123 Service Drive, Repair City, RC 12345</p>
                  <p>Phone: (555) 123-4567 | Email: info@signpro.com</p>
                </div>
              </div>
              <div className="text-right">
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-xs">
                  LOGO
                </div>
              </div>
            </div>

            {/* Job Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700">Job Number:</span> <span data-testid="pdf-job-number">{job.jobNumber}</span></p>
                  <p><span className="font-medium text-gray-700">Date Created:</span> <span data-testid="pdf-job-date">{new Date(job.createdAt).toLocaleDateString()}</span></p>
                  <p><span className="font-medium text-gray-700">Status:</span> <span data-testid="pdf-job-status" className="capitalize">{job.status}</span></p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium text-gray-700">Name:</span> <span data-testid="pdf-customer-name">{job.customer.name}</span></p>
                  <p><span className="font-medium text-gray-700">Phone:</span> <span data-testid="pdf-customer-phone">{job.customer.phone}</span></p>
                  {job.customer.email && (
                    <p><span className="font-medium text-gray-700">Email:</span> <span data-testid="pdf-customer-email">{job.customer.email}</span></p>
                  )}
                  {job.customer.address && (
                    <p><span className="font-medium text-gray-700">Address:</span> <span data-testid="pdf-customer-address">{job.customer.address}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Machine Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Equipment Details</h3>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Brand:</span> <span data-testid="pdf-machine-brand">{job.machine.brand}</span></p>
                    <p><span className="font-medium text-gray-700">Model:</span> <span data-testid="pdf-machine-model">{job.machine.model}</span></p>
                    {job.machine.serialNumber && (
                      <p><span className="font-medium text-gray-700">Serial Number:</span> <span data-testid="pdf-machine-serial">{job.machine.serialNumber}</span></p>
                    )}
                    {job.machine.condition && (
                      <p><span className="font-medium text-gray-700">Condition:</span> <span data-testid="pdf-machine-condition" className="capitalize">{job.machine.condition}</span></p>
                    )}
                  </div>
                  {job.machine.description && (
                    <div className="mt-3">
                      <p className="font-medium text-gray-700 mb-1">Problem Description:</p>
                      <p className="text-sm text-gray-600" data-testid="pdf-machine-description">{job.machine.description}</p>
                    </div>
                  )}
                </div>
                
                {/* Machine Photo Placeholder */}
                {job.machine.photoUrls && job.machine.photoUrls.length > 0 && (
                  <div className="w-full md:w-48">
                    <img 
                      src={job.machine.photoUrls[0]} 
                      alt="Equipment photo" 
                      className="w-full h-32 md:h-48 object-cover rounded-lg border border-gray-300"
                      data-testid="pdf-machine-photo"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">Equipment Photo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Policy Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2" data-testid="pdf-policy-title">
                  {job.policy.policyId} - {job.policy.title}
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap" data-testid="pdf-policy-content">
                  {job.policy.content}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                  <p>
                    Policy Version: <span data-testid="pdf-policy-version">{job.policy.version}</span> | 
                    Last Updated: <span data-testid="pdf-policy-updated">{new Date(job.policy.updatedAt).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Digital Signatures</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Customer Signature</h4>
                  <div className="border border-gray-300 rounded-lg p-4 h-24 bg-gray-50 flex items-center justify-center">
                    {job.signatures && job.signatures.length > 0 ? (
                      <span className="text-lg italic text-gray-700" data-testid="pdf-customer-signature">
                        {job.signatures[0].signatureData}
                      </span>
                    ) : (
                      <span className="text-gray-400">Signature Pending</span>
                    )}
                  </div>
                  {job.signatures && job.signatures.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <p>Signed: <span data-testid="pdf-signature-date">{new Date(job.signatures[0].signedAt).toLocaleString()}</span></p>
                      <p>Method: <span data-testid="pdf-signature-method">Digital ({job.signatures[0].signatureType === 'typed' ? 'Typed Name' : 'Drawn'})</span></p>
                      {job.signatures[0].ipAddress && (
                        <p>IP Address: <span data-testid="pdf-signature-ip">{job.signatures[0].ipAddress}</span></p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Staff Information</h4>
                  <div className="border border-gray-300 rounded-lg p-4 h-24 bg-gray-50 flex items-center justify-center">
                    <span className="text-gray-400">Staff Assignment Pending</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p>Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
              <p>This document constitutes a legal agreement between the customer and SignPro Services.</p>
              <p>Generated on <span data-testid="pdf-generated-date">{new Date().toLocaleDateString()}</span> | Document ID: <span data-testid="pdf-document-id">DOC-{job.jobNumber}-001</span></p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
