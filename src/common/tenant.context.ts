import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  restaurantId: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();
