# Copilot Instructions — Red Tetris

## Claude Model Interaction Instructions

### Rules for Claude models

1. **Use the ask_user tool (AskUserQuestion) for all user-facing questions.**
   - Never ask a question via plain-text output in the chat. The repository's UX requires using the ask_user tool so responses are captured and presented correctly.
   - Prefer multiple-choice options when possible to speed user responses; allow freeform only when necessary.

2. **Always ask about the next step before ending the request.**
   - Every response that would otherwise finish must instead end by asking what the user wants done next (for example: "What would you like me to do next?" or using ask_user with choices like: ["Start implementation (Recommended)", "Write tests", "Update docs", "Stop here"]).
   - Do not assume a next step; explicitly ask and wait for the user's selection.

3. **If follow-up clarification is required to proceed, ask one focused question at a time using ask_user.**

#### Example (pseudocode):

ask_user({
  "question": "Which task should I take next?",
  "choices": ["Start implementation (Recommended)", "Write tests", "Update docs", "Other"],
  "allow_freeform": true
});

---