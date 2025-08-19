
import CompanyOverviewCards from '@/components/CompanyOverviewCard';

export default function Home() {
  return (
    <div className="mx-auto max-w-[672px] px-4 py-8 md:py-12">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Welcome to your Aigency dashboard
      </p>
      <div className="mt-6">
        <CompanyOverviewCards />
      </div>
    </div>
  );
}
