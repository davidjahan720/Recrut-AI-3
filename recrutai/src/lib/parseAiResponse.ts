/**
 * Helpers de parsing pour les réponses LLM (texte JSON parfois bruyant).
 *
 * Agnostique du fournisseur : utilisé côté Vercel Functions et côté Edge
 * Functions Deno. Renommé depuis `parseClaudeResponse.ts` lors de la
 * migration Anthropic → Mistral.
 *
 * RGPD : aucune PII n'est journalisée ; les erreurs ne tronquent qu'un extrait
 *        court (300 caractères) du brut côté serveur, jamais côté client.
 *        cf. art. 5.1.c (minimisation), art. 5.1.f (sécurité).
 */

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

export class AiParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiParseError'
  }
}

export function parseRawJson<T>(raw: string): T {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new AiParseError('Réponse non parseable : ' + trimmed.slice(0, 300))
    try {
      return JSON.parse(match[0]) as T
    } catch {
      throw new AiParseError('JSON extrait invalide : ' + match[0].slice(0, 300))
    }
  }
}

export function validateScoreResult(parsed: ScoreResult): void {
  if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 100) {
    throw new AiParseError(`Score invalide : ${parsed.score}`)
  }
  if (typeof parsed.justification !== 'string' || parsed.justification.trim() === '') {
    throw new AiParseError('Justification manquante ou vide')
  }
}

export function isQualified(parsed: ScoreResult, threshold: number): boolean {
  return parsed.is_relevant !== false && parsed.score >= threshold
}
