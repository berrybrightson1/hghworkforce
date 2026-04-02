/**
 * Preset copy for onboarding template UI (combobox + starters). No DB seed required.
 */

export const TEMPLATE_NAME_SUGGESTIONS = [
  "Standard onboarding",
  "Office & professional roles",
  "Sales & field team",
  "Graduate / intern programme",
  "Remote-first onboarding",
  "Contractor & fixed-term",
] as const;

export const TASK_TITLE_SUGGESTIONS = [
  "Complete HR paperwork",
  "Submit ID, tax, and SSNIT details",
  "Set up company email and accounts",
  "Read the employee handbook",
  "Attend orientation / welcome session",
  "Health & safety briefing",
  "Meet your line manager",
  "Confirm payroll bank details",
  "Collect equipment and access card",
  "Register for leave and attendance tools",
  "Probation goals discussion",
  "Complete compliance training",
] as const;

export const TASK_DESCRIPTION_SUGGESTIONS = [
  "Sign contracts, policies, and personal information forms in HR or the portal.",
  "Upload verified ID and ensure PAYE/SSNIT information matches payroll records.",
  "IT creates accounts; employee verifies login and sets up MFA if required.",
  "Acknowledge key policies: conduct, leave, expenses, and data protection.",
  "Scheduled session covering culture, teams, and who to contact for help.",
  "Site-specific risks, exits, first aid, and reporting incidents.",
  "30-minute intro with manager: expectations, cadence, and first-week goals.",
  "Confirm the bank account salary will be paid to; report any changes early.",
  "Laptop, phone, keys, or uniforms issued and signed for.",
  "Show how to request leave, view payslips, and clock in if applicable.",
  "Agree measurable objectives for the probation period.",
  "Finish any mandatory online modules assigned by HR.",
] as const;

export const DUE_DAY_PRESETS = [1, 3, 5, 7, 14, 21, 30, 45, 60] as const;

export type StarterTask = {
  title: string;
  description: string;
  dueAfterDays: number;
  isRequired: boolean;
};

export type OnboardingStarterTemplate = {
  id: string;
  name: string;
  summary: string;
  suggestDefault: boolean;
  tasks: StarterTask[];
};

export const ONBOARDING_STARTER_TEMPLATES: OnboardingStarterTemplate[] = [
  {
    id: "standard-office",
    name: "Standard office onboarding",
    summary: "Paperwork, systems access, handbook, and manager intro for desk-based roles.",
    suggestDefault: true,
    tasks: [
      {
        title: "Complete HR paperwork",
        description: "Sign contracts and policies; confirm personal details for payroll.",
        dueAfterDays: 3,
        isRequired: true,
      },
      {
        title: "Submit ID, tax, and SSNIT details",
        description: "Upload verified ID and ensure tax information is complete for PAYE.",
        dueAfterDays: 5,
        isRequired: true,
      },
      {
        title: "Set up company email and accounts",
        description: "Activate IT accounts, VPN if needed, and verify MFA.",
        dueAfterDays: 7,
        isRequired: true,
      },
      {
        title: "Read the employee handbook",
        description: "Review leave rules, expenses, conduct, and escalation paths.",
        dueAfterDays: 7,
        isRequired: true,
      },
      {
        title: "Meet your line manager",
        description: "Introduction session: goals, communication rhythm, and first-month priorities.",
        dueAfterDays: 14,
        isRequired: true,
      },
    ],
  },
  {
    id: "field-sales",
    name: "Sales & field team",
    summary: "Mobile staff: safety, travel, client tools, and expense policy.",
    suggestDefault: false,
    tasks: [
      {
        title: "Health & safety briefing",
        description: "Field hazards, lone working, and incident reporting.",
        dueAfterDays: 3,
        isRequired: true,
      },
      {
        title: "Collect equipment and access card",
        description: "Phone, tablet, or vehicle handover where applicable.",
        dueAfterDays: 5,
        isRequired: true,
      },
      {
        title: "Read the employee handbook",
        description: "Focus on travel, expenses, and client-facing conduct.",
        dueAfterDays: 7,
        isRequired: true,
      },
      {
        title: "Complete compliance training",
        description: "Any product, AML, or industry modules assigned by HR.",
        dueAfterDays: 14,
        isRequired: true,
      },
    ],
  },
  {
    id: "graduate-intern",
    name: "Graduate / intern programme",
    summary: "Structured first weeks with learning goals and check-ins.",
    suggestDefault: false,
    tasks: [
      {
        title: "Attend orientation / welcome session",
        description: "Cohort welcome, facilities tour, and programme overview.",
        dueAfterDays: 1,
        isRequired: true,
      },
      {
        title: "Meet your line manager",
        description: "Set learning objectives and weekly check-in schedule.",
        dueAfterDays: 3,
        isRequired: true,
      },
      {
        title: "Probation goals discussion",
        description: "Document skills to develop and success criteria for the programme.",
        dueAfterDays: 14,
        isRequired: true,
      },
      {
        title: "Register for leave and attendance tools",
        description: "Ensure portal access for schedules and time reporting.",
        dueAfterDays: 7,
        isRequired: false,
      },
    ],
  },
];

export function getOnboardingStarterById(id: string | null | undefined): OnboardingStarterTemplate | null {
  if (!id) return null;
  return ONBOARDING_STARTER_TEMPLATES.find((t) => t.id === id) ?? null;
}
