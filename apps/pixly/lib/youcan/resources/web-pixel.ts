import type { WebPixel } from '../types';

export class WebPixelResource {
  constructor(private request: <T>(endpoint: string, options?: any) => Promise<T>) {}

  /**
   * The app's web pixel on this store, or null when it has none.
   * Required scope: `view-pixels`
   */
  public async get(): Promise<WebPixel | null> {
    try {
      return await this.request<WebPixel>('/web-pixels');
    }
    catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Turns the app's web pixel extension on for this store.
   * Required scopes: `edit-pixels`, `view-customer-events`
   */
  public async create(settings: Record<string, string>): Promise<WebPixel> {
    return this.request<WebPixel>('/web-pixels', {
      method: 'POST',
      body: { settings },
    });
  }

  public async update(id: string, settings: Record<string, string>): Promise<WebPixel> {
    return this.request<WebPixel>(`/web-pixels/${id}`, {
      method: 'PUT',
      body: { settings },
    });
  }

  /**
   * Required scope: `edit-pixels`
   */
  public async delete(id: string): Promise<void> {
    return this.request<void>(`/web-pixels/${id}`, {
      method: 'DELETE',
    });
  }
}
