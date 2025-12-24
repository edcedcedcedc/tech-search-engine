export function resetCookieConsent() {
  document.cookie = "myAppCookieConsent=; path=/; max-age=0";
  window.location.reload();
}