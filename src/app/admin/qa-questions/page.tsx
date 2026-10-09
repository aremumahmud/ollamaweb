import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import QaPresetManager from "@/components/admin/QaPresetManager";

export const metadata = { title: "QA questions" };

export default async function QaQuestionsPage() {
  const questions = await prisma.qaPreset.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <PageHeader
        title="QA questions"
        description="Rubric-based questions used to check uploaded patient documents pass/fail."
      />
      <QaPresetManager initialQuestions={questions} />
    </div>
  );
}
