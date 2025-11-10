'use client';

import { useRouter } from 'next/navigation';

export default function PaymentCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full border border-gray-300 p-8">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 border-2 border-gray-400 mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl text-gray-600">×</span>
          </div>
          <h1 className="text-2xl font-medium text-black mb-2">
            Pagamento Cancelado
          </h1>
          <p className="text-sm text-gray-600">
            Nenhuma cobrança foi realizada
          </p>
        </div>

        <div className="border border-gray-300 p-4 mb-6 bg-gray-50">
          <p className="text-sm text-gray-700">
            Você ainda pode usar suas{' '}
            <strong className="text-black">5 consultas gratuitas</strong> para
            testar o ProntoDoc antes de assinar.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/pricing')}
            className="w-full bg-black text-white hover:bg-gray-800 py-3 px-4 border border-black font-medium transition-colors text-sm"
          >
            Ver Planos Novamente
          </button>

          <button
            onClick={() => router.push('/doctor/dashboard')}
            className="w-full bg-white text-black hover:bg-gray-50 py-3 px-4 border border-gray-300 font-medium transition-colors text-sm"
          >
            Voltar ao Dashboard
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Precisa de ajuda? Entre em contato com nosso suporte.
        </p>
      </div>
    </div>
  );
}
