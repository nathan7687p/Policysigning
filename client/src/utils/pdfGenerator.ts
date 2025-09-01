import jsPDF from 'jspdf';
import type { JobWithRelations } from '@shared/schema';

export async function generateJobPDF(job: JobWithRelations): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Job Card", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 20;

  // Job Information
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Job Information", 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Job Number: ${job.jobNumber}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Date: ${job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Status: ${job.status.toUpperCase()}`, 20, yPosition);
  yPosition += 15;

  // Machine Details on Top
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Machine Details", 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Brand: ${job.machine.brand}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Model: ${job.machine.model}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Serial Number: ${job.machine.serialNumber}`, 20, yPosition);
  yPosition += 6;
  // Year not in schema - remove this line
  yPosition += 6;
  if (job.machine.description) {
    pdf.text(`Description: ${job.machine.description}`, 20, yPosition);
    yPosition += 6;
  }
  yPosition += 10;

  // Customer Information
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Customer Information", 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Name: ${job.customer.name}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Email: ${job.customer.email}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Phone: ${job.customer.phone}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Address: ${job.customer.address}`, 20, yPosition);
  yPosition += 15;

  // Policy Information
  if (job.policy) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Policy Agreement", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Policy: ${job.policy.title}`, 20, yPosition);
    yPosition += 10;

    // Policy content with word wrapping
    const policyLines = pdf.splitTextToSize(job.policy.content, pageWidth - 40);
    pdf.text(policyLines, 20, yPosition);
    yPosition += (policyLines.length * 5) + 15;

      // Customer Signature underneath the policy
    if (job.signatures && job.signatures.length > 0) {
      const signature = job.signatures[0]; // Use the first signature
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Customer Signature:", 20, yPosition);
      yPosition += 15;

      try {
        // Add signature image or text
        const signatureWidth = 120;
        const signatureHeight = 50;
        
        if (signature.signatureType === 'drawn') {
          // For drawn signatures, the signatureData should be a base64 data URL
          if (signature.signatureData.startsWith('data:image/')) {
            pdf.addImage(signature.signatureData, 'PNG', 20, yPosition, signatureWidth, signatureHeight);
          } else {
            // If it's base64 without data URL prefix, add it
            const imageData = signature.signatureData.startsWith('data:') 
              ? signature.signatureData 
              : `data:image/png;base64,${signature.signatureData}`;
            pdf.addImage(imageData, 'PNG', 20, yPosition, signatureWidth, signatureHeight);
          }
          yPosition += signatureHeight + 10;
        } else {
          // For typed signatures, show the text in a signature-like font
          pdf.setFontSize(16);
          pdf.setFont("helvetica", "italic");
          pdf.text(signature.signatureData, 20, yPosition);
          yPosition += 20;
        }

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Signed on: ${signature.signedAt ? new Date(signature.signedAt).toLocaleString() : 'N/A'}`, 20, yPosition);
        yPosition += 10;
      } catch (error) {
        console.error('Error adding signature to PDF:', error);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text("Signature: [Error loading signature]", 20, yPosition);
        yPosition += 10;
      }
    }
  }

  // Machine Photos on Next Page
  if (job.machine.photoUrls && job.machine.photoUrls.length > 0) {
    pdf.addPage();
    yPosition = 20;

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Machine Photos", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 20;

    for (let i = 0; i < job.machine.photoUrls.length; i++) {
      const photoUrl = job.machine.photoUrls[i];
      
      try {
        // Calculate photo dimensions to fit on page
        const maxWidth = pageWidth - 40;
        const maxHeight = 120;
        
        // Add photo
        pdf.addImage(photoUrl, 'JPEG', 20, yPosition, maxWidth, maxHeight);
        yPosition += maxHeight + 15;

        // Add caption
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Photo ${i + 1}`, 20, yPosition);
        yPosition += 15;

        // Check if we need a new page
        if (yPosition > pageHeight - 60 && i < job.machine.photoUrls.length - 1) {
          pdf.addPage();
          yPosition = 20;
        }
      } catch (error) {
        console.error('Error adding photo to PDF:', error);
        pdf.setFontSize(10);
        pdf.text(`Photo ${i + 1}: [Error loading image]`, 20, yPosition);
        yPosition += 10;
      }
    }
  }

  // Save the PDF
  const fileName = `Job_${job.jobNumber}_${job.customer.name.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
}