-- Capture respondent county on poll responses so the AI brief can report
-- regional differences (sourced from profiles.county at submission time;
-- anonymous respondents have no profile so this stays null for them).
ALTER TABLE public.poll_responses ADD COLUMN IF NOT EXISTS county text;
