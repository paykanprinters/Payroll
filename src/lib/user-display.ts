export type UserLabel = {
  name: string;
  email?: string | null;
};

/** Show the person's account name. Never fall back to the database id. */
export function userDisplayName(
  userId: string | null | undefined,
  directory: ReadonlyMap<string, UserLabel>
): string {
  if (!userId) return "—";
  const person = directory.get(userId);
  const name = person?.name?.trim();
  if (name) return name;
  const email = person?.email?.trim();
  if (email) return email;
  return "Unknown user";
}
