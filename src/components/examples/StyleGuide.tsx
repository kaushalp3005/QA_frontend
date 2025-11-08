// Example Usage Guide for Tailwind Utility Classes
// This file shows how to use the utility-first approach instead of custom CSS

import { buttonStyles, formStyles, badgeStyles, cardStyles, cn, getButtonClasses, getBadgeClasses } from '@/lib/styles'

// ============================================================================
// BUTTON EXAMPLES
// ============================================================================

const ButtonExamples = () => (
  <div className="space-y-4">
    {/* Primary Buttons */}
    <button className={getButtonClasses('primary', 'md')}>
      Primary Button
    </button>
    
    {/* Using individual classes */}
    <button className={cn(buttonStyles.base, buttonStyles.primary, buttonStyles.lg)}>
      Large Primary Button
    </button>
    
    {/* Secondary Button with custom classes */}
    <button className={getButtonClasses('secondary', 'sm', 'min-w-24')}>
      Small Secondary
    </button>
    
    {/* Danger Button */}
    <button className={cn(buttonStyles.base, buttonStyles.danger, buttonStyles.md)}>
      Delete Item
    </button>
  </div>
)

// ============================================================================
// FORM EXAMPLES
// ============================================================================

const FormExamples = () => (
  <div className={formStyles.group}>
    {/* Regular Input */}
    <div>
      <label className={formStyles.label}>
        Customer Name
      </label>
      <input 
        type="text" 
        className={formStyles.input}
        placeholder="Enter customer name"
      />
    </div>
    
    {/* Required Input with Error */}
    <div>
      <label className={formStyles.labelRequired}>
        Email Address
      </label>
      <input 
        type="email" 
        className={formStyles.inputError}
        placeholder="Enter email"
      />
      <p className={formStyles.error}>
        Please enter a valid email address
      </p>
    </div>
    
    {/* Inline Form Group */}
    <div className={formStyles.groupInline}>
      <input type="checkbox" className="rounded border-gray-300" />
      <label className="text-sm text-gray-700">
        Send notification emails
      </label>
    </div>
  </div>
)

// ============================================================================
// BADGE EXAMPLES
// ============================================================================

const BadgeExamples = () => (
  <div className="flex flex-wrap gap-2">
    {/* Status Badges */}
    <span className={getBadgeClasses('draft')}>Draft</span>
    <span className={getBadgeClasses('submitted')}>Submitted</span>
    <span className={getBadgeClasses('inReview')}>In Review</span>
    <span className={getBadgeClasses('resolved')}>Resolved</span>
    <span className={getBadgeClasses('rejected')}>Rejected</span>
    
    {/* Confidence Badges */}
    <span className={getBadgeClasses('highConfidence', 'lg')}>High Confidence</span>
    <span className={getBadgeClasses('mediumConfidence')}>Medium Confidence</span>
    <span className={getBadgeClasses('lowConfidence', 'sm')}>Low Confidence</span>
  </div>
)

// ============================================================================
// CARD EXAMPLES
// ============================================================================

const CardExamples = () => (
  <div className="space-y-6">
    {/* Basic Card */}
    <div className={cardStyles.base}>
      <div className={cardStyles.header}>
        <h3 className="text-lg font-semibold text-gray-900">Card Title</h3>
      </div>
      <div className={cardStyles.body}>
        <p className="text-gray-600">Card content goes here...</p>
      </div>
      <div className={cardStyles.footer}>
        <button className={getButtonClasses('primary', 'sm')}>
          Action
        </button>
      </div>
    </div>
    
    {/* Interactive Card */}
    <div className={cardStyles.interactive}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Clickable Card</h3>
        <p className="text-gray-600 mt-2">This card has hover effects</p>
      </div>
    </div>
  </div>
)

// ============================================================================
// TABLE EXAMPLES
// ============================================================================

const TableExamples = () => (
  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Name
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            John Doe
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={getBadgeClasses('resolved')}>Resolved</span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <button className={getButtonClasses('secondary', 'sm')}>
              View
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
)

// ============================================================================
// LAYOUT EXAMPLES
// ============================================================================

const LayoutExamples = () => (
  <div className="space-y-8">
    {/* Header with actions */}
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
      <button className={getButtonClasses('primary', 'md')}>
        New Item
      </button>
    </div>
    
    {/* Grid layout */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className={cardStyles.base}>
        <div className="p-6">Content 1</div>
      </div>
      <div className={cardStyles.base}>
        <div className="p-6">Content 2</div>
      </div>
      <div className={cardStyles.base}>
        <div className="p-6">Content 3</div>
      </div>
    </div>
    
    {/* Centered content */}
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Centered Content</h2>
        <p className="text-gray-600 mt-2">This content is perfectly centered</p>
      </div>
    </div>
  </div>
)

// ============================================================================
// COMPLETE COMPONENT EXAMPLES
// ============================================================================

// Example: Complaint Status Component
export const ComplaintStatus = ({ status }: { status: string }) => {
  const getBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'draft'
      case 'submitted': return 'submitted'
      case 'in-review': return 'inReview'
      case 'resolved': return 'resolved'
      case 'rejected': return 'rejected'
      default: return 'draft'
    }
  }
  
  return (
    <span className={getBadgeClasses(getBadgeVariant(status) as any)}>
      {status}
    </span>
  )
}

// Example: Action Button Group
export const ActionButtons = () => (
  <div className="flex space-x-3">
    <button className={getButtonClasses('primary', 'md')}>
      Save Changes
    </button>
    <button className={getButtonClasses('secondary', 'md')}>
      Cancel
    </button>
    <button className={getButtonClasses('danger', 'md')}>
      Delete
    </button>
  </div>
)

// Example: Form Field with Validation
export const FormField = ({ 
  label, 
  error, 
  required = false, 
  ...inputProps 
}: {
  label: string
  error?: string
  required?: boolean
  [key: string]: any
}) => (
  <div className={formStyles.group}>
    <label className={required ? formStyles.labelRequired : formStyles.label}>
      {label}
    </label>
    <input 
      className={error ? formStyles.inputError : formStyles.input}
      {...inputProps}
    />
    {error && (
      <p className={formStyles.error}>{error}</p>
    )}
  </div>
)

export default function StyleGuide() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Tailwind CSS Style Guide
        </h1>
        <p className="text-gray-600">
          This guide demonstrates how to use utility-first classes instead of custom CSS.
        </p>
      </div>
      
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Buttons</h2>
        <ButtonExamples />
      </section>
      
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Forms</h2>
        <FormExamples />
      </section>
      
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Badges</h2>
        <BadgeExamples />
      </section>
      
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cards</h2>
        <CardExamples />
      </section>
      
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tables</h2>
        <TableExamples />
      </section>
      
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Layouts</h2>
        <LayoutExamples />
      </section>
    </div>
  )
}