import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import PresetQuestionManager from "@/components/admin/PresetQuestionManager";

export const metadata = { title: "Preset questions" };

export default async function PresetQuestionsPage() {
  const questions = await prisma.presetQuestion.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <PageHeader
        title="Preset questions"
        description="Curated questions shown as one-click shortcuts on the Ask page."
      />
      <PresetQuestionManager initialQuestions={questions} />
    </div>
  );
}
