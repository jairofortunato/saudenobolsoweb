import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Saúde no Bolso',
  description: 'Política de Privacidade do Saúde no Bolso - Como coletamos, usamos e protegemos seus dados pessoais',
}

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Política de Privacidade
            </h1>
            <p className="text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introdução</h2>
              <p className="text-gray-700 mb-4">
                A <strong>Saúde no Bolso</strong> (&quot;nós&quot;, &quot;nosso&quot; ou &quot;nossa&quot;) está comprometida em proteger e respeitar sua privacidade.
                Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações quando você
                usa nossa plataforma de gestão de saúde, incluindo nosso aplicativo web, mobile e integração com WhatsApp.
              </p>
              <p className="text-gray-700">
                Ao usar nossos serviços, você concorda com a coleta e uso de informações de acordo com esta política.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Informações que Coletamos</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.1 Informações Pessoais</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Nome completo</li>
                <li>CPF (Cadastro de Pessoa Física)</li>
                <li>Data de nascimento</li>
                <li>Endereço de e-mail</li>
                <li>Número de telefone</li>
                <li>Endereço residencial</li>
                <li>PIN de acesso personalizado</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.2 Informações de Saúde</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Histórico médico e diagnósticos</li>
                <li>Medicamentos e prescrições</li>
                <li>Alergias e restrições médicas</li>
                <li>Resultados de exames médicos</li>
                <li>Consultas e procedimentos médicos</li>
                <li>Dados biométricos básicos (altura, peso, pressão arterial, etc.)</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.3 Informações Técnicas</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Endereço IP e localização aproximada</li>
                <li>Tipo de dispositivo e sistema operacional</li>
                <li>Navegador e versão</li>
                <li>Cookies e tecnologias similares</li>
                <li>Logs de acesso e uso da plataforma</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.4 Comunicações</h3>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Mensagens enviadas através do WhatsApp Business</li>
                <li>E-mails trocados com nossa equipe</li>
                <li>Feedback e avaliações sobre nossos serviços</li>
                <li>Gravações de voz (quando autorizadas para transcrição médica)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Como Usamos suas Informações</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">3.1 Finalidades do Tratamento</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Prestação de serviços:</strong> Gerenciar seus dados de saúde e facilitar o acesso a informações médicas</li>
                <li><strong>Comunicação:</strong> Enviar notificações, lembretes e comunicações relacionadas à sua saúde</li>
                <li><strong>Segurança:</strong> Proteger sua conta e detectar atividades suspeitas</li>
                <li><strong>Melhorias:</strong> Desenvolver e aprimorar nossos serviços</li>
                <li><strong>Conformidade:</strong> Cumprir obrigações legais e regulamentares</li>
                <li><strong>Suporte:</strong> Fornecer atendimento ao cliente e suporte técnico</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">3.2 Base Legal</h3>
              <p className="text-gray-700 mb-4">
                Processamos seus dados com base nas seguintes bases legais:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li><strong>Consentimento:</strong> Para dados sensíveis de saúde e comunicações via WhatsApp</li>
                <li><strong>Execução contratual:</strong> Para fornecer os serviços solicitados</li>
                <li><strong>Interesse legítimo:</strong> Para melhorar nossos serviços e garantir segurança</li>
                <li><strong>Obrigação legal:</strong> Para cumprir requisitos legais de saúde</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Compartilhamento de Informações</h2>

              <p className="text-gray-700 mb-4">
                <strong>Não vendemos, alugamos ou comercializamos suas informações pessoais.</strong>
                Compartilhamos suas informações apenas nas seguintes situações:
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">4.1 Com Profissionais de Saúde</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Médicos autorizados que acessam com CPF + PIN</li>
                <li>Profissionais de saúde durante consultas e procedimentos</li>
                <li>Laboratórios e clínicas para exames e resultados</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">4.2 Com Prestadores de Serviços</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provedores de hospedagem e infraestrutura em nuvem</li>
                <li>Serviços de inteligência artificial para processamento de texto</li>
                <li>Provedores de comunicação (WhatsApp Business API)</li>
                <li>Serviços de análise e monitoramento</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">4.3 Por Obrigação Legal</h3>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Quando exigido por lei ou ordem judicial</li>
                <li>Para proteger direitos, propriedade ou segurança</li>
                <li>Em casos de emergência médica</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Proteção de Dados</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">5.1 Medidas de Segurança</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Criptografia:</strong> Dados criptografados em trânsito e em repouso</li>
                <li><strong>Controle de acesso:</strong> Autenticação CPF + PIN e controles rigorosos</li>
                <li><strong>Monitoramento:</strong> Detecção de atividades suspeitas 24/7</li>
                <li><strong>Backups seguros:</strong> Cópias de segurança criptografadas</li>
                <li><strong>Auditoria:</strong> Logs detalhados de todas as ações</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">5.2 Armazenamento</h3>
              <p className="text-gray-700">
                Seus dados são armazenados em servidores seguros localizados no Brasil,
                em conformidade com a Lei Geral de Proteção de Dados (LGPD) e regulamentações de saúde.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Seus Direitos</h2>

              <p className="text-gray-700 mb-4">
                De acordo com a LGPD, você tem os seguintes direitos:
              </p>

              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Acesso:</strong> Solicitar informações sobre o tratamento de seus dados</li>
                <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li><strong>Exclusão:</strong> Solicitar a eliminação de dados desnecessários ou excessivos</li>
                <li><strong>Portabilidade:</strong> Solicitar a transferência de dados para outro provedor</li>
                <li><strong>Revogação:</strong> Revogar seu consentimento a qualquer momento</li>
                <li><strong>Informação:</strong> Obter informações sobre compartilhamento de dados</li>
                <li><strong>Oposição:</strong> Opor-se ao tratamento em certas circunstâncias</li>
              </ul>

              <p className="text-gray-700">
                Para exercer seus direitos, entre em contato através do e-mail:
                <strong> privacidade@saudenobolso.com</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Integração WhatsApp</h2>

              <p className="text-gray-700 mb-4">
                Nossa integração com o WhatsApp Business permite comunicação segura para:
              </p>

              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Lembretes de consultas e medicamentos</li>
                <li>Envio de resultados de exames</li>
                <li>Comunicação com profissionais de saúde</li>
                <li>Suporte e atendimento ao cliente</li>
              </ul>

              <p className="text-gray-700">
                <strong>Importante:</strong> As mensagens do WhatsApp estão sujeitas às políticas de privacidade
                da Meta (Facebook). Recomendamos revisar também a política de privacidade do WhatsApp.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies e Tecnologias Similares</h2>

              <p className="text-gray-700 mb-4">
                Utilizamos cookies e tecnologias similares para:
              </p>

              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Manter sua sessão ativa e segura</li>
                <li>Personalizar sua experiência</li>
                <li>Analisar o uso da plataforma</li>
                <li>Melhorar nossos serviços</li>
              </ul>

              <p className="text-gray-700">
                Você pode configurar seu navegador para recusar cookies, mas isso pode afetar
                a funcionalidade da plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Retenção de Dados</h2>

              <p className="text-gray-700 mb-4">
                Mantemos seus dados pelo tempo necessário para:
              </p>

              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Dados de saúde:</strong> Conforme exigido por lei (mínimo 20 anos)</li>
                <li><strong>Dados de conta:</strong> Enquanto sua conta estiver ativa</li>
                <li><strong>Dados de comunicação:</strong> Por 5 anos após a última interação</li>
                <li><strong>Logs técnicos:</strong> Por 6 meses para segurança</li>
              </ul>

              <p className="text-gray-700">
                Após o período de retenção, os dados são excluídos de forma segura e irreversível.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Menores de Idade</h2>

              <p className="text-gray-700">
                Nossos serviços são destinados a pessoas com 18 anos ou mais. Para menores de idade,
                é necessária a autorização e acompanhamento de pais ou responsáveis legais.
                Dados de menores são tratados com proteção adicional conforme a LGPD.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Alterações nesta Política</h2>

              <p className="text-gray-700">
                Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos sobre
                mudanças significativas através da plataforma, e-mail ou WhatsApp.
                O uso continuado de nossos serviços após as alterações constitui aceitação da nova política.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contato</h2>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Entre em Contato</h3>
                <p className="text-blue-800 mb-2">
                  Para dúvidas sobre esta Política de Privacidade ou exercer seus direitos:
                </p>

                <div className="space-y-2 text-blue-800">
                  <p><strong>E-mail:</strong> privacidade@saudenobolso.com</p>
                  <p><strong>WhatsApp:</strong> +55 (48) 9672-8482</p>
                  <p><strong>Endereço:</strong> [Endereço da empresa]</p>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Encarregado de Proteção de Dados (DPO)</h4>
                  <p className="text-blue-800">
                    <strong>E-mail:</strong> dpo@saudenobolso.com
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Autoridade de Proteção de Dados</h2>

              <p className="text-gray-700">
                Se você tiver preocupações sobre como tratamos seus dados pessoais,
                pode entrar em contato com a Autoridade Nacional de Proteção de Dados (ANPD):
              </p>

              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <p><strong>ANPD - Autoridade Nacional de Proteção de Dados</strong></p>
                <p>Website: <a href="https://www.gov.br/anpd/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">www.gov.br/anpd</a></p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Esta Política de Privacidade está em conformidade com a Lei Geral de Proteção de Dados (LGPD)
              e regulamentações aplicáveis ao setor de saúde no Brasil.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}