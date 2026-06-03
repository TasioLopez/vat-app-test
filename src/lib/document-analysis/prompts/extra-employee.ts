import { INTAKE_EMPLOYEE_PROMPT } from './intake-employee';

export const EXTRA_EMPLOYEE_PROMPT = `Je bent een expert in het analyseren van Nederlandse werknemersdocumenten.

Als dit document een intakeformulier is (secties 1–16, "Hoe verplaatst werknemer zich", computervaardigheden), volg dan deze intake-regels:
${INTAKE_EMPLOYEE_PROMPT}

Anders extract uit vrije tekst:
- current_job, contract_hours, date_of_birth, gender, work_experience, education_level (hoogste), education_name

REGELS: geen gokken met defaults. ALLEEN JSON object.`;

export const EXTRA_EMPLOYEE_USER_MESSAGE =
  'Analyseer dit document en extract relevante werknemersprofiel velden.';
