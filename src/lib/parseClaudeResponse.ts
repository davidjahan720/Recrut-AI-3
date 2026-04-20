export interface ScoreResult {
  score: number
  is_relevant?: boolean
  justification: string
  positive_points?: string[]
  negative_points?: string[]
  candidate_name: string | null
  candidate_email: string | null
}

export interface ParseJobResult {
  company_name: string
  title: string
  location: string
  contract_type: string
  description: string
  score_threshold: number
}

export class ClaudeParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClaudeParseError'
  }
}

export function parseRawJson<T>(raw: string): T {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new ClaudeParseError('Réponse non parseable : ' + trimmed.slice(0, 300))
    try {
      return JSON.parse(match[0]) as T
    } catch {
      throw new ClaudeParseError('JSON extrait invalide : ' + match[0].slice(0, 300))
    }
  }
}

export function validateScoreResult(parsed: ScoreResult): void {
  if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 100) {
    throw new ClaudeParseError(`Score invalide : ${parsed.score}`)
  }
  if (typeof parsed.justification !== 'string' || parsed.justification.trim() === '') {
    throw new ClaudeParseError('Justification manquante ou vide')
  }
}

export function isQualified(parsed: ScoreResult, threshold: number): boolean {
  return parsed.is_relevant !== false && parsed.score >= threshold
}
