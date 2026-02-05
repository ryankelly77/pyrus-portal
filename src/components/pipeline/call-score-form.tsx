'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_CONFIG } from '@/lib/pipeline/default-config'

type BudgetClarity = 'clear' | 'vague' | 'none' | 'no_budget'
type Competition = 'none' | 'some' | 'many'
type Engagement = 'high' | 'medium' | 'low'
type PlanFit = 'strong' | 'medium' | 'weak' | 'poor'

interface CallScoreInputs {
  budgetClarity: BudgetClarity
  competition: Competition
  engagement: Engagement
  planFit: PlanFit
}

interface CallScoreFormProps {
  recommendationId: string
  existingScore?: CallScoreInputs | null
  onSaved?: () => void
}

interface FactorOption<T> {
  value: T
  label: string
  description: string
  indicator: 'positive' | 'neutral' | 'negative'
}

const BUDGET_OPTIONS: FactorOption<BudgetClarity>[] = [
  { value: 'clear', label: 'Clear', description: 'Gave a specific number or range', indicator: 'positive' },
  { value: 'vague', label: 'Vague', description: 'Mentioned "a budget" but no specifics', indicator: 'neutral' },
  { value: 'none', label: 'None', description: "Budget wasn't discussed", indicator: 'neutral' },
  { value: 'no_budget', label: 'No Budget', description: "Said they don't have budget allocated", indicator: 'negative' },
]

const COMPETITION_OPTIONS: FactorOption<Competition>[] = [
  { value: 'none', label: 'None', description: "We're the only option", indicator: 'positive' },
  { value: 'some', label: 'Some', description: '1-2 other providers', indicator: 'neutral' },
  { value: 'many', label: 'Many', description: '3+ competitors or RFP', indicator: 'negative' },
]

const ENGAGEMENT_OPTIONS: FactorOption<Engagement>[] = [
  { value: 'high', label: 'High', description: 'Asked questions, seemed excited', indicator: 'positive' },
  { value: 'medium', label: 'Medium', description: 'Polite but not enthusiastic', indicator: 'neutral' },
  { value: 'low', label: 'Low', description: 'Distracted, short answers', indicator: 'negative' },
]

const PLAN_FIT_OPTIONS: FactorOption<PlanFit>[] = [
  { value: 'strong', label: 'Strong', description: 'Perfect fit for their needs', indicator: 'positive' },
  { value: 'medium', label: 'Medium', description: 'Good fit with some gaps', indicator: 'neutral' },
  { value: 'weak', label: 'Weak', description: 'Partial fit, significant gaps', indicator: 'neutral' },
  { value: 'poor', label: 'Poor', description: 'Fundamental mismatch', indicator: 'negative' },
]

function calculateBaseScore(inputs: Partial<CallScoreInputs>): number | null {
  if (!inputs.budgetClarity || !inputs.competition || !inputs.engagement || !inputs.planFit) {
    return null
  }

  const { call_weights, call_score_mappings } = DEFAULT_CONFIG

  const budgetPoints =
    (call_score_mappings.budget_clarity[inputs.budgetClarity] ?? 0) * call_weights.budget_clarity
  const competitionPoints =
    (call_score_mappings.competition[inputs.competition] ?? 0) * call_weights.competition
  const engagementPoints =
    (call_score_mappings.engagement[inputs.engagement] ?? 0) * call_weights.engagement
  const planFitPoints =
    (call_score_mappings.plan_fit[inputs.planFit] ?? 0) * call_weights.plan_fit

  return Math.round(budgetPoints + competitionPoints + engagementPoints + planFitPoints)
}

