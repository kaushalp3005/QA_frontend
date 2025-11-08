import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Configure route to handle large files
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const complaintId = formData.get('complaintId') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!complaintId) {
      return NextResponse.json(
        { success: false, error: 'No complaint ID provided' },
        { status: 400 }
      )
    }

    // Validate file type (video only)
    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, error: 'Only video files are allowed' },
        { status: 400 }
      )
    }

    // NO SIZE LIMIT - Accept any video size

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create upload directory structure: public/uploads/sample-videos/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sample-videos')
    
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Generate unique filename with timestamp and complaint ID
    const timestamp = Date.now()
    const fileExtension = path.extname(file.name)
    const fileName = `${complaintId}_${timestamp}${fileExtension}`
    const filePath = path.join(uploadDir, fileName)

    // Write file to disk
    await writeFile(filePath, buffer)

    // Return the public URL path
    const publicPath = `/uploads/sample-videos/${fileName}`

    return NextResponse.json({
      success: true,
      data: {
        path: publicPath,
        fileName: fileName,
        size: file.size,
        type: file.type,
        complaintId: complaintId
      }
    })

  } catch (error) {
    console.error('Error uploading sample video:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload video' },
      { status: 500 }
    )
  }
}
