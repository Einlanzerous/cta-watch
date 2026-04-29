import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export interface PollingState<T> {
  data: Ref<T>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  defaultValue: T
): PollingState<T> {
  const data = ref<T>(defaultValue) as Ref<T>;
  const loading = ref(true);
  const error = ref<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function refresh() {
    try {
      error.value = null;
      data.value = await fetcher();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    refresh();
    timer = setInterval(refresh, intervalMs);
  });

  onUnmounted(() => {
    if (timer !== null) clearInterval(timer);
  });

  return { data, loading, error, refresh };
}
