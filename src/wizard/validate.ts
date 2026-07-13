/**
 * One rule for both the app directory name and the PocketHost instance-name
 * suggestion: instance names become `<name>.pockethost.io` subdomains, so the
 * app name must be subdomain-safe (lowercase alphanumerics and inner hyphens).
 */
const NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/
const MAX_NAME_LENGTH = 40

/** Returns an error message, or undefined when the name is valid. */
export function validateAppName(name: string): string | undefined {
  if (!name) return 'Name is required'
  if (name.length < 2) return 'Name must be at least 2 characters'
  if (name.length > MAX_NAME_LENGTH)
    return `Name must be at most ${MAX_NAME_LENGTH} characters`
  if (name !== name.toLowerCase()) return 'Name must be lowercase'
  if (!NAME_PATTERN.test(name)) {
    return 'Name must start with a letter, contain only lowercase letters, digits, and hyphens, and not end with a hyphen'
  }
  if (name.includes('--')) return 'Name must not contain consecutive hyphens'
  return undefined
}

/**
 * Accepts a bare domain like `app.example.com`; rejects URLs, ports, paths,
 * and wildcard entries.
 */
export function validateCustomDomain(domain: string): string | undefined {
  if (!domain) return 'Domain is required'
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(domain))
    return 'Enter a bare domain, not a URL'
  if (
    !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
      domain,
    )
  ) {
    return 'Enter a valid domain like app.example.com'
  }
  return undefined
}
