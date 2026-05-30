const PENDING_KEY = "callback-onboarding-pending";
const DONE_PREFIX = "callback-onboarding-done-";

export function queueOnboarding(userId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_KEY, userId);
}

export function hasOnboardingPending(userId: string) {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PENDING_KEY) === userId;
}

export function consumeOnboardingPending(userId: string) {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(PENDING_KEY) !== userId) return false;
  sessionStorage.removeItem(PENDING_KEY);
  return true;
}

export function markOnboardingDoneLocal(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${DONE_PREFIX}${userId}`, "1");
}

export function isOnboardingDoneLocal(userId: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${DONE_PREFIX}${userId}`) === "1";
}

export function clearOnboardingPending() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_KEY);
}
