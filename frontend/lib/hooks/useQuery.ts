import { useQuery as useTanQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Actor, Campaign, IOC, CVE, NewsArticle, Feed,
  DashboardSummary, HeatmapPoint, Paginated, IOCSummary,
} from "@/types";

// Dashboard
export const useDashboardSummary = () =>
  useTanQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api.get("/api/v1/dashboard/summary"),
    refetchInterval: 60_000,
  });

export const useHeatmap = () =>
  useTanQuery<{ points: HeatmapPoint[] }>({
    queryKey: ["dashboard", "heatmap"],
    queryFn: () => api.get("/api/v1/dashboard/heatmap"),
    staleTime: 300_000,
  });

// Actors
export const useActors = (params?: Record<string, string | number>) =>
  useTanQuery<Paginated<Actor>>({
    queryKey: ["actors", params],
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return api.get(`/api/v1/actors${qs}`);
    },
  });

// Campaigns
export const useCampaigns = (params?: Record<string, string | number>) =>
  useTanQuery<Paginated<Campaign>>({
    queryKey: ["campaigns", params],
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return api.get(`/api/v1/campaigns${qs}`);
    },
  });

// IOCs
export const useIOCSummary = () =>
  useTanQuery<IOCSummary>({
    queryKey: ["iocs", "summary"],
    queryFn: () => api.get("/api/v1/iocs/summary"),
    staleTime: 60_000,
  });

export const useIOCs = (params?: Record<string, string | number>) =>
  useTanQuery<Paginated<IOC>>({
    queryKey: ["iocs", params],
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return api.get(`/api/v1/iocs${qs}`);
    },
  });

// CVEs
export const useCVEs = (params?: Record<string, string | number>) =>
  useTanQuery<Paginated<CVE>>({
    queryKey: ["cves", params],
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return api.get(`/api/v1/cves${qs}`);
    },
  });

// News
export const useNews = (params?: Record<string, string | number>) =>
  useTanQuery<Paginated<NewsArticle>>({
    queryKey: ["news", params],
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return api.get(`/api/v1/news${qs}`);
    },
  });

// Feeds
export const useFeeds = () =>
  useTanQuery<Paginated<Feed>>({
    queryKey: ["feeds"],
    queryFn: () => api.get("/api/v1/feeds"),
  });

export const useCreateFeed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => api.post<Feed>("/api/v1/feeds", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feeds"] }),
  });
};

export const useUpdateFeed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.put<Feed>(`/api/v1/feeds/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feeds"] }),
  });
};

export const useDeleteFeed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/feeds/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feeds"] }),
  });
};

export const useTriggerFeed = () =>
  useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/feeds/${id}/trigger`),
  });
