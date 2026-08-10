# Project goal
Convert the existing single-file prototype into a working, maintainable MVP while preserving its existing functionality and Arabic RTL experience.

# Working rules
- Keep responses and progress summaries concise.
- Do not repeatedly explain unchanged code.
- Do not read the entire project again when only specific files are relevant.
- Use targeted file searches and inspect only necessary sections.
- Make small, testable changes.
- Do not rewrite working code without a clear reason.
- Do not add features outside the current MVP scope.
- Do not duplicate components, utilities, styles, schemas, or constants.
- Before creating a file, check whether an appropriate file already exists.
- Preserve Arabic text as UTF-8 and preserve RTL behavior.
- Keep the Gemini API key server-side only.
- Never place secrets in frontend code, committed files, logs, or error messages.
- After each task, run the relevant tests/build and report only:
  1. files changed,
  2. tests performed,
  3. remaining blocker, if any.
- Do not generate long documentation unless requested.
- Do not use placeholder behavior while claiming a feature works.
- Prefer the simplest implementation appropriate for an MVP.

# MVP scope
- Teacher enters a lesson title, student level, lesson text, and story theme.
- The server calls Gemini to generate a structured educational adventure.
- The student can complete classification, ordering, and written-answer challenges.
- The app gives feedback, hints, progress, an ending, and a teacher report.
- Adaptive memory may remain in localStorage for the MVP.
- PDF upload, authentication, database storage, generated images, and generated audio are out of scope unless already implemented.
