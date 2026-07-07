import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getQuestionFlow, getEscalaLikert, SECAO_LABELS } from '../utils/questionFlow'
import logo from '../assets/logo-completa.png'

// Etapas: welcome -> identificacao -> perguntas (uma por vez) -> confirm
export default function RespondentFlow({ token }) {
  const [loadState, setLoadState] = useState('loading') // loading | ready | invalid-token
  const [team, setTeam] = useState(null)
  const [expected, setExpected] = useState([])

  const [step, setStep] = useState('welcome') // welcome | id | questions | confirm
  const [role, setRole] = useState('lider')
  const [expectedId, setExpectedId] = useState('')
  const [funcao, setFuncao] = useState('')
  const [tempoEquipe, setTempoEquipe] = useState('')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [idError, setIdError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: teamRow, error: teamErr } = await supabase
        .from('team_public')
        .select('*')
        .eq('token_acesso', token)
        .maybeSingle()

      if (cancelled) return

      if (teamErr || !teamRow || teamRow.status !== 'ativo') {
        setLoadState('invalid-token')
        return
      }

      const { data: expectedRows } = await supabase
        .from('expected_respondents_public')
        .select('*')
        .eq('team_id', teamRow.id)

      if (cancelled) return
      setTeam(teamRow)
      setExpected(expectedRows ?? [])
      setLoadState('ready')
    }
    load()
    return () => { cancelled = true }
  }, [token])

  const questionFlow = useMemo(() => getQuestionFlow(role), [role])
  const escala = getEscalaLikert()
  const peopleForRole = expected.filter((p) => p.papel_esperado === role)

  const totalSteps = 3 + questionFlow.length // welcome, id, [perguntas...], confirm (aprox. para os dots)
  const dotsCount = 5

  function currentDotIndex() {
    if (step === 'welcome') return 0
    if (step === 'id') return 1
    if (step === 'questions') return 1 + Math.round(((qIndex + 1) / questionFlow.length) * 3)
    return 4
  }

  function validateIdentificacao() {
    if (!expectedId) return 'Selecione seu nome na lista.'
    if (!funcao.trim()) return 'Conte o que você é pago para fazer.'
    if (!tempoEquipe) return 'Selecione há quanto tempo você está na equipe.'
    return ''
  }

  function goNextFromId() {
    const err = validateIdentificacao()
    if (err) { setIdError(err); return }
    setIdError('')
    setStep('questions')
    setQIndex(0)
  }

  function setAnswer(codigo, value) {
    setAnswers((prev) => ({ ...prev, [codigo]: value }))
  }

  function currentQuestionAnswered() {
    const q = questionFlow[qIndex]
    if (!q) return true
    const a = answers[q.codigo]
    if (q.tipo === 'likert') return typeof a === 'number'
    if (q.tipo === 'texto_longo') return typeof a === 'string' && a.trim().length > 0
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError('')
    const answersPayload = questionFlow.map((q) => ({
      question_code: q.codigo,
      tipo: q.tipo,
      valor_likert: q.tipo === 'likert' ? answers[q.codigo] : null,
      valor_texto: q.tipo === 'texto_longo' ? answers[q.codigo] : null,
    }))

    const { error } = await supabase.rpc('submit_response', {
      p_token: token,
      p_expected_respondent_id: expectedId,
      p_papel: role,
      p_funcao: funcao,
      p_tempo_equipe: tempoEquipe,
      p_answers: answersPayload,
    })

    setSubmitting(false)
    if (error) {
      setSubmitError('Não foi possível enviar suas respostas. Tente novamente em instantes.')
      return
    }
    setStep('confirm')
  }

  function handleNextQuestion() {
    if (qIndex < questionFlow.length - 1) {
      setQIndex(qIndex + 1)
    } else {
      handleSubmit()
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="app-shell">
        <div className="card"><div className="spinner-wrap"><p>Carregando…</p></div></div>
      </div>
    )
  }

  if (loadState === 'invalid-token') {
    return (
      <div className="app-shell">
        <div className="card">
          <div className="screen">
            <h1>Link inválido</h1>
            <p>Este link de diagnóstico não é válido ou a equipe já foi encerrada. Confira o link recebido por e-mail ou fale com quem organizou o diagnóstico.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="card">
        <div className="logo-row">
          <img src={logo} alt="Ana Almeida Mentorias e Treinamentos" />
        </div>
        <div className="dots">
          {Array.from({ length: dotsCount }).map((_, i) => (
            <div key={i} className={`dot ${i <= currentDotIndex() ? 'active' : ''}`} />
          ))}
        </div>

        <div className="screen">
          {step === 'welcome' && (
            <>
              <p className="muted">Diagnóstico de Equipes · {team.nome}</p>
              <h1>Bem-vindo(a) ao Diagnóstico de Equipes</h1>
              <p>Este questionário faz parte de um processo de avaliação da equipe e da liderança, com o objetivo de identificar pontos fortes, desafios de gestão e eventuais conflitos que possam estar afetando a produtividade e o bem-estar do time. Não existem respostas certas ou erradas: o valor deste diagnóstico está na sua sinceridade.</p>
              <p style={{ fontSize: 13 }}>⏱ Tempo estimado: 10 a 12 minutos</p>
              <div className="info-box">🔒 Suas respostas individuais não serão compartilhadas com sua liderança ou colegas. Os resultados são analisados de forma agregada e anônima.</div>
            </>
          )}

          {step === 'id' && (
            <>
              <p className="muted">Etapa 1 de 3</p>
              <h2>Antes de começar</h2>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Você é o(a) líder desta equipe ou um(a) integrante liderado(a) por ela?</p>
              <div className="role-grid">
                <div className={`role-card ${role === 'lider' ? 'selected' : ''}`} onClick={() => { setRole('lider'); setExpectedId('') }}>
                  <div style={{ fontSize: 20 }}>👑</div>
                  <p>Líder</p>
                </div>
                <div className={`role-card ${role === 'liderado' ? 'selected' : ''}`} onClick={() => { setRole('liderado'); setExpectedId('') }}>
                  <div style={{ fontSize: 20 }}>👥</div>
                  <p>Liderado(a)</p>
                </div>
              </div>

              {idError && <div className="error-box">{idError}</div>}

              <label>Nome <span className="required">*</span></label>
              <select value={expectedId} onChange={(e) => setExpectedId(e.target.value)}>
                <option value="">Selecione seu nome…</option>
                {peopleForRole.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.ja_respondeu}>
                    {p.nome}{p.ja_respondeu ? ' (já respondeu)' : ''}
                  </option>
                ))}
              </select>
              <p className="field-hint">Usado apenas para controle de quem já respondeu — não será associado às suas respostas na análise. Se seu nome não aparece na lista, fale com quem organizou o diagnóstico.</p>

              <label>O que você é pago para fazer nesta equipe? <span className="required">*</span></label>
              <input type="text" placeholder="Ex.: Analista de vendas pleno" value={funcao} onChange={(e) => setFuncao(e.target.value)} />
              <p className="field-hint">Informe seu cargo ou função.</p>

              <label>Há quanto tempo você faz parte desta equipe? <span className="required">*</span></label>
              <select value={tempoEquipe} onChange={(e) => setTempoEquipe(e.target.value)}>
                <option value="">Selecione…</option>
                <option value="Menos de 6 meses">Menos de 6 meses</option>
                <option value="6 meses a 2 anos">6 meses a 2 anos</option>
                <option value="Mais de 2 anos">Mais de 2 anos</option>
              </select>
            </>
          )}

          {step === 'questions' && questionFlow[qIndex] && (
            <QuestionScreen
              q={questionFlow[qIndex]}
              index={qIndex}
              total={questionFlow.length}
              escala={escala}
              value={answers[questionFlow[qIndex].codigo]}
              onChange={(v) => setAnswer(questionFlow[qIndex].codigo, v)}
            />
          )}

          {step === 'confirm' && (
            <div className="confirm-wrap">
              <div className="check-circle">✓</div>
              <h2>Respostas enviadas</h2>
              <p style={{ maxWidth: 260, textAlign: 'center' }}>Obrigado por dedicar esses minutos ao diagnóstico da sua equipe. Suas respostas foram registradas com confidencialidade.</p>
            </div>
          )}
        </div>

        {step !== 'confirm' && (
          <div className="actions">
            <button
              className="nav"
              style={{ visibility: step === 'welcome' ? 'hidden' : 'visible' }}
              onClick={() => {
                if (step === 'id') setStep('welcome')
                else if (step === 'questions') {
                  if (qIndex > 0) setQIndex(qIndex - 1)
                  else setStep('id')
                }
              }}
            >
              Voltar
            </button>
            <button
              className="nav primary"
              disabled={step === 'questions' && !currentQuestionAnswered()}
              onClick={() => {
                if (step === 'welcome') setStep('id')
                else if (step === 'id') goNextFromId()
                else if (step === 'questions') handleNextQuestion()
              }}
            >
              {submitting ? 'Enviando…' : step === 'questions' && qIndex === questionFlow.length - 1 ? 'Concluir' : 'Avançar'}
            </button>
          </div>
        )}
        {submitError && <div className="error-box" style={{ marginTop: 12 }}>{submitError}</div>}
      </div>
      <p className="legal-footer">
        Ana Almeida Palestras e Treinamentos Empresariais — CNPJ 51.482.740/0001-42<br />
        Todo o conteúdo deste diagnóstico (perguntas, metodologia e relatório) é de propriedade de Ana Almeida Palestras e Treinamentos Empresariais e não pode ser reproduzido sem autorização.
      </p>
    </div>
  )
}

function QuestionScreen({ q, index, total, escala, value, onChange }) {
  return (
    <>
      <p className="muted">{SECAO_LABELS[q.secao]}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>Pergunta {index + 1} de {total}</span>
        {q.dimensao_label && <span className="badge">{q.dimensao_label}</span>}
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
      <p style={{ fontSize: 16, minHeight: 60 }}>{q.texto}</p>

      {q.tipo === 'likert' && (
        <>
          <div className="scale-row">
            {Array.from({ length: escala.max - escala.min + 1 }, (_, i) => escala.min + i).map((n) => (
              <button
                key={n}
                type="button"
                className={`scale-btn ${value === n ? 'selected' : ''}`}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="scale-labels">
            <span>{escala.labels['1']}</span>
            <span>{escala.labels['5']}</span>
          </div>
        </>
      )}

      {q.tipo === 'texto_longo' && (
        <textarea
          rows={5}
          placeholder="Escreva com liberdade — não há resposta certa ou errada."
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </>
  )
}
