'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Upload, Save, X } from 'lucide-react';
import { ComplaintFormData, ComplaintCreate, Priority, ComplaintSource, PRIORITY_CONFIG, ArticleItem } from '@/types';
import { ArticlesTable } from './ArticlesTable';
import { AIAssistPanel } from './AIAssistPanel';
import { useDropzone } from 'react-dropzone';

interface ComplaintFormProps {
  initialData?: Partial<ComplaintCreate>;
  onSubmit: (data: ComplaintCreate) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  showAIAssist?: boolean;
}

export function ComplaintForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  showAIAssist = true
}: ComplaintFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ComplaintCreate>({
    defaultValues: {
      source: 'webform',
      customer: {
        name: '',
        phone: null,
        email: null,
        company: null,
        address: null,
      },
      items: [
        {
          sku: '',
          item_description: '',
          qty: 1,
          uom: 'pcs',
          unit_price: 0,
          currency: 'INR',
          issue_type: 'defect',
          problem_description: '',
        }
      ],
      summary: '',
      attachments: [],
      priority: 'medium',
      ...initialData,
    },
  });

  const watchedItems = watch('items');
  const watchedAttachments = watch('attachments');

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: async (acceptedFiles) => {
      // In a real implementation, you'd upload these to your file service
      const newAttachments = acceptedFiles.map(file => ({
        url: URL.createObjectURL(file), // Temporary URL for preview
        filename: file.name,
        type: file.type,
      }));
      
      setValue('attachments', [...(watchedAttachments || []), ...newAttachments]);
    },
  });

  const handleAIApply = (aiData: Partial<ComplaintCreate>, fieldPaths?: string[]) => {
    if (fieldPaths) {
      // Apply specific fields
      fieldPaths.forEach(path => {
        const value = getNestedValue(aiData, path);
        setValue(path as any, value);
      });
    } else {
      // Apply all fields
      Object.entries(aiData).forEach(([key, value]) => {
        setValue(key as any, value);
      });
    }
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.split('[')[0];
        const index = parseInt(key.split('[')[1].split(']')[0]);
        return current?.[arrayKey]?.[index];
      }
      return current?.[key];
    }, obj);
  };

  const removeAttachment = (index: number) => {
    const updated = watchedAttachments?.filter((_, i) => i !== index) || [];
    setValue('attachments', updated);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {showAIAssist && (
        <AIAssistPanel
          onExtract={async (payload) => {
            // This would call your AI extraction API
            throw new Error('AI extraction not implemented');
          }}
          onApply={handleAIApply}
          isLoading={isLoading}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Complaint Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source */}
            <div>
              <label className="form-label">Source *</label>
              <select {...register('source', { required: 'Source is required' })} className="form-input">
                <option value="webform">Web Form</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="voice">Voice</option>
                <option value="call">Phone Call</option>
                <option value="other">Other</option>
              </select>
              {errors.source && <div className="form-error">{errors.source.message}</div>}
            </div>

            {/* Priority */}
            <div>
              <label className="form-label">Priority</label>
              <select {...register('priority')} className="form-input">
                {Object.entries(PRIORITY_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6">
            <label className="form-label">Summary *</label>
            <textarea
              {...register('summary', { required: 'Summary is required' })}
              rows={3}
              className="form-input"
              placeholder="Brief description of the complaint..."
            />
            {errors.summary && <div className="form-error">{errors.summary.message}</div>}
          </div>
        </div>

        {/* Customer Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Customer Name *</label>
              <input
                {...register('customer.name', { required: 'Customer name is required' })}
                className="form-input"
                placeholder="Customer name"
              />
              {errors.customer?.name && <div className="form-error">{errors.customer.name.message}</div>}
            </div>

            <div>
              <label className="form-label">Phone</label>
              <input
                {...register('customer.phone', {
                  pattern: {
                    value: /^\+[1-9]\d{1,14}$/,
                    message: 'Phone must be in E.164 format (e.g., +919876543210)'
                  }
                })}
                className="form-input"
                placeholder="+919876543210"
              />
              {errors.customer?.phone && <div className="form-error">{errors.customer.phone.message}</div>}
            </div>

            <div>
              <label className="form-label">Email</label>
              <input
                {...register('customer.email', {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email format'
                  }
                })}
                type="email"
                className="form-input"
                placeholder="customer@example.com"
              />
              {errors.customer?.email && <div className="form-error">{errors.customer.email.message}</div>}
            </div>

            <div>
              <label className="form-label">Company</label>
              <input
                {...register('customer.company')}
                className="form-input"
                placeholder="Company name"
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Address</label>
              <textarea
                {...register('customer.address')}
                rows={2}
                className="form-input"
                placeholder="Customer address"
              />
            </div>
          </div>
        </div>

        {/* Articles Table */}
        <div className="card p-6">
          <ArticlesTable
            items={watchedItems as ArticleItem[]}
            onChange={(items) => setValue('items', items)}
            errors={errors}
          />
        </div>

        {/* Attachments */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
          
          <div
            {...getRootProps()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            <input {...getInputProps()} />
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Drag & drop files here, or click to select files
            </p>
          </div>

          {watchedAttachments && watchedAttachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-gray-700">Uploaded Files</h4>
              {watchedAttachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{file?.filename || 'Unnamed file'}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-danger-600 hover:text-danger-900"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary btn-lg"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn-primary btn-lg flex items-center gap-2"
            disabled={isLoading}
          >
            <Save size={16} />
            {isLoading ? 'Saving...' : 'Save Complaint'}
          </button>
        </div>
      </form>
    </div>
  );
}