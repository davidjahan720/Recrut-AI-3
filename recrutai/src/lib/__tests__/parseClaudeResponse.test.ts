import { describe, it, expect } from 'vitest'
import {
  parseRawJson,
  validateScoreResult,
  isQualified,
  ClaudeParseError,
  type ScoreResult,
} from '../parseClaudeResponse'

describe('parseRawJson', () => {
  it('parse un JSON propre', () => {
    const raw = '{"score":85,"justification":"Bon profil","candidate_name":"Jean Dupont","candidate_email":"j@d.fr"}'
    const result = parseRawJson<ScoreResult>(raw)
    expect(result.score).toBe(85)
    expect(result.candidate_name).toBe('Jean Dupont')
  })

  it('parse un JSON entouré de texte parasite', () => {
    const raw = 'Voici mon analyse :\n```json\n{"score":72,"justification":"Correct","candidate_name":null,"candidate_email":null}\n```'
    const result = parseRawJson<ScoreResult>(raw)
    expect(result.score).toBe(72)
  })

  it('parse un JSON avec whitespace en début/fin', () => {
    const raw = '  \n{"score":60,"justification":"Ok","candidate_name":null,"candidate_email":null}\n  '
    const result = parseRawJson<ScoreResult>(raw)
    expect(result.score).toBe(60)
  })

  it('parse un JSON avec champ is_relevant false', () => {
    const raw = '{"score":3,"is_relevant":false,"justification":"Hors sujet","candidate_name":"Paul","candidate_email":null}'
    const result = parseRawJson<ScoreResult>(raw)
    expect(result.is_relevant).toBe(false)
    expect(result.score).toBe(3)
  })

  it('lève ClaudeParseError si aucun JSON trouvable', () => {
    expect(() => parseRawJson('Désolé, je ne peux pas analyser ce document.')).toThrow(ClaudeParseError)
  })

  it('lève ClaudeParseError si JSON malformé et pas de fallback valide', () => {
    expect(() => parseRawJson('{score: 85, justification: manque les guillemets}')).toThrow(ClaudeParseError)
  })

  it('parse les positive_points et negative_points', () => {
    const raw = JSON.stringify({
      score: 80,
      justification: 'Très bon profil',
      positive_points: ['5 ans React', 'TypeScript maîtrisé'],
      negative_points: ['Pas de Next.js'],
      candidate_name: 'Marie Martin',
      candidate_email: 'marie@example.com',
    })
    const result = parseRawJson<ScoreResult>(raw)
    expect(result.positive_points).toHaveLength(2)
    expect(result.negative_points).toHaveLength(1)
  })
})

describe('validateScoreResult', () => {
  const base: ScoreResult = { score: 75, justification: 'Bon profil', candidate_name: null, candidate_email: null }

  it('valide un résultat correct', () => {
    expect(() => validateScoreResult(base)).not.toThrow()
  })

  it('valide un score à 0 (limite basse)', () => {
    expect(() => validateScoreResult({ ...base, score: 0 })).not.toThrow()
  })

  it('valide un score à 100 (limite haute)', () => {
    expect(() => validateScoreResult({ ...base, score: 100 })).not.toThrow()
  })

  it('lève une erreur si score négatif', () => {
    expect(() => validateScoreResult({ ...base, score: -1 })).toThrow(ClaudeParseError)
  })

  it('lève une erreur si score > 100', () => {
    expect(() => validateScoreResult({ ...base, score: 101 })).toThrow(ClaudeParseError)
  })

  it('lève une erreur si score n\'est pas un nombre', () => {
    expect(() => validateScoreResult({ ...base, score: 'haute' as unknown as number })).toThrow(ClaudeParseError)
  })

  it('lève une erreur si justification vide', () => {
    expect(() => validateScoreResult({ ...base, justification: '   ' })).toThrow(ClaudeParseError)
  })

  it('lève une erreur si justification absente', () => {
    expect(() => validateScoreResult({ ...base, justification: '' })).toThrow(ClaudeParseError)
  })
})

describe('isQualified', () => {
  it('qualifie si score >= threshold et is_relevant absent (défaut true)', () => {
    expect(isQualified({ score: 75, justification: '', candidate_name: null, candidate_email: null }, 70)).toBe(true)
  })

  it('qualifie si score == threshold exactement', () => {
    expect(isQualified({ score: 70, justification: '', candidate_name: null, candidate_email: null }, 70)).toBe(true)
  })

  it('rejette si score < threshold', () => {
    expect(isQualified({ score: 65, justification: '', candidate_name: null, candidate_email: null }, 70)).toBe(false)
  })

  it('rejette si is_relevant === false même avec score élevé', () => {
    expect(isQualified({ score: 95, is_relevant: false, justification: '', candidate_name: null, candidate_email: null }, 70)).toBe(false)
  })

  it('qualifie si is_relevant === true et score suffisant', () => {
    expect(isQualified({ score: 80, is_relevant: true, justification: '', candidate_name: null, candidate_email: null }, 70)).toBe(true)
  })

  it('rejette si is_relevant === true mais score insuffisant', () => {
    expect(isQualified({ score: 50, is_relevant: true, justification: '', candidate_name: null, candidate_email: null }, 70)).toBe(false)
  })
})
