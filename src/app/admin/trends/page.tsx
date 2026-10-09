import PageHeader from "@/components/layout/PageHeader";
import AdminTrendAsk from "@/components/admin/AdminTrendAsk";

export const metadata = { title: "Trends" };

export default function AdminTrendsPage() {
  return (
    <div>
      <PageHeader
        title="Trends"
        description="Ask a question and every patient's notes are checked individually for an accurate count — not approximate search, so it's safe for questions like “how many patients had X”."
      />
      <AdminTrendAsk />
    </div>
  );
}
