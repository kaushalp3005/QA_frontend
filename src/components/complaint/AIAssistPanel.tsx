'use client';

import React, { useState } from 'react';
import { Upload, Wand2, Check, X, AlertTriangle, Info } from 'lucide-react';
import { AIExtractionPayload, AIExtractionResult, ComplaintCreate, ComplaintFormData, getConfidenceLevel } from '@/types';
import { useDropzone } from 'react-dropzone';

interface AIAssistPanelProps {
  onExtract: (payload: AIExtractionPayload) => Promise<AIExtractionResult>;
  onApply: (data: Partial<ComplaintCreate>, fieldPaths?: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

export function AIAssistPanel({ onExtract, onApply, isLoading = false, className = '' }: AIAssistPanelProps) {
  const [rawText, setRawText] = useState('');
  const [sourceHint, setSourceHint] = useState<'email' | 'whatsapp' | 'voice' | 'other'>('whatsapp');
  const [extractionResult, setExtractionResult] = useState<AIExtractionResult | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'message/rfc822': ['.eml'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        const text = await file.text();
        setRawText(text);
        // Auto-detect source hint from file type
        if (file.name.endsWith('.eml')) {
          setSourceHint('email');
        } else {
          setSourceHint('other');
        }
      }
    },
  });

  const handleExtract = async () => {
    if (!rawText.trim()) return;

    setExtracting(true);
    try {
      const result = await onExtract({
        raw_text: rawText,
        source_hint: sourceHint,
        optional_context: {
          currency_default: 'INR',
          default_uom: 'pcs',
        },
      });
      setExtractionResult(result);
      setShowDiff(true);
    } catch (error) {
      console.error('Extraction failed:', error);
    } finally {
      setExtracting(false);
    }
  };

  const handleApplyAll = () => {
    if (!extractionResult) return;
    // Since we now use ComplaintCreate directly, no mapping needed
    onApply(extractionResult.extracted_data);
    setShowDiff(false);
  };

  const handleApplyField = (fieldPath: string) => {
    if (!extractionResult) return;
    // Since we now use ComplaintCreate directly, extract the specific field value
    const extracted = extractionResult.extracted_data;
    const value = getNestedValue(extracted, fieldPath);
    if (value !== undefined) {
      onApply({ [fieldPath]: value } as Partial<ComplaintCreate>, [fieldPath]);
    } else {
      // Fallback: apply all extracted data
      onApply(extracted);
    }
  };

  const handleReject = () => {
    setExtractionResult(null);
    setShowDiff(false);
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

  const setNestedValue = (obj: any, path: string, value: any): any => {
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.split('[')[0];
        const index = parseInt(key.split('[')[1].split(']')[0]);
        if (!current[arrayKey]) current[arrayKey] = [];
        if (!current[arrayKey][index]) current[arrayKey][index] = {};
        current = current[arrayKey][index];
      } else {
        if (!current[key]) current[key] = {};
        current = current[key];
      }
    }

    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
    return result;
  };

  const renderConfidenceBadge = (score: number) => {
    const level = getConfidenceLevel(score);
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[level]}`}>
        {level} ({Math.round(score * 100)}%)
      </span>
    );
  };

  const renderFieldDiff = (fieldPath: string, label: string, value: any) => {
    const confidence = extractionResult?.confidence_scores[fieldPath] || 0;
    const isUnresolved = extractionResult?.unresolved_fields.includes(fieldPath);

    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-700">{label}</span>
            {renderConfidenceBadge(confidence)}
            {isUnresolved && (
              <AlertTriangle size={16} className="text-yellow-500" />
            )}
          </div>
          <div className="text-sm text-gray-900 mt-1">
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            type="button"
            onClick={() => handleApplyField(fieldPath)}
            className="btn-sm btn-primary"
            disabled={confidence < 0.3}
          >
            <Check size={14} />
            Apply
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Wand2 size={20} />
          AI Auto-fill Assistant
        </h3>

        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="form-label">Source Type</label>
            <select
              value={sourceHint}
              onChange={(e) => setSourceHint(e.target.value as any)}
              className="form-input"
            >
              <option value="whatsapp">WhatsApp Message</option>
              <option value="email">Email</option>
              <option value="voice">Voice Transcript</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="form-label">Raw Text or File Upload</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                {isDragActive
                  ? 'Drop the file here...'
                  : 'Drag & drop a .txt or .eml file, or click to select'}
              </p>
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Or paste raw text here (WhatsApp messages, email content, voice transcript...)"
              rows={6}
              className="form-input mt-2"
            />
          </div>

          <button
            type="button"
            onClick={handleExtract}
            disabled={!rawText.trim() || extracting || isLoading}
            className="btn-primary flex items-center gap-2"
          >
            <Wand2 size={16} />
            {extracting ? 'Extracting...' : 'Auto-fill Form'}
          </button>
        </div>

        {/* Results Section */}
        {extractionResult && showDiff && (
          <div className="mt-8 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">AI Extraction Results</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplyAll}
                  className="btn-primary btn-sm"
                >
                  Apply All
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="btn-secondary btn-sm"
                >
                  <X size={14} />
                  Reject
                </button>
              </div>
            </div>

            {/* Warnings */}
            {extractionResult.warnings.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                  <AlertTriangle size={16} />
                  Warnings
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {extractionResult.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {extractionResult.suggestions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                  <Info size={16} />
                  Suggestions
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  {extractionResult.suggestions.map((suggestion, i) => (
                    <li key={i}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Field-by-field diff */}
            <div className="space-y-3">
              <h5 className="font-medium text-gray-700">Extracted Fields</h5>
              
              {/* Customer Fields */}
              {renderFieldDiff('customer.name', 'Customer Name', extractionResult.extracted_data.customer?.name)}
              {extractionResult.extracted_data.customer?.email && 
                renderFieldDiff('customer.email', 'Email', extractionResult.extracted_data.customer.email)}
              {extractionResult.extracted_data.customer?.phone && 
                renderFieldDiff('customer.phone', 'Phone', extractionResult.extracted_data.customer.phone)}

              {/* Items */}
              {extractionResult.extracted_data.items?.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <h6 className="font-medium text-gray-600 mb-2">Item #{index + 1}</h6>
                  <div className="space-y-2">
                    {renderFieldDiff(`items[${index}].sku`, 'SKU', item.sku)}
                    {renderFieldDiff(`items[${index}].item_description`, 'Description', item.item_description)}
                    {renderFieldDiff(`items[${index}].qty`, 'Quantity', item.qty)}
                  </div>
                </div>
              ))}

              {/* Summary */}
              {renderFieldDiff('summary', 'Summary', extractionResult.extracted_data.summary)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}