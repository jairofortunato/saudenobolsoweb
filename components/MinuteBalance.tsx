'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface MinuteBalanceData {
  tier: string;
  minutes_balance: number;
  total_available: number;
  low_balance_alert: boolean;
  minutes_included: number;
  minutes_purchased: number;
  next_renewal?: string;
  prontuarios_used?: number;
  prontuarios_limit?: number;
}

export default function MinuteBalance() {
  const [balance, setBalance] = useState<MinuteBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-300 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 w-3/4 mb-3"></div>
        <div className="h-8 bg-gray-200 w-1/2"></div>
      </div>
    );
  }

  if (!balance) return null;

  const percentageUsed =
    balance.total_available > 0
      ? ((balance.total_available - balance.minutes_balance) /
          balance.total_available) *
        100
      : 0;

  // Free tier display
  if (balance.tier === 'free') {
    const used = balance.prontuarios_used || 0;
    const limit = balance.prontuarios_limit || 3;
    const remaining = Math.max(0, limit - used);

    return (
      <div className="bg-white border border-gray-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-black">Plano Grátis</h3>
          <span className="text-xs text-gray-600 px-2 py-1 border border-gray-300">
            FREE
          </span>
        </div>

        <div className="mb-4">
          <div className="text-3xl font-medium text-black">
            {remaining}/{limit}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            consultas restantes
          </p>
        </div>

        {remaining === 0 && (
          <div className="mt-4 p-3 bg-gray-100 border-l-2 border-black">
            <p className="text-sm text-black font-medium">
              Limite de consultas atingido
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Faça upgrade para continuar usando
            </p>
          </div>
        )}
      </div>
    );
  }

  // Professional tier display - Unlimited minutes
  return (
    <div className="bg-white border border-gray-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-black">Plano Professional</h3>
        <span className="text-xs text-black px-2 py-1 border border-black font-medium">
          PRO
        </span>
      </div>

      <div className="mb-4">
        <div className="text-3xl font-medium text-black">
          ∞
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Prontuários ilimitados
        </p>
      </div>

      {/* Features */}
      <div className="text-xs text-gray-600 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-black">•</span>
          <span>Transcrição em tempo real</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-black">•</span>
          <span>Templates personalizados</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-black">•</span>
          <span>Suporte prioritário</span>
        </div>
      </div>

      {/* Next renewal */}
      {balance.next_renewal && (
        <div className="mt-4 pt-4 border-t border-gray-300">
          <p className="text-xs text-gray-600">
            Próxima renovação:{' '}
            <span className="text-black font-medium">
              {new Date(balance.next_renewal).toLocaleDateString('pt-BR')}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
