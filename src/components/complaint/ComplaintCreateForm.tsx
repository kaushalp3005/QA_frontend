'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  Plus, 
  Trash2, 
  Upload, 
  Mail, 
  Phone, 
  MessageSquare, 
  FileText,
  Save,
  Send
} from 'lucide-react'
import { cn, buttonStyles, formStyles, cardStyles, layoutStyles } from '@/lib/styles'
import CustomerDropdown from '@/components/ui/CustomerDropdown'
import ItemCategoryDropdown from '@/components/ui/ItemCategoryDropdown'
import ItemSubcategoryDropdown from '@/components/ui/ItemSubcategoryDropdown'
import ItemDescriptionDropdown from '@/components/ui/ItemDescriptionDropdown'
import { useCompany } from '@/contexts/CompanyContext'
import { uploadComplaintImages, validateImageFile } from '@/lib/api/s3Upload'

// Validation schema
const complaintFormSchema = z.object({
  // Customer Information
  customerName: z.string().min(1, 'Customer name is required'),
  customerNameOther: z.string().optional(),
  customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  customerAddress: z.string().optional(),
  
  // Complaint Details
  complaintCategory: z.enum(['food_safety', 'non_food_safety']),
  complaintSubcategory: z.string().min(1, 'Complaint subcategory is required'),
  complaintReceiveDate: z.string().min(1, 'Date of complaint receive is required'),
  problemStatement: z.string().min(1, 'Problem statement is required'),
  measuresToResolve: z.enum(['rtv', 'rca_capa', 'fishbone', 'replacement', 'refund', 'other']).optional(),
  remarks: z.string().optional(),
  
  // Communication Method
  communicationMethod: z.enum(['email', 'whatsapp', 'phone', 'other']),
  proofImages: z.array(z.string()).optional(),
  
  // Articles/Products
  articles: z.array(z.object({
    category: z.string().min(1, 'Item category is required'),
    subcategory: z.string().min(1, 'Item subcategory is required'),
    subcategoryOther: z.string().optional(),
    itemDescription: z.string().min(1, 'Item description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    defectDescription: z.string().optional(),
  })).min(1, 'At least one article is required'),
}).refine((data) => {
  // If customerName is 'other', then customerNameOther should be provided
  if (data.customerName === 'other' && (!data.customerNameOther || data.customerNameOther.trim() === '')) {
    return false;
  }
  
  // Check if any article has subcategory as 'other' but no subcategoryOther value
  for (let i = 0; i < data.articles.length; i++) {
    const article = data.articles[i];
    if (article.subcategory === 'other' && (!article.subcategoryOther || article.subcategoryOther.trim() === '')) {
      return false;
    }
  }
  
  return true;
}, {
  message: "Please specify the subcategory when 'Other' is selected",
  path: ['articles'],
});

type ComplaintFormData = z.infer<typeof complaintFormSchema>

interface ComplaintCreateFormProps {
  onSubmit: (data: ComplaintFormData) => void
  isLoading?: boolean
  initialData?: Partial<ComplaintFormData>
  isEditing?: boolean
}

function ComplaintCreateForm({ onSubmit, isLoading, initialData, isEditing }: ComplaintCreateFormProps) {
  const { currentCompany } = useCompany()
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(initialData?.proofImages || [])
  const [isUploading, setIsUploading] = useState(false)
  
  console.log('ComplaintCreateForm - initialData:', initialData)
  console.log('ComplaintCreateForm - initialData.proofImages:', initialData?.proofImages)
  console.log('ComplaintCreateForm - uploadedFiles state:', uploadedFiles)
  
  // Update uploadedFiles when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData?.proofImages && initialData.proofImages.length > 0) {
      // Remove duplicates and empty strings
      const uniqueImages = [...new Set(initialData.proofImages.filter(img => img && img.trim()))]
      console.log('Updating uploadedFiles from initialData (deduplicated):', uniqueImages)
      console.log('Original images count:', initialData.proofImages.length, 'Deduplicated count:', uniqueImages.length)
      setUploadedFiles(uniqueImages)
    }
  }, [initialData?.proofImages])
  
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintFormSchema),
    defaultValues: {
      articles: initialData?.articles || [{ category: '', subcategory: '', subcategoryOther: '', itemDescription: '', quantity: 1, defectDescription: '' }],
      customerName: initialData?.customerName || '',
      customerNameOther: initialData?.customerNameOther || '',
      customerEmail: initialData?.customerEmail || '',
      customerAddress: initialData?.customerAddress || '',
      complaintCategory: initialData?.complaintCategory || 'food_safety',
      complaintSubcategory: initialData?.complaintSubcategory || '',
      complaintReceiveDate: initialData?.complaintReceiveDate || new Date().toISOString().split('T')[0],
      problemStatement: initialData?.problemStatement || '',
      measuresToResolve: initialData?.measuresToResolve || 'rtv',
      remarks: initialData?.remarks || '',
      communicationMethod: initialData?.communicationMethod || 'email',
      proofImages: initialData?.proofImages 
        ? [...new Set(initialData.proofImages.filter(img => img && img.trim()))] // Remove duplicates
        : [],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'articles'
  })

  // Watch complaint category for conditional subcategories
  const watchedCategory = watch('complaintCategory')
  
  // Watch customer name for conditional input field
  const watchedCustomerName = watch('customerName')
  
  // Watch measures to resolve for conditional sections
  const watchedMeasuresToResolve = watch('measuresToResolve')

  // Removed totalValue calculation since price field is removed

  // Handle image selection and upload (images only)
  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Validate files
    const validFiles: File[] = []
    const errors: string[] = []
    
    for (const file of files) {
      const error = validateImageFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push(file)
      }
    }
    
    if (errors.length > 0) {
      alert(`Some files were rejected:\n${errors.join('\n')}`)
    }
    
    if (validFiles.length === 0) return
    
    setIsUploading(true)
    
    try {
      // Upload files directly to S3
      const s3Urls = await uploadComplaintImages(validFiles, currentCompany as 'CDPL' | 'CFPL')
      
      // Store S3 URLs - remove duplicates
      const existingUrls = new Set(uploadedFiles)
      const newUrls = s3Urls.filter(url => url && !existingUrls.has(url))
      const newUploadedFiles = [...uploadedFiles, ...newUrls]
      setUploadedFiles(newUploadedFiles)
      setValue('proofImages', newUploadedFiles)
      
      // Keep file objects for preview
      setSelectedImages(prev => [...prev, ...validFiles])
      
      alert(`${validFiles.length} file(s) uploaded successfully to S3!`)
    } catch (error) {
      console.error('Upload error:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload files. Please try again.')
    } finally {
      setIsUploading(false)
      // Reset input
      if (event.target) event.target.value = ''
    }
  }

  // Remove selected file
  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    const newUploadedFiles = uploadedFiles.filter((_, i) => i !== index)
    setSelectedImages(newImages)
    setUploadedFiles(newUploadedFiles)
    setValue('proofImages', newUploadedFiles)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Customer Information Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Name */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name *
                </label>
                <CustomerDropdown
                  value={watchedCustomerName}
                  onChange={(value) => {
                    setValue('customerName', value)
                    if (value !== 'other') {
                      setValue('customerNameOther', '') // Reset other field when not other
                    }
                  }}
                  company={currentCompany}
                  placeholder="Select or search customer..."
                  error={!!errors.customerName}
                />
                {errors.customerName && (
                  <p className="text-sm text-red-600">{errors.customerName.message}</p>
                )}

                {/* Conditional Other Customer Name Input */}
                {watchedCustomerName === 'other' && (
                  <div className="mt-2">
                    <input
                      {...register('customerNameOther')}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                        errors.customerNameOther ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                      )}
                      placeholder="Enter customer name"
                    />
                    {errors.customerNameOther && (
                      <p className="text-sm text-red-600">{errors.customerNameOther.message}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Email */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  {...register('customerEmail')}
                  type="email"
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                    errors.customerEmail ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  )}
                  placeholder="customer@example.com"
                />
                {errors.customerEmail && (
                  <p className="text-sm text-red-600">{errors.customerEmail.message}</p>
                )}
              </div>

              {/* Customer Address */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  {...register('customerAddress')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Complete address with pin code"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Complaint Details Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Complaint Details</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Problem Statement */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Problem Statement *
                </label>
                <textarea
                  {...register('problemStatement')}
                  rows={3}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                    errors.problemStatement ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  )}
                  placeholder="Describe the problem in detail, including what happened, when it occurred, and the impact..."
                />
                {errors.problemStatement && (
                  <p className="text-sm text-red-600">{errors.problemStatement.message}</p>
                )}
              </div>

              {/* Date of Complaint Receive */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Date of Complaint Receive *
                </label>
                <input
                  type="date"
                  {...register('complaintReceiveDate')}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                    errors.complaintReceiveDate ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  )}
                />
                {errors.complaintReceiveDate && (
                  <p className="text-sm text-red-600">{errors.complaintReceiveDate.message}</p>
                )}
              </div>

              {/* Nature of Complaint Category */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Complaint Category *
                </label>
                <select
                  {...register('complaintCategory')}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                    errors.complaintCategory ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  )}
                  onChange={(e) => {
                    register('complaintCategory').onChange(e);
                    setValue('complaintSubcategory', ''); // Reset subcategory when category changes
                  }}
                >
                  <option value="food_safety">Food Safety Complaints</option>
                  <option value="non_food_safety">Non-food Safety</option>
                </select>
                {errors.complaintCategory && (
                  <p className="text-sm text-red-600">{errors.complaintCategory.message}</p>
                )}
              </div>

              {/* Nature of Complaint Subcategory */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Complaint Subcategory *
                </label>
                <select
                  {...register('complaintSubcategory')}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                    errors.complaintSubcategory ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  )}
                >
                  <option value="">Select subcategory</option>
                  {watchedCategory === 'food_safety' && (
                    <>
                      <option value="physical_hazard">Physical Hazard</option>
                      <option value="chemical_hazard">Chemical Hazard</option>
                      <option value="biological_hazard">Biological Hazard</option>
                      <option value="allergen">Allergen</option>
                    </>
                  )}
                  {watchedCategory === 'non_food_safety' && (
                    <>
                      <option value="misprinting">Misprinting</option>
                      <option value="taste_smell_texture">Taste, smell, texture</option>
                      <option value="misleading_claims">Misleading claims</option>
                      <option value="packaging_defects">Packaging defects</option>
                    </>
                  )}
                </select>
                {errors.complaintSubcategory && (
                  <p className="text-sm text-red-600">{errors.complaintSubcategory.message}</p>
                )}
              </div>

              {/* Measures to Resolve */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Measures to Resolve
                </label>
                <select
                  {...register('measuresToResolve')}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                    errors.measuresToResolve ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  )}
                >
                  <option value="">Select resolution measure</option>
                  <option value="rtv">RTV (Return to Vendor)</option>
                  <option value="rca_capa">RCA/CAPA (Root Cause Analysis/Corrective Action)</option>
                  <option value="fishbone">Fishbone Analysis</option>
                  <option value="replacement">Replacement</option>
                  <option value="refund">Refund</option>
                  <option value="other">Other</option>
                </select>
                {errors.measuresToResolve && (
                  <p className="text-sm text-red-600">{errors.measuresToResolve.message}</p>
                )}
              </div>

              {/* Remarks */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Remarks (Optional)
                </label>
                <textarea
                  {...register('remarks')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any additional remarks, notes, or special instructions related to this complaint..."
                />
              </div>

            </div>
          </div>
        </div>

        {/* Communication Method Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Communication Details</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                How did you receive this complaint? *
              </label>
              <select
                {...register('communicationMethod')}
                className={cn(
                  "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                  isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
                )}
                disabled={isEditing}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Proof Images Upload Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Upload Proof Images
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Drag and drop images here, or click to select files
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, JPEG, GIF, WEBP up to 10MB each
                    </p>
                  </div>
                  <div className="relative mt-4">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageSelect}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Select Files
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Preview area for uploaded files */}
              {(() => {
                console.log('Render check - selectedImages.length:', selectedImages.length)
                console.log('Render check - uploadedFiles.length:', uploadedFiles.length)
                console.log('Render check - uploadedFiles:', uploadedFiles)
                return (selectedImages.length > 0 || uploadedFiles.length > 0)
              })() && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Files ({selectedImages.length + uploadedFiles.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Display already uploaded files (from edit mode) */}
                    {uploadedFiles.map((url, index) => {
                      console.log(`Rendering uploaded image ${index}:`, url)
                      return (
                      <div key={`uploaded-${index}`} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg border border-gray-200 p-2 overflow-hidden">
                          <img
                            src={url}
                            alt={`Uploaded ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/placeholder-image.png'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newUploadedFiles = uploadedFiles.filter((_, i) => i !== index)
                            setUploadedFiles(newUploadedFiles)
                            setValue('proofImages', newUploadedFiles)
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        <p className="mt-1 text-xs text-gray-600 truncate">Uploaded Image</p>
                      </div>
                      )
                    })}
                    
                    {/* Display newly selected files */}
                    {selectedImages.map((file, index) => (
                      <div key={`new-${index}`} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg border border-gray-200 p-2 overflow-hidden">
                          {file.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <p className="text-xs text-gray-500 mt-2">Video</p>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = selectedImages.filter((_, i) => i !== index)
                            setSelectedImages(newImages)
                            // Note: uploadedFiles already has S3 URLs, selectedImages are temporary File objects
                            // Only remove from selectedImages, not from uploadedFiles
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        <p className="mt-1 text-xs text-gray-600 truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Articles/Products Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Articles/Products</h2>
              <button
                type="button"
                onClick={() => append({ category: '', subcategory: '', subcategoryOther: '', itemDescription: '', quantity: 1, defectDescription: '' })}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Article
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Article {index + 1}</h4>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Item Category *
                      </label>
                      <ItemCategoryDropdown
                        value={watch(`articles.${index}.category`) || ''}
                        onChange={(value) => {
                          setValue(`articles.${index}.category`, value)
                          // Reset subcategory and item description when category changes
                          setValue(`articles.${index}.subcategory`, '')
                          setValue(`articles.${index}.itemDescription`, '')
                        }}
                        company={currentCompany}
                        placeholder="Select item category..."
                        error={!!errors.articles?.[index]?.category}
                      />
                      {errors.articles?.[index]?.category && (
                        <p className="text-sm text-red-600">{errors.articles[index].category?.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Item Subcategory *
                      </label>
                      <ItemSubcategoryDropdown
                        value={watch(`articles.${index}.subcategory`) || ''}
                        onChange={(value) => {
                          setValue(`articles.${index}.subcategory`, value)
                          // Reset item description when subcategory changes
                          setValue(`articles.${index}.itemDescription`, '')
                        }}
                        company={currentCompany}
                        category={watch(`articles.${index}.category`) || ''}
                        placeholder="Select subcategory..."
                        error={!!errors.articles?.[index]?.subcategory}
                        disabled={!watch(`articles.${index}.category`)}
                      />
                      {errors.articles?.[index]?.subcategory && (
                        <p className="text-sm text-red-600">{errors.articles[index].subcategory?.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Item Description *
                      </label>
                      <ItemDescriptionDropdown
                        value={watch(`articles.${index}.itemDescription`) || ''}
                        onChange={(value) => {
                          setValue(`articles.${index}.itemDescription`, value)
                        }}
                        company={currentCompany}
                        category={watch(`articles.${index}.category`) || ''}
                        subcategory={watch(`articles.${index}.subcategory`) || ''}
                        placeholder="Select item description..."
                        error={!!errors.articles?.[index]?.itemDescription}
                        disabled={!watch(`articles.${index}.subcategory`) || watch(`articles.${index}.subcategory`) === 'Other'}
                      />
                      {errors.articles?.[index]?.itemDescription && (
                        <p className="text-sm text-red-600">{errors.articles[index].itemDescription?.message}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Conditional Other Subcategory Field */}
                  {watch(`articles.${index}.subcategory`) === 'Other' && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Other Subcategory *
                        </label>
                        <input
                          {...register(`articles.${index}.subcategoryOther`)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Please specify the subcategory"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Item Description *
                        </label>
                        <input
                          {...register(`articles.${index}.itemDescription`)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter item description manually"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Quantity and Defect Description Row */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity*
                      </label>
                      <input
                        {...register(`articles.${index}.quantity`, { valueAsNumber: true })}
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Defect Description
                    </label>
                    <textarea
                      {...register(`articles.${index}.defectDescription`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="Describe the issue with this article"
                    />
                  </div>
                </div>
              ))}
              

            </div>
          </div>
        </div>



        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => window.history.back()}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center",
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Complaint' : 'Create Complaint'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ComplaintCreateForm