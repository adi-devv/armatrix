export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url?: string;
  linkedin?: string;
  twitter?: string;
  tags?: string[];
}

export type TeamMemberInput = Omit<TeamMember, "id">;

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getTeam(): Promise<TeamMember[]> {
  const res = await fetch(`${API_BASE}/team`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
}

export async function getMember(id: string): Promise<TeamMember> {
  const res = await fetch(`${API_BASE}/team/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch member");
  return res.json();
}

export async function createMember(data: TeamMemberInput): Promise<TeamMember> {
  const res = await fetch(`${API_BASE}/team`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create member");
  return res.json();
}

export async function updateMember(id: string, data: TeamMemberInput): Promise<TeamMember> {
  const res = await fetch(`${API_BASE}/team/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update member");
  return res.json();
}

export async function deleteMember(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/team/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete member");
}
