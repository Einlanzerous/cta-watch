import { ref } from 'vue';
import { apiFetch } from '@/api/client';
import type { LineDetail, LineId } from '@/types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — matches the on-time poll interval

const cache = new Map<LineId, { data: LineDetail; fetchedAt: number }>();

export function useLineDetail() {
  const detail = ref<LineDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchDetail(lineId: LineId) {
    const cached = cache.get(lineId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      detail.value = cached.data;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const data = await apiFetch<LineDetail>(`/api/line/${lineId}`);
      cache.set(lineId, { data, fetchedAt: Date.now() });
      detail.value = data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  function invalidate(lineId?: LineId) {
    if (lineId) cache.delete(lineId);
    else cache.clear();
  }

  function prefetch(lineId: LineId) {
    const cached = cache.get(lineId);
    if (!cached || Date.now() - cached.fetchedAt >= CACHE_TTL_MS) fetchDetail(lineId);
  }

  return { detail, loading, error, fetchDetail, invalidate, prefetch };
}
