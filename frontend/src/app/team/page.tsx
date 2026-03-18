import { getTeam, TeamMember } from "@/lib/api";
import TeamPageClient from "@/components/TeamPageClient";

export const revalidate = 0;

export default async function TeamPage() {
  let members: TeamMember[] = [];
  try {
    members = await getTeam();
  } catch {
    // will show empty state on client
  }

  return <TeamPageClient initialMembers={members} />;
}