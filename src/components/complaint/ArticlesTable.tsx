'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ArticleItem, IssueType, Currency, ISSUE_TYPE_LABELS } from '@/types';

interface ArticlesTableProps {
  items: ArticleItem[];
  onChange: (items: ArticleItem[]) => void;
  errors?: Record<string, any>;
  confidenceScores?: Record<string, number>;
  className?: string;
}

const defaultItem: ArticleItem = {
  sku: '',
  item_description: '',
  qty: 1,
  uom: 'pcs',
  unit_price: 0,
  currency: 'INR',
  issue_type: 'defect',
  problem_description: '',
};

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const UOMS = ['pcs', 'kg', 'ltr', 'mtr', 'box', 'set'];

export function ArticlesTable({ items, onChange, errors, confidenceScores, className = '' }: ArticlesTableProps) {
  const addItem = () => {
    onChange([...items, { ...defaultItem }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      onChange(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ArticleItem, value: any) => {
    const updated = items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        // Auto-calculate line total
        if (field === 'qty' || field === 'unit_price') {
          updatedItem.line_total = updatedItem.qty * updatedItem.unit_price;
        }
        return updatedItem;
      }
      return item;
    });
    onChange(updated);
  };

  const getConfidenceClass = (path: string): string => {
    const score = confidenceScores?.[path];
    if (!score) return '';
    
    if (score >= 0.8) return 'border-confidence-high bg-green-50';
    if (score >= 0.6) return 'border-confidence-medium bg-yellow-50';
    return 'border-confidence-low bg-red-50';
  };

  const grandTotal = items.reduce((sum, item) => sum + (item.line_total || item.qty * item.unit_price), 0);
  const primaryCurrency = items[0]?.currency || 'INR';

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Articles</h3>
        <button
          type="button"
          onClick={addItem}
          className="btn btn-secondary btn-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qty *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                UOM *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Currency
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Line Total
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Issue Type *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Problem *
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.sku}
                    onChange={(e) => updateItem(index, 'sku', e.target.value)}
                    className={`form-input text-sm ${getConfidenceClass(`items[${index}].sku`)}`}
                    placeholder="SKU001"
                  />
                  {errors?.[`items.${index}.sku`] && (
                    <div className="form-error">{errors[`items.${index}.sku`]}</div>
                  )}
                </td>
                
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.item_description}
                    onChange={(e) => updateItem(index, 'item_description', e.target.value)}
                    className={`form-input text-sm ${getConfidenceClass(`items[${index}].item_description`)}`}
                    placeholder="Item description"
                  />
                  {errors?.[`items.${index}.item_description`] && (
                    <div className="form-error">{errors[`items.${index}.item_description`]}</div>
                  )}
                </td>
                
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                    className={`form-input text-sm w-20 ${getConfidenceClass(`items[${index}].qty`)}`}
                    min="0.01"
                    step="0.01"
                  />
                  {errors?.[`items.${index}.qty`] && (
                    <div className="form-error">{errors[`items.${index}.qty`]}</div>
                  )}
                </td>
                
                <td className="px-3 py-2">
                  <select
                    value={item.uom}
                    onChange={(e) => updateItem(index, 'uom', e.target.value)}
                    className={`form-input text-sm w-20 ${getConfidenceClass(`items[${index}].uom`)}`}
                  >
                    {UOMS.map(uom => (
                      <option key={uom} value={uom}>{uom}</option>
                    ))}
                  </select>
                </td>
                
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className={`form-input text-sm w-24 ${getConfidenceClass(`items[${index}].unit_price`)}`}
                    min="0"
                    step="0.01"
                  />
                  {errors?.[`items.${index}.unit_price`] && (
                    <div className="form-error">{errors[`items.${index}.unit_price`]}</div>
                  )}
                </td>
                
                <td className="px-3 py-2">
                  <select
                    value={item.currency}
                    onChange={(e) => updateItem(index, 'currency', e.target.value)}
                    className="form-input text-sm w-20"
                  >
                    {CURRENCIES.map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </td>
                
                <td className="px-3 py-2">
                  <div className="text-sm font-medium text-gray-900">
                    {(item.line_total || item.qty * item.unit_price).toFixed(2)}
                  </div>
                </td>
                
                <td className="px-3 py-2">
                  <select
                    value={item.issue_type}
                    onChange={(e) => updateItem(index, 'issue_type', e.target.value as IssueType)}
                    className={`form-input text-sm ${getConfidenceClass(`items[${index}].issue_type`)}`}
                  >
                    {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                
                <td className="px-3 py-2">
                  <textarea
                    value={item.problem_description}
                    onChange={(e) => updateItem(index, 'problem_description', e.target.value)}
                    className={`form-input text-sm resize-none ${getConfidenceClass(`items[${index}].problem_description`)}`}
                    rows={2}
                    placeholder="Describe the problem..."
                  />
                  {errors?.[`items.${index}.problem_description`] && (
                    <div className="form-error">{errors[`items.${index}.problem_description`]}</div>
                  )}
                </td>
                
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="btn btn-sm text-danger-600 hover:text-danger-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grand Total */}
      <div className="flex justify-end">
        <div className="bg-gray-50 rounded-lg p-4 min-w-[200px]">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Grand Total:</span>
            <span className="text-lg font-bold text-gray-900">
              {primaryCurrency} {grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        * Required fields. Line totals are automatically calculated.
      </div>
    </div>
  );
}