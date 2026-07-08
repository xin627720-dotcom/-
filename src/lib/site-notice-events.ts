export const SUBMISSION_FLOATER_STATE_EVENT = "priceai-submission-floater-state";

export function emitSubmissionFloaterState(open: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SUBMISSION_FLOATER_STATE_EVENT, { detail: { open } }));
}
