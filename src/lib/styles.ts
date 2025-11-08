// Tailwind CSS Utility Classes for Complaint Module
// Pure utility-first approach - no custom CSS needed

export const buttonStyles = {
  // Base button styles
  base: "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  
  // Button variants
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
  secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-500",
  danger: "bg-danger-600 text-white hover:bg-danger-700 focus-visible:ring-danger-500",
  success: "bg-success-600 text-white hover:bg-success-700 focus-visible:ring-success-500",
  
  // Button sizes
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 py-2",
  lg: "h-10 px-8 py-2",
  xl: "h-12 px-10 py-3 text-base",
}

export const formStyles = {
  // Form input styles
  input: "block w-full rounded-md border-gray-300 shadow-sm transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 sm:text-sm",
  inputError: "block w-full rounded-md border-danger-300 shadow-sm focus:border-danger-500 focus:ring-1 focus:ring-danger-500 sm:text-sm",
  
  // Form labels
  label: "block text-sm font-medium text-gray-700 mb-1",
  labelRequired: "block text-sm font-medium text-gray-700 mb-1 after:content-['*'] after:ml-1 after:text-danger-500",
  
  // Form errors
  error: "text-sm text-danger-600 mt-1",
  
  // Form groups
  group: "space-y-1",
  groupInline: "flex items-center space-x-3",
}

export const cardStyles = {
  // Card containers
  base: "bg-white rounded-lg border border-gray-200 shadow-sm",
  interactive: "bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
  
  // Card sections
  header: "px-6 py-4 border-b border-gray-200",
  body: "px-6 py-4",
  footer: "px-6 py-4 border-t border-gray-200 bg-gray-50",
}

export const tableStyles = {
  // Table elements
  container: "overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg",
  table: "min-w-full divide-y divide-gray-200",
  
  // Table sections
  header: "bg-gray-50",
  headerCell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
  body: "bg-white divide-y divide-gray-200",
  cell: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
  cellMuted: "px-6 py-4 whitespace-nowrap text-sm text-gray-500",
}

export const badgeStyles = {
  // Base badge
  base: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  
  // Status badges
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  inReview: "bg-yellow-100 text-yellow-800", 
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  
  // Confidence badges
  highConfidence: "bg-green-100 text-green-800 border border-green-200",
  mediumConfidence: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  lowConfidence: "bg-red-100 text-red-800 border border-red-200",
  
  // Size variants
  sm: "px-2 py-1 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
}

export const layoutStyles = {
  // Container styles
  container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  containerNarrow: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",
  containerWide: "max-w-full mx-auto px-4 sm:px-6 lg:px-8",
  
  // Grid layouts
  grid1: "grid grid-cols-1 gap-6",
  grid2: "grid grid-cols-1 sm:grid-cols-2 gap-6",
  grid3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
  grid4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
  
  // Flex layouts
  flexBetween: "flex items-center justify-between",
  flexCenter: "flex items-center justify-center",
  flexStart: "flex items-center justify-start",
  flexEnd: "flex items-center justify-end",
}

export const textStyles = {
  // Headings
  h1: "text-3xl font-bold text-gray-900 sm:text-4xl",
  h2: "text-2xl font-bold text-gray-900 sm:text-3xl",
  h3: "text-xl font-semibold text-gray-900 sm:text-2xl",
  h4: "text-lg font-semibold text-gray-900 sm:text-xl",
  
  // Body text
  body: "text-sm text-gray-600",
  bodyLarge: "text-base text-gray-600",
  bodySmall: "text-xs text-gray-500",
  
  // Status text
  muted: "text-gray-500",
  success: "text-success-600",
  warning: "text-warning-600",
  danger: "text-danger-600",
  primary: "text-primary-600",
}

export const animationStyles = {
  // Fade animations
  fadeIn: "animate-fade-in",
  slideUp: "animate-slide-up",
  
  // Transition classes
  transition: "transition-all duration-200 ease-in-out",
  transitionFast: "transition-all duration-150 ease-in-out",
  transitionSlow: "transition-all duration-300 ease-in-out",
  
  // Hover effects
  hoverLift: "hover:transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200",
  hoverScale: "hover:scale-105 transition-transform duration-200",
}

// Utility function to combine classes
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ')
}

// Helper function for button combinations
export const getButtonClasses = (
  variant: keyof typeof buttonStyles = 'primary',
  size: keyof typeof buttonStyles = 'md',
  additionalClasses?: string
) => {
  return cn(
    buttonStyles.base,
    buttonStyles[variant],
    buttonStyles[size],
    additionalClasses
  )
}

// Helper function for badge combinations
export const getBadgeClasses = (
  variant: keyof typeof badgeStyles,
  size: keyof typeof badgeStyles = 'md',
  additionalClasses?: string
) => {
  return cn(
    badgeStyles.base,
    badgeStyles[variant],
    size !== 'md' ? badgeStyles[size] : '',
    additionalClasses
  )
}