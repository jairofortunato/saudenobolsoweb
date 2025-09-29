import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de Serviço | Saúde no Bolso',
  description: 'Termos de Serviço do Saúde no Bolso - Condições de uso da plataforma de gestão de saúde',
}

export default function TermosServico() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Termos de Serviço
            </h1>
            <p className="text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="prose max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Aceite dos Termos</h2>
              <p className="text-gray-700 mb-4">
                Bem-vindo ao <strong>Saúde no Bolso</strong>. Estes Termos de Serviço (&quot;Termos&quot;) regem o uso
                de nossa plataforma de gestão de saúde, incluindo aplicativo web, mobile e integração com WhatsApp
                (&quot;Serviços&quot;) operados pela Saúde no Bolso (&quot;nós&quot;, &quot;nosso&quot; ou &quot;nossa&quot;).
              </p>
              <p className="text-gray-700 mb-4">
                Ao acessar ou usar nossos Serviços, você concorda em estar vinculado a estes Termos.
                Se você não concorda com qualquer parte destes termos, não deve usar nossos Serviços.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-800">
                  <strong>Importante:</strong> Este é um serviço de gestão de informações de saúde.
                  Não substituímos consultas médicas, diagnósticos ou tratamentos profissionais.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Descrição dos Serviços</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.1 O que Oferecemos</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Gestão de Prontuários:</strong> Armazenamento seguro e organização de informações de saúde</li>
                <li><strong>Acesso Médico:</strong> Sistema de autenticação CPF + PIN para profissionais de saúde</li>
                <li><strong>Integração WhatsApp:</strong> Comunicação e notificações via WhatsApp Business</li>
                <li><strong>ProntoDoc:</strong> Sistema de transcrição e processamento de dados médicos com IA</li>
                <li><strong>Controle de Medicamentos:</strong> Lembretes e gestão de medicações</li>
                <li><strong>Histórico Médico:</strong> Registro de consultas, exames e procedimentos</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">2.2 Disponibilidade</h3>
              <p className="text-gray-700">
                Embora nos esforcemos para manter os Serviços disponíveis 24/7, pode haver interrupções
                para manutenção, atualizações ou por circunstâncias além do nosso controle.
                Não garantimos disponibilidade ininterrupta.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Cadastro e Conta de Usuário</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">3.1 Elegibilidade</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Você deve ter pelo menos 18 anos de idade</li>
                <li>Para menores, é necessária autorização de pais/responsáveis</li>
                <li>Você deve fornecer informações verdadeiras e atualizadas</li>
                <li>Você deve ser residente no Brasil</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">3.2 Responsabilidades da Conta</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Manter a confidencialidade de seu CPF e PIN de acesso</li>
                <li>Notificar imediatamente sobre uso não autorizado</li>
                <li>Ser responsável por todas as atividades em sua conta</li>
                <li>Manter suas informações atualizadas e precisas</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">3.3 Autenticação Médica</h3>
              <p className="text-gray-700">
                Profissionais de saúde podem acessar seu prontuário mediante autenticação com seu CPF + PIN.
                Este acesso é registrado e auditado para sua segurança.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Uso Aceitável</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">4.1 Você Pode:</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Usar os Serviços para gerenciar suas informações de saúde</li>
                <li>Compartilhar informações com profissionais de saúde autorizados</li>
                <li>Receber notificações e lembretes sobre sua saúde</li>
                <li>Exportar seus dados quando necessário</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">4.2 Você NÃO Pode:</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Fornecer informações falsas ou enganosas</li>
                <li>Compartilhar credenciais de acesso com terceiros</li>
                <li>Tentar acessar contas de outros usuários</li>
                <li>Usar os Serviços para fins ilegais ou não autorizados</li>
                <li>Interferir no funcionamento da plataforma</li>
                <li>Transmitir vírus, malware ou código malicioso</li>
                <li>Fazer engenharia reversa ou tentar extrair código-fonte</li>
                <li>Usar os Serviços para spam ou comunicações não solicitadas</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Informações de Saúde</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">5.1 Natureza das Informações</h3>
              <p className="text-gray-700 mb-4">
                Os Serviços permitem armazenar e gerenciar informações sensíveis de saúde.
                Você é responsável pela veracidade e atualização dessas informações.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">5.2 Não é Aconselhamento Médico</h3>
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <p className="text-red-800">
                  <strong>AVISO IMPORTANTE:</strong> Os Serviços NÃO fornecem aconselhamento médico,
                  diagnóstico ou tratamento. Sempre consulte profissionais de saúde qualificados
                  para questões médicas.
                </p>
              </div>

              <h3 className="text-xl font-medium text-gray-900 mb-3">5.3 Emergências</h3>
              <p className="text-gray-700">
                Em caso de emergência médica, procure atendimento médico imediato.
                Não use os Serviços para comunicar emergências.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Integração WhatsApp</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">6.1 Funcionalidades</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Receber lembretes de medicamentos e consultas</li>
                <li>Comunicação com profissionais de saúde</li>
                <li>Notificações sobre resultados de exames</li>
                <li>Suporte técnico e atendimento ao cliente</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">6.2 Termos Adicionais</h3>
              <p className="text-gray-700">
                O uso do WhatsApp está sujeito aos Termos de Serviço do WhatsApp e políticas da Meta.
                Você deve aceitar esses termos para usar nossa integração.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Inteligência Artificial (IA)</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">7.1 Uso de IA</h3>
              <p className="text-gray-700 mb-4">
                Utilizamos tecnologias de IA para:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Transcrição e processamento de texto médico</li>
                <li>Organização automática de informações de saúde</li>
                <li>Sugestões de categorização de dados</li>
                <li>Detecção de padrões em informações médicas</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">7.2 Limitações da IA</h3>
              <p className="text-gray-700">
                A IA pode cometer erros. Sempre revise e confirme as informações processadas
                automaticamente. A responsabilidade final pela precisão dos dados é sua.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Propriedade Intelectual</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">8.1 Nossos Direitos</h3>
              <p className="text-gray-700 mb-4">
                Todos os direitos, títulos e interesses nos Serviços, incluindo software,
                design, conteúdo e marcas comerciais, pertencem a nós ou nossos licenciadores.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">8.2 Seus Dados</h3>
              <p className="text-gray-700 mb-4">
                Você mantém todos os direitos sobre suas informações pessoais e de saúde.
                Concedemos apenas licença limitada para processar esses dados conforme
                necessário para fornecer os Serviços.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">8.3 Licença de Uso</h3>
              <p className="text-gray-700">
                Concedemos uma licença limitada, não exclusiva e revogável para usar
                os Serviços de acordo com estes Termos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Pagamentos e Assinaturas</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">9.1 Planos Gratuitos e Pagos</h3>
              <p className="text-gray-700 mb-4">
                Oferecemos funcionalidades básicas gratuitas e planos premium pagos.
                Os preços e recursos estão descritos em nosso site.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">9.2 Cobrança</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Cobranças são processadas automaticamente</li>
                <li>Você autoriza débitos recorrentes para assinaturas</li>
                <li>Preços podem ser alterados com 30 dias de antecedência</li>
                <li>Não há reembolsos para períodos parciais</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">9.3 Cancelamento</h3>
              <p className="text-gray-700">
                Você pode cancelar sua assinatura a qualquer momento.
                O acesso aos recursos premium continuará até o final do período pago.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitação de Responsabilidade</h2>

              <div className="bg-gray-50 border-l-4 border-gray-400 p-4 mb-4">
                <p className="text-gray-700 font-medium mb-2">
                  IMPORTANTE: LEIA COM ATENÇÃO
                </p>
                <p className="text-gray-700">
                  Os Serviços são fornecidos &quot;como estão&quot; e &quot;conforme disponíveis&quot;.
                  Não garantimos que sejam livres de erros, seguros ou ininterruptos.
                </p>
              </div>

              <h3 className="text-xl font-medium text-gray-900 mb-3">10.1 Isenção de Garantias</h3>
              <p className="text-gray-700 mb-4">
                Não garantimos:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Precisão completa de dados processados por IA</li>
                <li>Disponibilidade ininterrupta dos Serviços</li>
                <li>Compatibilidade com todos os dispositivos</li>
                <li>Ausência de bugs ou falhas de segurança</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">10.2 Limitação de Danos</h3>
              <p className="text-gray-700">
                Nossa responsabilidade por danos está limitada ao valor pago pelos Serviços
                nos últimos 12 meses. Não seremos responsáveis por danos indiretos,
                consequenciais ou punitivos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Rescisão</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">11.1 Por Você</h3>
              <p className="text-gray-700 mb-4">
                Você pode encerrar sua conta a qualquer momento entrando em contato conosco.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">11.2 Por Nós</h3>
              <p className="text-gray-700 mb-4">
                Podemos suspender ou encerrar sua conta se:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Você violar estes Termos</li>
                <li>Usar os Serviços de forma inadequada</li>
                <li>Não pagar por serviços premium</li>
                <li>Por razões legais ou de segurança</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">11.3 Após a Rescisão</h3>
              <p className="text-gray-700">
                Após o encerramento, você pode solicitar uma cópia de seus dados
                por até 90 dias, após os quais serão excluídos permanentemente.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Conformidade Legal</h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">12.1 Legislação Aplicável</h3>
              <p className="text-gray-700 mb-4">
                Operamos em conformidade com:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Lei Geral de Proteção de Dados (LGPD)</li>
                <li>Código de Defesa do Consumidor</li>
                <li>Regulamentações do Conselho Federal de Medicina</li>
                <li>Lei do Marco Civil da Internet</li>
                <li>Normas da ANVISA aplicáveis</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">12.2 Relatórios e Auditoria</h3>
              <p className="text-gray-700">
                Mantemos registros de acesso e uso conforme exigido por lei
                e disponibilizamos para autoridades competentes quando solicitado.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Alterações nos Termos</h2>

              <p className="text-gray-700 mb-4">
                Podemos atualizar estes Termos periodicamente. Alterações significativas
                serão notificadas com pelo menos 30 dias de antecedência através de:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Notificação na plataforma</li>
                <li>E-mail para o endereço cadastrado</li>
                <li>Mensagem via WhatsApp</li>
              </ul>
              <p className="text-gray-700">
                O uso continuado dos Serviços após as alterações constitui
                aceitação dos novos termos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Jurisdição e Lei Aplicável</h2>

              <p className="text-gray-700">
                Estes Termos são regidos pelas leis brasileiras.
                Quaisquer disputas serão resolvidas nos tribunais competentes
                de [Cidade/Estado da sede da empresa], renunciando a qualquer outro foro.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contato</h2>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Dúvidas ou Suporte</h3>
                <p className="text-blue-800 mb-4">
                  Para questões sobre estes Termos de Serviço:
                </p>

                <div className="space-y-2 text-blue-800">
                  <p><strong>E-mail:</strong> contato@saudenobolso.com</p>
                  <p><strong>WhatsApp:</strong> +55 (48) 9672-8482</p>
                  <p><strong>Suporte:</strong> suporte@saudenobolso.com</p>
                  <p><strong>Endereço:</strong> [Endereço completo da empresa]</p>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Atendimento</h4>
                  <p className="text-blue-800">
                    Segunda a Sexta: 8h às 18h<br/>
                    Sábado: 8h às 12h<br/>
                    <em>Horário de Brasília</em>
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Estes Termos de Serviço constituem um acordo legal entre você e a Saúde no Bolso.
              </p>
              <p className="text-sm text-gray-600">
                Ao usar nossos serviços, você confirma ter lido, compreendido e concordado com todos os termos acima.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}