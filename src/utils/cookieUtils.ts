/**
 * Set a cookie with the given name, value and expiration days
 * @param name Cookie name
 * @param value Cookie value
 * @param expiryDays Number of days until the cookie expires
 */
export const setCookie = (name: string, value: string, expiryDays: number = 365): void => {
  const date = new Date();
  date.setTime(date.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  
  // Set SameSite=Lax for GDPR compliance
  document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
};

/**
 * Get a cookie by name
 * @param name Cookie name
 * @returns The cookie value or empty string if not found
 */
export const getCookie = (name: string): string => {
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  
  return '';
};

/**
 * Delete a cookie by setting its expiration date to the past
 * @param name Cookie name to delete
 */
export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; Max-Age=-99999999; path=/; SameSite=Lax`;
};

/**
 * Check if a cookie exists
 * @param name Cookie name
 * @returns True if the cookie exists, false otherwise
 */
export const cookieExists = (name: string): boolean => {
  return getCookie(name) !== '';
};