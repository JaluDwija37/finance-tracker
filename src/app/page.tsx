import { requireUser } from "@/lib/session";
import { getWorkspaceData } from "@/lib/workspace-data";
import { jakartaToday } from "@/lib/finance";
import { FinanceWorkspace, type View } from "./workspace";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string; section?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const views: View[] = ["home", "transactions", "budget", "goals", "more"];
  const initialView = views.includes(params.view as View) ? params.view as View : "home";
  return <FinanceWorkspace data={await getWorkspaceData(user.id)} today={jakartaToday()} initialView={initialView} initialSection={params.section} />;
}
