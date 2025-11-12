'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase';

interface SubscriptionStatus {
  tier: string;
  status?: string;
  next_renewal?: string;
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setSubscription({
          tier: data.balance?.tier || 'free',
          status: data.balance?.status,
          next_renewal: data.balance?.next_renewal,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Erro ao iniciar processo de pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);

      // Get the current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Portal error:', errorData);
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('Erro ao abrir portal de gerenciamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isProfessional = subscription?.tier === 'professional';

  return (
    <DashboardLayout title="Configurações" className="font-petrona">
      <div className="p-6 m-4 geist-regular">
        <div className="bg-white/30 backdrop-blur-md rounded-2xl border border-slate-200/50 p-6">
          {/* Subscription Management */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-black mb-6 font-geist">
              Gerenciar Assinatura
            </h2>

            {/* Pricing Cards */}
            {loadingStatus ? (
              <div className="grid md:grid-cols-2 gap-6 mb-8 animate-pulse">
                <div className="bg-gray-200 h-96"></div>
                <div className="bg-gray-200 h-96"></div>
              </div>
            ) : isProfessional ? (
              // Professional User - Show active subscription card
              <div className="mb-8">
                <div className="bg-black text-white p-8 relative">
                  <div className="absolute -top-3 right-4">
                    <span className="bg-white text-black px-3 py-1 text-xs font-medium">
                      ATIVO
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-medium text-white">Professional</h2>
                      <span className="text-xs text-white px-2 py-1 border border-white font-medium">
                        PRO
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Sua assinatura está ativa
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-medium text-white">R$ 190</span>
                      <span className="text-sm text-gray-300 ml-2">/mês</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">
                        <strong className="text-white">Prontuários ilimitados</strong>
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">Transcrição em tempo real</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">Templates personalizados</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">Suporte prioritário</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">
                        Sem limites de uso
                      </span>
                    </div>
                  </div>

                  {subscription?.next_renewal && (
                    <div className="mb-6 p-3 bg-white/10 border border-white/20">
                      <p className="text-xs text-gray-300">
                        Próxima renovação:{' '}
                        <span className="text-white font-medium">
                          {new Date(subscription.next_renewal).toLocaleDateString('pt-BR')}
                        </span>
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-gray-100 py-3 px-4 border border-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? 'Processando...' : 'Gerenciar Assinatura'}
                  </button>
                </div>
              </div>
            ) : (
              // Free User - Show upgrade options
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Free Tier */}
                <div className="bg-white border border-gray-300 p-8">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-medium text-black">Grátis</h2>
                      <span className="text-xs text-gray-600 px-2 py-1 border border-gray-300">
                        FREE
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Para experimentar o ProntoDoc
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-medium text-black">R$ 0</span>
                      <span className="text-sm text-gray-600 ml-2">/mês</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex items-start">
                      <span className="text-black mr-2">•</span>
                      <span className="text-gray-700">
                        <strong className="text-black">5 consultas</strong> gratuitas
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-black mr-2">•</span>
                      <span className="text-gray-700">Transcrição de áudio médico</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-black mr-2">•</span>
                      <span className="text-gray-700">
                        Geração de prontuário estruturado
                      </span>
                    </div>
                  </div>

                  <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 py-3 px-4 border border-gray-300 font-medium text-sm cursor-not-allowed"
                  >
                    Plano Atual
                  </button>
                </div>

                {/* Professional Tier */}
                <div className="bg-black text-white p-8 relative">
                  <div className="absolute -top-3 right-4">
                    <span className="bg-white text-black px-3 py-1 text-xs font-medium">
                      RECOMENDADO
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-medium text-white">Professional</h2>
                      <span className="text-xs text-white px-2 py-1 border border-white font-medium">
                        PRO
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Para uso profissional contínuo
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-medium text-white">R$ 190</span>
                      <span className="text-sm text-gray-300 ml-2">/mês</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">
                        <strong className="text-white">Prontuários ilimitados</strong>
                      </span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">Transcrição em tempo real</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">Templates personalizados</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">Suporte prioritário</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span className="text-gray-200">
                        Sem limites de uso
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-gray-100 py-3 px-4 border border-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? 'Processando...' : 'Assinar Professional'}
                  </button>
                </div>
              </div>
            )}

            {/* FAQ Section */}
            <div className="border-t border-gray-300 pt-8">
              <h3 className="text-lg font-medium text-black mb-6">
                Perguntas Frequentes
              </h3>
              <div className="space-y-6">
                <div className="border-l-2 border-black pl-4">
                  <h4 className="text-sm font-medium text-black mb-1">
                    O que significa prontuários ilimitados?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Com o plano Professional, você pode criar quantos prontuários
                    quiser, sem restrições de quantidade ou tempo de consulta.
                  </p>
                </div>

                <div className="border-l-2 border-black pl-4">
                  <h4 className="text-sm font-medium text-black mb-1">
                    Como funciona a cobrança?
                  </h4>
                  <p className="text-sm text-gray-600">
                    O plano Professional custa R$ 190 por mês, sem custos adicionais.
                    A cobrança é feita automaticamente todo mês no cartão de crédito.
                  </p>
                </div>

                <div className="border-l-2 border-black pl-4">
                  <h4 className="text-sm font-medium text-black mb-1">
                    Posso cancelar a qualquer momento?
                  </h4>
                  <p className="text-sm text-gray-600">
                    Sim! Você pode cancelar sua assinatura a qualquer momento. Você
                    continuará tendo acesso até o final do período pago.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
