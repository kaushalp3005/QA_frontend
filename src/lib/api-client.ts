import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Complaint,
  ComplaintCreate,
  ComplaintUpdate,
  AIExtractionPayload,
  AIExtractionResult,
  FileUpload,
  ListResponse,
  ErrorResponse,
  ComplaintSource,
  ComplaintStatus,
} from '@/types';

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        if (error.response?.data?.error) {
          throw new APIError(
            error.response.data.error.message,
            error.response.data.error.code,
            error.response.status,
            error.response.data.error.details
          );
        }
        throw error;
      }
    );
  }

  private getAuthToken(): string | null {
    // In a real app, this would get the token from localStorage, cookies, or auth context
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  // Complaints API
  async createComplaint(data: ComplaintCreate): Promise<Complaint> {
    const response = await this.client.post<Complaint>('/complaints', data);
    return response.data;
  }

  async getComplaints(params?: {
    status?: ComplaintStatus;
    source?: ComplaintSource;
    q?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ListResponse<Complaint>> {
    const response = await this.client.get<ListResponse<Complaint>>('/complaints', {
      params,
    });
    return response.data;
  }

  async getComplaint(id: string): Promise<Complaint> {
    const response = await this.client.get<Complaint>(`/complaints/${id}`);
    return response.data;
  }

  async updateComplaint(id: string, data: ComplaintUpdate): Promise<Complaint> {
    const response = await this.client.patch<Complaint>(`/complaints/${id}`, data);
    return response.data;
  }

  // AI Extraction API
  async extractComplaintData(payload: AIExtractionPayload): Promise<AIExtractionResult> {
    const response = await this.client.post<AIExtractionResult>('/ai/extract', payload);
    return response.data;
  }

  // File Upload API
  async uploadFile(file: File): Promise<FileUpload> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<FileUpload>('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Create a default client instance
export const apiClient = new APIClient();

// Export the class for testing or custom instances
export { APIClient };