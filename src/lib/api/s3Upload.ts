/**
 * S3 Image Upload Utility
 * Handles uploading complaint images to S3 via backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface UploadImageResponse {
  success: boolean
  message: string
  urls: string[]
}

/**
 * Upload complaint images to S3
 * @param files - Array of File objects to upload
 * @param company - Company code (CDPL or CFPL)
 * @returns Promise with S3 URLs
 */
export async function uploadComplaintImages(
  files: File[],
  company: 'CDPL' | 'CFPL'
): Promise<string[]> {
  console.log('🚀 uploadComplaintImages CALLED with', files.length, 'files')
  try {
    if (!files || files.length === 0) {
      throw new Error('No files provided')
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type: ${file.name}. Only images are allowed.`)
      }
    }

    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024 // 10MB
    for (const file of files) {
      if (file.size > maxSize) {
        throw new Error(`File too large: ${file.name}. Maximum size is 10MB.`)
      }
    }

    // Create FormData
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    console.log('📦 FormData created with', files.length, 'files')

    // Get auth token
    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('Authentication required')
    }

    // Upload to backend
    console.log('🌐 Sending POST request to backend...')
    const response = await fetch(
      `${API_BASE_URL}/upload-complaint-images?company=${company}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    )
    console.log('📡 Response received, status:', response.status)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to upload images')
    }

    const data: UploadImageResponse = await response.json()
    console.log('📥 Response data:', data)
    console.log('📥 URLs received:', data.urls)
    
    if (!data.success || !data.urls) {
      throw new Error(data.message || 'Failed to upload images')
    }

    return data.urls

  } catch (error) {
    console.error('Error uploading images to S3:', error)
    throw error
  }
}

/**
 * Delete image from S3
 * @param imageUrl - S3 URL of the image to delete
 */
export async function deleteComplaintImage(imageUrl: string): Promise<boolean> {
  try {
    // Get auth token
    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('Authentication required')
    }

    // Delete from backend/S3
    const response = await fetch(
      `${API_BASE_URL}/delete-s3-image?url=${encodeURIComponent(imageUrl)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete image')
    }

    return true

  } catch (error) {
    console.error('Error deleting image from S3:', error)
    throw error
  }
}

/**
 * Convert File to base64 for preview
 * @param file - File object
 * @returns Promise with base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

/**
 * Validate image file
 * @param file - File object to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return 'Only image files (JPEG, PNG, GIF, WebP) are allowed'
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return 'File size must be less than 10MB'
  }

  return null
}
