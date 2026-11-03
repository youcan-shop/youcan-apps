import type { CreateMetafieldRequest, Metafield, MetafieldResource as MetafieldResourceName } from '../types';

export class MetafieldResource {
  constructor(private request: <T>(endpoint: string, options?: any) => Promise<T>) {}

  public async list(resource: MetafieldResourceName, id: string): Promise<Metafield[]> {
    const res = await this.request<Metafield[] | { data: Metafield[] }>(`/${resource}/${id}/metafields`);

    return Array.isArray(res) ? res : (res?.data ?? []);
  }

  public async upsert(resource: MetafieldResourceName, id: string, data: CreateMetafieldRequest): Promise<Metafield> {
    return this.request<Metafield>(`/${resource}/${id}/metafields`, {
      method: 'POST',
      body: data,
    });
  }

  public async deleteByKey(resource: MetafieldResourceName, id: string, namespace: string, key: string): Promise<void> {
    return this.request<void>(`/${resource}/${id}/metafields/${namespace}_${key}`, {
      method: 'DELETE',
    });
  }
}
