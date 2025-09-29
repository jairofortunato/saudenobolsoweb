'use client'

import { useState } from 'react'
import { Metadata } from 'next'

// Note: Since we're using 'use client', we can't export metadata directly
// You would typically handle this in a parent component or layout

export default function ExclusaoDados() {
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    cpf: '',
    email: '',
    telefone: '',
    motivoExclusao: '',
    confirmacao: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 2000)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Solicitação Enviada com Sucesso!
            </h1>
            <p className="text-gray-600 mb-6">
              Sua solicitação de exclusão de dados foi recebida e será processada conforme nossa Política de Privacidade.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Próximos Passos:</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Você receberá um e-mail de confirmação em até 24 horas</li>
                <li>• Nossa equipe entrará em contato em até 5 dias úteis</li>
                <li>• O processo de exclusão será concluído em até 30 dias</li>
                <li>• Você será notificado quando a exclusão for finalizada</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Exclusão de Dados do Usuário
            </h1>
            <p className="text-gray-600">
              Solicitação de remoção de dados pessoais e informações de saúde
            </p>
          </div>

          <div className="prose max-w-none mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">⚠️ Importante - Leia Antes de Prosseguir</h3>
              <p className="text-yellow-700 text-sm">
                A exclusão de seus dados médicos é <strong>irreversível</strong> e pode impactar seu histórico de saúde.
                Considere fazer backup de informações importantes antes de prosseguir.
              </p>
            </div>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">O que será Excluído</h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-900 mb-3">✅ Dados que SERÃO excluídos:</h3>
                  <ul className="text-red-800 text-sm space-y-1">
                    <li>• Informações pessoais (nome, CPF, contato)</li>
                    <li>• Histórico médico completo</li>
                    <li>• Medicamentos e prescrições</li>
                    <li>• Resultados de exames</li>
                    <li>• Consultas registradas</li>
                    <li>• Preferências e configurações</li>
                    <li>• Logs de acesso e atividade</li>
                    <li>• Conversas via WhatsApp</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-3">📋 Dados que PODEM ser mantidos:</h3>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Dados anonimizados para pesquisa</li>
                    <li>• Informações necessárias por lei</li>
                    <li>• Registros de auditoria (sem identificação)</li>
                    <li>• Dados em backups (excluídos gradualmente)</li>
                  </ul>
                  <p className="text-blue-700 text-xs mt-2">
                    Conforme Art. 16 da LGPD e regulamentações médicas
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Prazos e Processo</h2>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-blue-600 mb-2">24h</div>
                    <div className="text-sm text-gray-600">Confirmação da solicitação</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-green-600 mb-2">5 dias</div>
                    <div className="text-sm text-gray-600">Análise e validação</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-orange-600 mb-2">15 dias</div>
                    <div className="text-sm text-gray-600">Processamento da exclusão</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-purple-600 mb-2">30 dias</div>
                    <div className="text-sm text-gray-600">Conclusão total</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Alternativas à Exclusão Total</h2>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">🔒 Desativação Temporária</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    Desative sua conta mantendo dados por 6 meses para reativação futura.
                  </p>
                  <button className="text-blue-600 text-sm hover:underline">
                    Saiba mais sobre desativação
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">📁 Exportação de Dados</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    Baixe uma cópia de todos os seus dados antes da exclusão.
                  </p>
                  <button className="text-blue-600 text-sm hover:underline">
                    Solicitar exportação
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">🎛️ Exclusão Seletiva</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    Exclua apenas categorias específicas de dados (ex: apenas conversas).
                  </p>
                  <button className="text-blue-600 text-sm hover:underline">
                    Configurar exclusão seletiva
                  </button>
                </div>
              </div>
            </section>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Formulário de Solicitação</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nomeCompleto" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="nomeCompleto"
                  name="nomeCompleto"
                  required
                  value={formData.nomeCompleto}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  required
                  value={formData.cpf}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone/WhatsApp *
                </label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  required
                  value={formData.telefone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 90000-0000"
                />
              </div>
            </div>

            <div>
              <label htmlFor="motivoExclusao" className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da Exclusão *
              </label>
              <select
                id="motivoExclusao"
                name="motivoExclusao"
                required
                value={formData.motivoExclusao}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione o motivo</option>
                <option value="nao_uso_mais">Não uso mais o serviço</option>
                <option value="preocupacao_privacidade">Preocupação com privacidade</option>
                <option value="mudanca_medico">Mudança de médico/sistema</option>
                <option value="insatisfacao_servico">Insatisfação com o serviço</option>
                <option value="problema_tecnico">Problemas técnicos</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="font-medium text-red-900 mb-4">Confirmação de Exclusão</h3>

              <div className="space-y-3 text-red-800 text-sm mb-4">
                <p>Ao solicitar a exclusão dos meus dados, eu confirmo que:</p>
                <ul className="space-y-1 ml-4">
                  <li>✓ Entendo que esta ação é <strong>irreversível</strong></li>
                  <li>✓ Perco acesso a todo meu histórico médico na plataforma</li>
                  <li>✓ Não poderei recuperar os dados após a exclusão</li>
                  <li>✓ Li e compreendi os prazos e processos envolvidos</li>
                  <li>✓ Considerei as alternativas apresentadas</li>
                </ul>
              </div>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="confirmacao"
                  required
                  checked={formData.confirmacao}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded"
                />
                <span className="text-red-800 text-sm">
                  <strong>Confirmo que desejo prosseguir com a exclusão total e irreversível
                  de todos os meus dados pessoais e de saúde da plataforma Saúde no Bolso.</strong>
                </span>
              </label>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={!formData.confirmacao || isSubmitting}
                className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </span>
                ) : (
                  'Solicitar Exclusão Definitiva'
                )}
              </button>

              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-blue-900 mb-3">Precisa de Ajuda?</h3>
              <p className="text-blue-800 mb-4">
                Nossa equipe está disponível para esclarecer dúvidas sobre o processo de exclusão de dados.
              </p>

              <div className="space-y-2 text-blue-800">
                <p><strong>E-mail:</strong> privacidade@saudenobolso.com</p>
                <p><strong>WhatsApp:</strong> +55 (48) 9672-8482</p>
                <p><strong>Horário:</strong> Segunda a Sexta, 8h às 18h</p>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-blue-700 text-sm">
                  <strong>Links Úteis:</strong>
                  <br />
                  <a href="/politica-privacidade" className="hover:underline">Política de Privacidade</a> |
                  <a href="/termos-servico" className="hover:underline ml-2">Termos de Serviço</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}