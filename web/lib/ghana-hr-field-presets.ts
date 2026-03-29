/**
 * Default department and job-title suggestions for add-employee UX (merged with company data in field-options API).
 */
export const GHANA_DEPARTMENT_PRESETS: string[] = [
  "Executive Office",
  "Human Resources",
  "Finance & Accounts",
  "Operations",
  "Sales & Marketing",
  "Business Development",
  "Customer Service",
  "IT & Systems",
  "Legal & Compliance",
  "Procurement",
  "Warehouse & Logistics",
  "Manufacturing / Production",
  "Quality Assurance",
  "Engineering",
  "Projects",
  "Administration",
  "Front Desk / Reception",
  "Security",
  "Facilities & Maintenance",
  "Health, Safety & Environment (HSE)",
  "Research & Development",
  "Field Operations",
  "Branch / Retail",
  "Call Centre",
  "Training & Development",
  "Internal Audit",
  "Drivers & Transport",
  "Catering / Kitchen",
  "Medical / Clinic",
  "Interns & National Service",
  "Contractors Pool",
].sort((a, b) => a.localeCompare(b));

export const GHANA_JOB_TITLE_PRESETS: string[] = [
  "Chief Executive Officer",
  "Managing Director",
  "General Manager",
  "Operations Manager",
  "Finance Manager",
  "HR Manager",
  "Administration Manager",
  "Sales Manager",
  "Marketing Manager",
  "IT Manager",
  "Accountant",
  "Senior Accountant",
  "Accounts Officer",
  "Payroll Officer",
  "HR Officer",
  "Administrative Assistant",
  "Executive Assistant",
  "Office Manager",
  "Warehouse Supervisor",
  "Storekeeper",
  "Procurement Officer",
  "Sales Executive",
  "Business Development Executive",
  "Customer Service Representative",
  "Driver",
  "Security Officer",
  "Cleaner / Janitor",
  "Receptionist",
  "Data Entry Clerk",
  "Secretary",
  "Legal Officer",
  "Compliance Officer",
  "Project Manager",
  "Site Engineer",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Civil Engineer",
  "Production Supervisor",
  "Machine Operator",
  "Quality Control Officer",
  "Nurse / Clinic Assistant",
  "Teacher / Trainer",
  "Intern",
  "National Service Personnel",
  "Contractor / Consultant",
  "Other",
].sort((a, b) => a.localeCompare(b));

function mergeUnique(existing: string[], presets: string[]): string[] {
  const set = new Set<string>();
  for (const p of presets) set.add(p);
  for (const e of existing) {
    const t = e.trim();
    if (t) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function mergeDepartmentOptions(fromDb: string[]): string[] {
  return mergeUnique(fromDb, GHANA_DEPARTMENT_PRESETS);
}

export function mergeJobTitleOptions(fromDb: string[]): string[] {
  return mergeUnique(fromDb, GHANA_JOB_TITLE_PRESETS);
}
