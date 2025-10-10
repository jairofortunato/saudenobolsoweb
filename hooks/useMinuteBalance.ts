import { useState, useEffect, useCallback } from 'react';

export interface MinuteBalanceData {
  tier: 'free' | 'professional';
  minutes_balance: number;
  total_available: number;
  low_balance_alert: boolean;
  minutes_included: number;
  minutes_purchased: number;
  next_renewal?: string;
  prontuarios_limit?: number;
  prontuarios_used?: number;
}

export interface SubscriptionData {
  id: string;
  tier: 'free' | 'professional';
  status: string;
  minutes_balance: number;
  period_end?: string;
}

export function useMinuteBalance() {
  const [balance, setBalance] = useState<MinuteBalanceData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/subscription/status');

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const data = await response.json();
      setBalance(data.balance);
      setSubscription(data.subscription);
      setError(null);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const validateMinutes = useCallback(async (estimatedMinutes: number): Promise<{
    hasEnough: boolean;
    balance: MinuteBalanceData | null;
    message?: string;
  }> => {
    try {
      const response = await fetch('/api/subscription/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estimatedMinutes }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate minutes');
      }

      const data = await response.json();

      return {
        hasEnough: data.hasEnoughMinutes,
        balance: data.balance,
        message: data.hasEnoughMinutes
          ? undefined
          : 'Saldo de minutos insuficiente',
      };
    } catch (err) {
      console.error('Error validating minutes:', err);
      return {
        hasEnough: false,
        balance: null,
        message: 'Erro ao validar saldo de minutos',
      };
    }
  }, []);

  const checkConsultationLimit = useCallback((): {
    canCreate: boolean;
    message?: string;
    upgradeRequired: boolean;
  } => {
    if (!balance || !subscription) {
      return {
        canCreate: false,
        message: 'Carregando informações da assinatura...',
        upgradeRequired: false,
      };
    }

    // Free tier check
    if (subscription.tier === 'free') {
      const prontuariosUsed = balance.prontuarios_used || 0;
      const prontuariosLimit = balance.prontuarios_limit || 3;

      if (prontuariosUsed >= prontuariosLimit) {
        return {
          canCreate: false,
          message: `Você atingiu o limite de ${prontuariosLimit} consultas gratuitas. Faça upgrade para Professional.`,
          upgradeRequired: true,
        };
      }

      return {
        canCreate: true,
        message: `Consulta ${prontuariosUsed + 1} de ${prontuariosLimit}`,
        upgradeRequired: false,
      };
    }

    // Professional tier check
    if (subscription.tier === 'professional') {
      if (balance.minutes_balance <= 0) {
        return {
          canCreate: false,
          message: 'Saldo de minutos esgotado. Aguarde o reset mensal.',
          upgradeRequired: false,
        };
      }

      return {
        canCreate: true,
        message: `${balance.minutes_balance.toLocaleString('pt-BR')} minutos disponíveis`,
        upgradeRequired: false,
      };
    }

    return {
      canCreate: false,
      message: 'Status da assinatura desconhecido',
      upgradeRequired: false,
    };
  }, [balance, subscription]);

  useEffect(() => {
    fetchBalance();

    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000);

    return () => clearInterval(interval);
  }, [fetchBalance]);

  return {
    balance,
    subscription,
    loading,
    error,
    fetchBalance,
    validateMinutes,
    checkConsultationLimit,
  };
}
