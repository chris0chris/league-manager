/**
 * Designer API Client
 *
 * API client for communicating with the Django Gameday Designer backend.
 * Provides methods for CRUD operations on schedule templates and related actions.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ScheduleTemplate,
  ValidationResult,
  ApplicationResult,
  PaginatedResponse,
  ApplyTemplateRequest,
  CloneTemplateRequest,
  TemplatePreview,
  TemplateUsage,
} from '../types';

/**
 * API client class for Gameday Designer backend operations.
 */
class DesignerApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api/designer',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token if available
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      return config;
    });

    // Error interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          window.location.href = '/accounts/login/';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * List all schedule templates with optional filters.
   *
   * @param params - Optional filter parameters
   * @param params.association - Filter by association ID
   * @param params.search - Search query for template name
   * @returns Paginated list of templates
   */
  async listTemplates(params?: {
    association?: number;
    search?: string;
  }): Promise<PaginatedResponse<ScheduleTemplate>> {
    const response = await this.client.get<PaginatedResponse<ScheduleTemplate>>(
      '/templates/',
      { params }
    );
    return response.data;
  }

  /**
   * Get a single schedule template by ID.
   *
   * @param id - Template ID
   * @returns Template with all slots and update rules
   */
  async getTemplate(id: number): Promise<ScheduleTemplate> {
    const response = await this.client.get<ScheduleTemplate>(
      `/templates/${id}/`
    );
    return response.data;
  }

  /**
   * Create a new schedule template.
   *
   * @param data - Template data
   * @returns Created template
   */
  async createTemplate(
    data: Partial<ScheduleTemplate>
  ): Promise<ScheduleTemplate> {
    const response = await this.client.post<ScheduleTemplate>(
      '/templates/',
      data
    );
    return response.data;
  }

  /**
   * Update an existing template (full update with PUT).
   *
   * @param id - Template ID
   * @param data - Updated template data
   * @returns Updated template
   */
  async updateTemplate(
    id: number,
    data: Partial<ScheduleTemplate>
  ): Promise<ScheduleTemplate> {
    const response = await this.client.put<ScheduleTemplate>(
      `/templates/${id}/`,
      data
    );
    return response.data;
  }

  /**
   * Partially update a template (PATCH).
   *
   * @param id - Template ID
   * @param data - Fields to update
   * @returns Updated template
   */
  async patchTemplate(
    id: number,
    data: Partial<ScheduleTemplate>
  ): Promise<ScheduleTemplate> {
    const response = await this.client.patch<ScheduleTemplate>(
      `/templates/${id}/`,
      data
    );
    return response.data;
  }

  /**
   * Delete a schedule template.
   *
   * @param id - Template ID
   */
  async deleteTemplate(id: number): Promise<void> {
    await this.client.delete(`/templates/${id}/`);
  }

  /**
   * Validate a schedule template.
   *
   * @param id - Template ID
   * @returns Validation result with errors and warnings
   */
  async validateTemplate(id: number): Promise<ValidationResult> {
    const response = await this.client.get<ValidationResult>(
      `/templates/${id}/validate/`
    );
    return response.data;
  }

  /**
   * Apply a template to a gameday.
   *
   * @param id - Template ID
   * @param data - Application request with gameday ID and team mapping
   * @returns Application result with success status and created objects
   */
  async applyTemplate(
    id: number,
    data: ApplyTemplateRequest
  ): Promise<ApplicationResult> {
    const response = await this.client.post<ApplicationResult>(
      `/templates/${id}/apply/`,
      data
    );
    return response.data;
  }

  /**
   * Clone a template with a new name.
   *
   * @param id - Template ID to clone
   * @param data - Clone request with new name and optional association
   * @returns Cloned template
   */
  async cloneTemplate(
    id: number,
    data: CloneTemplateRequest
  ): Promise<ScheduleTemplate> {
    const response = await this.client.post<ScheduleTemplate>(
      `/templates/${id}/clone/`,
      data
    );
    return response.data;
  }

  /**
   * Preview how a template would be applied to a gameday.
   *
   * @param id - Template ID
   * @param gamedayId - Gameday ID to preview against
   * @returns Preview data showing how games would be created
   */
  async previewTemplate(id: number, gamedayId: number): Promise<TemplatePreview> {
    const response = await this.client.get<TemplatePreview>(
      `/templates/${id}/preview/`,
      {
        params: { gameday_id: gamedayId },
      }
    );
    return response.data;
  }

  /**
   * Get usage statistics for a template.
   *
   * @param id - Template ID
   * @returns Usage data showing which gamedays use this template
   */
  async getTemplateUsage(id: number): Promise<TemplateUsage> {
    const response = await this.client.get<TemplateUsage>(
      `/templates/${id}/usage/`
    );
    return response.data;
  }
}

/**
 * Singleton instance of the API client.
 * Import and use this instance throughout the application.
 *
 * @example
 * ```typescript
 * import { designerApi } from './api/designerApi';
 *
 * const templates = await designerApi.listTemplates();
 * const template = await designerApi.getTemplate(1);
 * ```
 */
export const designerApi = new DesignerApi();
