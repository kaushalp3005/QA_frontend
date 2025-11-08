import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import {
  Complaint,
  ComplaintCreate,
  ComplaintUpdate,
  AIExtractionPayload,
  Customer,
  ArticleItem,
  STATUS_TRANSITIONS,
  ComplaintStatus,
} from '@/types';

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// JSON Schemas (converted from our JSON schema files)
const customerSchema: JSONSchemaType<Customer> = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    phone: { type: 'string', pattern: '^\\+[1-9]\\d{1,14}$', nullable: true },
    email: { type: 'string', format: 'email', nullable: true },
    company: { type: 'string', maxLength: 255, nullable: true },
    address: { type: 'string', maxLength: 1000, nullable: true },
  },
  required: ['name'],
  additionalProperties: false,
};

const articleItemSchema: JSONSchemaType<ArticleItem> = {
  type: 'object',
  properties: {
    sku: { type: 'string', minLength: 1, maxLength: 100 },
    item_description: { type: 'string', minLength: 1, maxLength: 500 },
    qty: { type: 'number', exclusiveMinimum: 0 },
    uom: { type: 'string', minLength: 1, maxLength: 50 },
    unit_price: { type: 'number', minimum: 0 },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    line_total: { type: 'number', minimum: 0, nullable: true },
    issue_type: {
      type: 'string',
      enum: ['defect', 'missing_qty', 'wrong_item', 'damaged', 'billing', 'delivery_delay', 'other'],
    },
    problem_description: { type: 'string', minLength: 1, maxLength: 1000 },
  },
  required: ['sku', 'item_description', 'qty', 'uom', 'unit_price', 'currency', 'issue_type', 'problem_description'],
  additionalProperties: false,
};

const complaintCreateSchema: JSONSchemaType<ComplaintCreate> = {
  type: 'object',
  properties: {
    source: {
      type: 'string',
      enum: ['email', 'whatsapp', 'voice', 'call', 'webform', 'other'],
    },
    channel_metadata: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
    },
    customer: customerSchema,
    items: {
      type: 'array',
      items: articleItemSchema,
      minItems: 1,
    },
    summary: { type: 'string', minLength: 1, maxLength: 2000 },
    attachments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' },
          filename: { type: 'string' },
          type: { type: 'string' },
        },
        required: ['url', 'filename', 'type'],
      },
      nullable: true,
    },
    priority: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'urgent'],
      nullable: true,
    },
  },
  required: ['source', 'customer', 'items', 'summary'],
  additionalProperties: false,
};

// Validators
export const validateComplaintCreate = ajv.compile(complaintCreateSchema);
export const validateCustomer = ajv.compile(customerSchema);
export const validateArticleItem = ajv.compile(articleItemSchema);

// Custom validation functions
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return true; // Optional field
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

export function validateEmail(email: string): boolean {
  if (!email) return true; // Optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateCurrency(currency: string): boolean {
  return /^[A-Z]{3}$/.test(currency);
}

export function validateQuantity(qty: number): boolean {
  return typeof qty === 'number' && qty > 0;
}

export function validateUnitPrice(price: number): boolean {
  return typeof price === 'number' && price >= 0;
}

// Status transition validation
export function validateStatusTransition(fromStatus: ComplaintStatus, toStatus: ComplaintStatus): boolean {
  const allowedTransitions = STATUS_TRANSITIONS[fromStatus] || [];
  return allowedTransitions.includes(toStatus);
}

// Form field validators (for react-hook-form)
export const formValidators = {
  customerName: {
    required: 'Customer name is required',
    minLength: { value: 1, message: 'Name is required' },
    maxLength: { value: 255, message: 'Name must be less than 255 characters' },
  },
  customerPhone: {
    pattern: {
      value: /^\+[1-9]\d{1,14}$/,
      message: 'Phone must be in E.164 format (e.g., +919876543210)',
    },
  },
  customerEmail: {
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email format',
    },
  },
  itemSku: {
    required: 'SKU is required',
    minLength: { value: 1, message: 'SKU is required' },
    maxLength: { value: 100, message: 'SKU must be less than 100 characters' },
  },
  itemDescription: {
    required: 'Description is required',
    minLength: { value: 1, message: 'Description is required' },
    maxLength: { value: 500, message: 'Description must be less than 500 characters' },
  },
  itemQuantity: {
    required: 'Quantity is required',
    min: { value: 0.01, message: 'Quantity must be greater than 0' },
  },
  itemUnitPrice: {
    required: 'Unit price is required',
    min: { value: 0, message: 'Unit price must be 0 or greater' },
  },
  problemDescription: {
    required: 'Problem description is required',
    minLength: { value: 1, message: 'Problem description is required' },
    maxLength: { value: 1000, message: 'Problem description must be less than 1000 characters' },
  },
  summary: {
    required: 'Summary is required',
    minLength: { value: 1, message: 'Summary is required' },
    maxLength: { value: 2000, message: 'Summary must be less than 2000 characters' },
  },
};

// Utility functions for validation errors
export function formatValidationErrors(errors: any[]): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  errors.forEach((error) => {
    const field = error.instancePath?.replace('/', '') || error.schemaPath;
    formatted[field] = error.message || 'Validation error';
  });
  
  return formatted;
}

export function getFieldError(errors: any[], fieldPath: string): string | null {
  const error = errors.find((err) => err.instancePath === `/${fieldPath}`);
  return error?.message || null;
}

// Calculate line totals and validate items
export function calculateAndValidateItems(items: ArticleItem[]): {
  items: ArticleItem[];
  grandTotal: number;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  let grandTotal = 0;

  const processedItems = items.map((item, index) => {
    const processed = { ...item };

    // Validate individual fields
    if (!validateQuantity(item.qty)) {
      errors[`items[${index}].qty`] = 'Quantity must be greater than 0';
    }
    if (!validateUnitPrice(item.unit_price)) {
      errors[`items[${index}].unit_price`] = 'Unit price must be 0 or greater';
    }
    if (!validateCurrency(item.currency)) {
      errors[`items[${index}].currency`] = 'Invalid currency code';
    }

    // Calculate line total
    if (validateQuantity(item.qty) && validateUnitPrice(item.unit_price)) {
      processed.line_total = item.qty * item.unit_price;
      grandTotal += processed.line_total;
    } else {
      processed.line_total = 0;
    }

    return processed;
  });

  return { items: processedItems, grandTotal, errors };
}