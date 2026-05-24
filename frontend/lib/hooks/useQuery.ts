import { useQuery as useTanQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Actor, Campaign, IOC, CVE, NewsArticle, Feed,
  DashboardSummary, HeatmapPoint, Paginated, IOCSummary,
  GraphData, Report, ReportCreate,
  TrendingAttack,
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

// Trending attacks
export const useTrending = () =>
  useTanQuery<TrendingAttack[]>({
    queryKey: ["trending"],
    queryFn: () => api.get("/api/v1/dashboard/trending"),
    staleTime: 300_000,
    refetchInterval: 3_600_000,
  });

export const useTrendDetail = (id: string) =>
  useTanQuery<TrendingAttack>({
    queryKey: ["trending", id],
    queryFn: () => api.get(`/api/v1/dashboard/trending/${id}`),
    enabled: !!id,
    staleTime: 300_000,
  });

// Graph
export const useGraph = () =>
  useTanQuery<GraphData>({
    queryKey: ["graph"],
    queryFn: () => api.get("/api/v1/graph"),
    staleTime: 300_000,
  });

// Reports
export const useReports = (params?: Record<string, string | number>) =>
  useTanQuery<Paginated<Report>>({
    queryKey: ["reports", params],
    queryFn: () => {
      const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
      return api.get(`/api/v1/reports${qs}`);
    },
  });

export const useCreateReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReportCreate) => api.post<Report>("/api/v1/reports", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
};

export const useUpdateReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ReportCreate> }) =>
      api.put<Report>(`/api/v1/reports/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
};

export const useDeleteReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/reports/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
};
