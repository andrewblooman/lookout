import { GlobeCard } from "@/components/dashboard/GlobeCard";
import { NewsCard } from "@/components/dashboard/NewsCard";
import { CampaignsCard } from "@/components/dashboard/CampaignsCard";
import { CVECard } from "@/components/dashboard/CVECard";

export default function DashboardPage() {
  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <GlobeCard />
        <NewsCard />
        <CampaignsCard />
        <CVECard />
      </div>
    </div>
  );
}
