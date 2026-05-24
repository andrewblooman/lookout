import { MapCard } from "@/components/dashboard/MapCard";
import { NewsCard } from "@/components/dashboard/NewsCard";
import { TrendingAttacksCard } from "@/components/dashboard/TrendingAttacksCard";
import { CVECard } from "@/components/dashboard/CVECard";

export default function DashboardPage() {
  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <MapCard />
        <NewsCard />
        <TrendingAttacksCard />
        <CVECard />
      </div>
    </div>
  );
}