export function CallScoreForm({ recommendationId, existingScore, onSaved }: CallScoreFormProps) {
  const [budgetClarity, setBudgetClarity] = useState<BudgetClarity | null>(existingScore?.budgetClarity ?? null)
  const [competition, setCompetition] = useState<Competition | null>(existingScore?.competition ?? null)
  const [engagement, setEngagement] = useState<Engagement | null>(existingScore?.engagement ?? null)
  const [planFit, setPlanFit] = useState<PlanFit | null>(existingScore?.planFit ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate preview score
  const previewScore = calculateBaseScore({
    budgetClarity: budgetClarity ?? undefined,
    competition: competition ?? undefined,
    engagement: engagement ?? undefined,
    planFit: planFit ?? undefined,
  })

  const isComplete = budgetClarity && competition && engagement && planFit
  const hasChanges = existingScore
    ? budgetClarity !== existingScore.budgetClarity ||
      competition !== existingScore.competition ||
      engagement !== existingScore.engagement ||
      planFit !== existingScore.planFit
    : isComplete

  const handleSave = async () => {
    if (!isComplete) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch(`/api/admin/recommendations/${recommendationId}/call-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetClarity,
          competition,
          engagement,
          planFit,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save call scores')
    } finally {
      setSaving(false)
    }
  }

  function FactorSelector<T extends string>({
    label,
    question,
    options,
    value,
    onChange,
    weight,
  }: {
    label: string
    question: string
    options: FactorOption<T>[]
    value: T | null
    onChange: (val: T) => void
    weight: number
  }) {
    return (
      <div className="factor-group">
        <div className="factor-header">
          <span className="factor-label">{label}</span>
          <span className="factor-weight">{weight} pts</span>
        </div>
        <p className="factor-question">{question}</p>
        <div className="factor-options">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`factor-option ${value === opt.value ? 'selected' : ''} ${opt.indicator}`}
              onClick={() => onChange(opt.value)}
            >
              <span className="option-label">{opt.label}</span>
              <span className="option-desc">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="call-score-form">
      <div className="form-header">
        <h3>Call Score</h3>
        {previewScore !== null && (
          <div className={`score-preview ${previewScore >= 70 ? 'high' : previewScore >= 40 ? 'medium' : 'low'}`}>
            <span className="score-value">{previewScore}</span>
            <span className="score-label">Base Score</span>
          </div>
        )}
      </div>

      <div className="factors-grid">
        <FactorSelector
          label="Budget"
          question="How clearly did the prospect define their budget?"
          options={BUDGET_OPTIONS}
          value={budgetClarity}
          onChange={setBudgetClarity}
          weight={DEFAULT_CONFIG.call_weights.budget_clarity}
        />

        <FactorSelector
          label="Competition"
          question="Are they evaluating other providers?"
          options={COMPETITION_OPTIONS}
          value={competition}
          onChange={setCompetition}
          weight={DEFAULT_CONFIG.call_weights.competition}
        />

        <FactorSelector
          label="Engagement"
          question="How engaged was the prospect on the call?"
          options={ENGAGEMENT_OPTIONS}
          value={engagement}
          onChange={setEngagement}
          weight={DEFAULT_CONFIG.call_weights.engagement}
        />

        <FactorSelector
          label="Plan Fit"
          question="How well do our services match their needs?"
          options={PLAN_FIT_OPTIONS}
          value={planFit}
          onChange={setPlanFit}
          weight={DEFAULT_CONFIG.call_weights.plan_fit}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button
          type="button"
          className="btn-save"
          onClick={handleSave}
          disabled={!isComplete || !hasChanges || saving}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : existingScore ? 'Update Score' : 'Save Score'}
        </button>
        {!isComplete && (
          <span className="form-hint">Select all four factors to save</span>
        )}
      </div>

      <style jsx>{`
        .call-score-form {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .form-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .score-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 16px;
          border-radius: 8px;
          min-width: 70px;
        }

        .score-preview.high {
          background: #D1FAE5;
          color: #065F46;
        }

        .score-preview.medium {
          background: #FEF3C7;
          color: #92400E;
        }

        .score-preview.low {
          background: #FEE2E2;
          color: #991B1B;
        }

        .score-value {
          font-size: 24px;
          font-weight: 700;
          line-height: 1;
        }

        .score-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        .factors-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        @media (max-width: 768px) {
          .factors-grid {
            grid-template-columns: 1fr;
          }
        }

        .factor-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .factor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .factor-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .factor-weight {
          font-size: 11px;
          color: #9CA3AF;
          background: #F3F4F6;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .factor-question {
          font-size: 12px;
          color: #6B7280;
          margin: 0;
        }

        .factor-options {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .factor-option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 10px 12px;
          background: #F9FAFB;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .factor-option:hover {
          background: #F3F4F6;
        }

        .factor-option.selected {
          border-color: #059669;
          background: #ECFDF5;
        }

        .factor-option.selected.positive {
          border-color: #059669;
          background: #ECFDF5;
        }

        .factor-option.selected.neutral {
          border-color: #D97706;
          background: #FFFBEB;
        }

        .factor-option.selected.negative {
          border-color: #DC2626;
          background: #FEF2F2;
        }

        .option-label {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }

        .option-desc {
          font-size: 11px;
          color: #6B7280;
          margin-top: 2px;
        }

        .form-error {
          margin-top: 16px;
          padding: 10px 12px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          color: #DC2626;
          font-size: 13px;
        }

        .form-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
        }

        .btn-save {
          padding: 10px 20px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-save:hover:not(:disabled) {
          background: #047857;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-hint {
          font-size: 12px;
          color: #9CA3AF;
        }
      `}</style>
    </div>
  )
}
