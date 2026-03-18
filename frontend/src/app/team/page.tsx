import { getTeam } from "@/lib/api";
import TeamPageClient from "@/components/TeamPageClient";

export const revalidate = 0;

export default async function TeamPage() {
  let members = [];
  try {
    members = await getTeam();
  } catch {
    // will show empty state on client
  }

  return <TeamPageClient initialMembers={members} />;
}
