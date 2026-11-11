const EMAIL_FORMAT = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/**
 * Client-side email check used by every registration/application form.
 * Rejects bad formats immediately, then asks the server route (which holds
 * the reputation API key). If the server can't be reached, the address is
 * accepted — the checker must never be the reason a real person can't sign up.
 */
export async function validateEmail(email: string): Promise<boolean> {
  const trimmed = email.trim();
  if (!EMAIL_FORMAT.test(trimmed)) return false;

  try {
    const res = await fetch('/api/validate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed }),
    });
    if (!res.ok) return true;
    const data = await res.json();
    return data?.valid !== false;
  } catch {
    return true;
  }
}
