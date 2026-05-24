export interface Actor {
  id: string;
  name: string;
  aliases: string[];
  origin_country: string | null;
  motivation: string | null;
  description: string | null;
  mitre_group_id: string | null;
  first_seen: string | null;
  last_seen: string | null;
  source: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  actor_id: string | null;
  status: string;
  campaign_type: string | null;
  target_sectors: string[];
  target_regions: string[];
  affected_organizations: string[];
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  source: string | null;
  created_at: string;
}

export interface IOC {
  id: string;
  type: string;
  value: string;
  confidence: number;
  first_seen: string | null;
  last_seen: string | null;
  actor_id: string | null;
  campaign_id: string | null;
  source: string | null;
  tags: string[];
  created_at: string;
}

export interface CVE {
  id: string;
  cve_id: string;
  description: string | null;
  cvss_score: number | null;
  cvss_vector: string | null;
  severity: string | null;
  published_at: string | null;
  updated_at: string | null;
  kev_status: boolean;
  kev_due_date: string | null;
  affected_products: string[];
  exploit_maturity: string;
  source: string | null;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source_name: string | null;
  published_at: string | null;
  summary: string | null;
  extracted_actors: string[];
  extracted_cves: string[];
  extracted_malware: string[];
  tags: string[];
  created_at: string;
}

export interface Feed {
  id: string;
  name: string;
  feed_type: string;
  url: string;
  has_token: boolean;
  enabled: boolean;
  poll_interval_hours: number;
  last_ingested_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface DashboardSummary {
  threat_level: string;
  actor_count: number;
  active_campaign_count: number;
  ioc_count: number;
  kev_cve_count: number;
  critical_kev_count: number;
}

export interface HeatmapPoint {
  country: string;
  lat: number;
  lon: number;
  count: number;
  label: string;
}

export interface Paginated<T> {
  total: number;
  items: T[];
}

export interface IOCSummary {
  by_type: Record<string, number>;
  total: number;
}

export interface GraphNode {
  id: string;
  type: "actor" | "campaign" | "ioc";
  label: string;
  meta: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Report {
  id: string;
  title: string;
  description: string | null;
  published_at: string | null;
  status: string;
  tlp_level: string;
  author: string | null;
  actor_ids: string[];
  campaign_ids: string[];
  ioc_ids: string[];
  cve_ids: string[];
  created_at: string;
}

export interface TrendArticle {
  id: string;
  title: string;
  url: string;
  source_name: string | null;
  published_at: string | null;
  summary: string | null;
}

export interface TrendActor {
  id: string;
  name: string;
  origin_country: string | null;
  motivation: string | null;
  mitre_group_id: string | null;
}

export interface TrendCVE {
  id: string;
  cve_id: string;
  description: string | null;
  severity: string | null;
  cvss_score: number | null;
  kev_status: boolean;
}

export interface TrendIOC {
  id: string;
  type: string;
  value: string;
  confidence: number;
  tags: string[];
}

export interface TrendingAttack {
  id: string;
  topic: string;
  topic_type: string;
  severity: string;
  article_count: number;
  summary: string;
  articles: TrendArticle[];
  actors: TrendActor[];
  cves: TrendCVE[];
  iocs: TrendIOC[];
  last_seen: string;
}

export interface Malware {
  id: string;
  name: string;
  aliases: string[];
  category: string | null;
  description: string | null;
  first_seen: string | null;
  last_seen: string | null;
  actor_id: string | null;
  campaign_id: string | null;
  source: string | null;
  created_at: string;
}

export interface ReportCreate {
  title: string;
  description?: string;
  published_at?: string;
  status?: string;
  tlp_level?: string;
  author?: string;
  actor_ids?: string[];
  campaign_ids?: string[];
  ioc_ids?: string[];
  cve_ids?: string[];
}
