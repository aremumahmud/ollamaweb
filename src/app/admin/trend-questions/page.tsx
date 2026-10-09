import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import PresetQuestionManager from "@/components/admin/PresetQuestionManager";

export const metadata = { title: "Trend questions" };

export default async function TrendQuestionsPage() {
  const questions = await prisma.trendPresetQuestion.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <PageHeader
        title="Trend questions"
        description="Answered in order after every trend-analysis summary. Separate from the Ask page's preset questions."
      />
      <PresetQuestionManager initialQuestions={questions} apiBase="/api/admin/trend-questions" />
    </div>
  );
}
