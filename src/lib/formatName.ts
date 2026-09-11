import type { Person } from "@/types/person";

export function fullName(
  person: Pick<Person, "firstName" | "middleName" | "lastName">,
): string {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}
