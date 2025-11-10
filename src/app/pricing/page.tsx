'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PricingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-300 pb-6 mb-8">
          <h1 className="text-3xl font-medium text-black mb-2">
            Planos ProntoDoc
          </h1>
          <p className="text-sm text-gray-600">
            Escolha o plano ideal para sua prática médica
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
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

        {/* FAQ Section */}
        <div className="border-t border-gray-300 pt-8">
          <h2 className="text-xl font-medium text-black mb-6">
            Perguntas Frequentes
          </h2>
          <div className="space-y-6">
            <div className="border-l-2 border-black pl-4">
              <h3 className="text-sm font-medium text-black mb-1">
                O que significa prontuários ilimitados?
              </h3>
              <p className="text-sm text-gray-600">
                Com o plano Professional, você pode criar quantos prontuários
                quiser, sem restrições de quantidade ou tempo de consulta.
              </p>
            </div>

            <div className="border-l-2 border-black pl-4">
              <h3 className="text-sm font-medium text-black mb-1">
                Como funciona a cobrança?
              </h3>
              <p className="text-sm text-gray-600">
                O plano Professional custa R$ 190 por mês, sem custos adicionais.
                A cobrança é feita automaticamente todo mês no cartão de crédito.
              </p>
            </div>

            <div className="border-l-2 border-black pl-4">
              <h3 className="text-sm font-medium text-black mb-1">
                Posso cancelar a qualquer momento?
              </h3>
              <p className="text-sm text-gray-600">
                Sim! Você pode cancelar sua assinatura a qualquer momento. Você
                continuará tendo acesso até o final do período pago.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
