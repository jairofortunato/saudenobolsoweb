'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/doctor/configuracoes');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full border border-gray-300 p-8">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 border-2 border-black mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-medium text-black mb-2">
            Pagamento Confirmado
          </h1>
          <p className="text-sm text-gray-600">
            Sua assinatura Professional está ativa
          </p>
        </div>

        <div className="border border-gray-300 p-4 mb-6 space-y-2 text-sm">
          <div className="flex items-center">
            <span className="text-black mr-2">✓</span>
            <span className="text-gray-700">5.240 minutos disponíveis (~87h)</span>
          </div>
          <div className="flex items-center">
            <span className="text-black mr-2">✓</span>
            <span className="text-gray-700">Prontuários ilimitados</span>
          </div>
          <div className="flex items-center">
            <span className="text-black mr-2">✓</span>
            <span className="text-gray-700">Transcrição em tempo real</span>
          </div>
          <div className="flex items-center">
            <span className="text-black mr-2">✓</span>
            <span className="text-gray-700">Suporte prioritário</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mb-6">
          Redirecionando para configurações em 5 segundos...
        </p>

        <button
          onClick={() => router.push('/doctor/configuracoes')}
          className="w-full bg-black text-white hover:bg-gray-800 py-3 px-4 border border-black font-medium transition-colors text-sm"
        >
          Ir para Configurações
        </button>

        {sessionId && (
          <p className="text-xs text-gray-400 text-center mt-4">
            ID: {sessionId.substring(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full border border-gray-300 p-8">
          <div className="mb-6 text-center">
            <div className="w-16 h-16 border-2 border-black mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="text-2xl font-medium text-black mb-2">
              Pagamento Confirmado
            </h1>
            <p className="text-sm text-gray-600">
              Carregando...
            </p>
          </div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
