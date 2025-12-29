import { useState, useRef } from 'react';
import { X, Upload, FileText, ExternalLink, CheckCircle, Download } from 'lucide-react';
import type { Shoot } from '../App';

interface InvoiceManagementProps {
  shoot: Shoot;
  onUploadInvoice: (shootId: string, fileName: string, fileData?: string) => void;
  onMarkPaid: (shootId: string) => void;
  onClose: () => void;
}

export function InvoiceManagement({ shoot, onUploadInvoice, onMarkPaid, onClose }: InvoiceManagementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.type === 'application/pdf') {
      setIsUploading(true);
      
      // Read file as base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        onUploadInvoice(shoot.id, file.name, base64Data);
        setShowPreview(true);
        setIsUploading(false);
      };
      reader.onerror = () => {
        console.error('Error reading file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please upload a PDF file');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleVerifyAndPay = () => {
    onMarkPaid(shoot.id);
    onClose();
  };

  const handleDownload = () => {
    if (shoot.invoiceFile?.data) {
      // Create download link from base64 data
      const link = document.createElement('a');
      link.href = shoot.invoiceFile.data;
      link.download = shoot.invoiceFile.name || 'invoice.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (shoot.invoiceFile?.url) {
      // Try opening the URL
      window.open(shoot.invoiceFile.url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl">Invoice Management</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Left Side - Form Data */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg mb-4">Shoot Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Shoot Name</div>
                    <div>{shoot.name}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Date</div>
                    <div>{shoot.date}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Location</div>
                    <div>{shoot.location}</div>
                  </div>
                  
                  <div 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: '#F0FDF4' }}
                  >
                    <div className="text-sm mb-1" style={{ color: '#27AE60' }}>
                      Approved Amount
                    </div>
                    <div className="text-2xl" style={{ color: '#27AE60' }}>
                      ₹{(typeof shoot.approvedAmount === 'string' ? parseFloat(shoot.approvedAmount) : shoot.approvedAmount)?.toLocaleString()}
                    </div>
                  </div>
                  
                  <div 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: shoot.paid ? '#F0FDF4' : '#FEF3C7' }}
                  >
                    <div className="text-sm mb-1" style={{ color: shoot.paid ? '#27AE60' : '#F2994A' }}>
                      Payment Status
                    </div>
                    <div style={{ color: shoot.paid ? '#27AE60' : '#F2994A' }}>
                      {shoot.paid ? 'Paid' : 'Unpaid'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div>
                <h3 className="text-lg mb-3">Invoice Document</h3>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4"
                  style={{
                    borderColor: isDragging ? '#2D60FF' : '#E2E8F0',
                    backgroundColor: isDragging ? '#EEF2FF' : '#F8FAFC'
                  }}
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-600">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Upload 
                        className="w-10 h-10 mx-auto mb-2" 
                        style={{ color: isDragging ? '#2D60FF' : '#94A3B8' }}
                      />
                      <p className="text-sm mb-1">
                        <span style={{ color: '#2D60FF' }}>Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF files only (max 10MB)</p>
                    </>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {shoot.invoiceFile && (
                  <div 
                    className="border-2 rounded-xl p-4 flex items-center justify-between"
                    style={{ borderColor: '#27AE60', backgroundColor: '#F0FDF4' }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#27AE60' }}
                      >
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{shoot.invoiceFile.name}</div>
                        <div className="text-sm" style={{ color: '#27AE60' }}>
                          {shoot.invoiceFile.data ? 'Ready to download' : 'File reference saved'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {shoot.invoiceFile.data && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload();
                          }}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                          style={{ color: '#27AE60' }}
                          title="Download PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPreview(true);
                        }}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                        style={{ color: '#27AE60' }}
                        title="Preview"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Preview */}
            <div>
              <h3 className="text-lg mb-3">Document Preview</h3>
              
              <div 
                className="border-2 border-gray-200 rounded-xl overflow-hidden"
                style={{ height: '500px' }}
              >
                {shoot.invoiceFile?.data ? (
                  <iframe
                    src={shoot.invoiceFile.data}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                ) : shoot.invoiceFile && showPreview ? (
                  <div className="h-full flex flex-col items-center justify-center bg-gray-50">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">{shoot.invoiceFile.name}</p>
                    <p className="text-sm text-gray-500 mb-4">PDF file stored</p>
                    <p className="text-xs text-gray-400 px-8 text-center">
                      Upload a new PDF to enable preview and download
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center text-gray-400">
                      <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
                      <p>Upload a PDF to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex gap-3">
            {shoot.invoiceFile?.data && (
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 rounded-lg border-2 flex items-center justify-center gap-2 transition-all font-medium hover:bg-blue-50"
                style={{ borderColor: '#2D60FF', color: '#2D60FF' }}
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            )}
            {shoot.invoiceFile && !shoot.paid && (
              <button
                onClick={handleVerifyAndPay}
                className="flex-1 py-2.5 rounded-lg text-white flex items-center justify-center gap-2 transition-all font-medium hover:opacity-90"
                style={{ backgroundColor: '#27AE60' }}
              >
                <CheckCircle className="w-5 h-5" />
                Verify & Mark as Paid
              </button>
            )}
          </div>
        </div>
        
        {shoot.paid && (
          <div 
            className="px-6 py-4 border-t"
            style={{ 
              borderColor: '#27AE60',
              backgroundColor: '#F0FDF4'
            }}
          >
            <div className="flex items-center justify-center gap-2" style={{ color: '#27AE60' }}>
              <CheckCircle className="w-5 h-5" />
              <span>Payment Completed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
