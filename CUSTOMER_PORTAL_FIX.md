# Customer Portal Fix - Test/Live Mode Mismatch

## Problem
The "Gerenciar Assinatura" button worked in development but failed with a 500 error in production.

## Root Cause
**Test/Live Mode Mismatch:**
- Development environment uses Stripe **TEST mode** keys (`sk_test_...`, `pk_test_...`)
- When users subscribe in development, they get TEST mode customer IDs (e.g., `cus_test_123...`)
- These test customer IDs are saved in the database
- Production environment uses Stripe **LIVE mode** keys (`sk_live_...`, `pk_live_...`)
- When trying to access customer portal with a TEST customer ID using LIVE keys, Stripe returns "No such customer" error
- This caused a 500 Internal Server Error

## Solution Implemented

### 1. Backend API Improvements (`src/app/api/stripe/customer-portal/route.ts`)

**Added Detection:**
- Detects if customer ID is from test mode (starts with `cus_test_`)
- Detects if Stripe keys are in test/live mode (based on `sk_test_` vs `sk_live_` prefix)
- Returns specific error when there's a mismatch

**Better Error Handling:**
- Logs detailed error information for debugging
- Returns specific HTTP status codes (400, 404) instead of generic 500
- Provides helpful error messages in Portuguese

**Error Response Example:**
```json
{
  "error": "Esta assinatura foi criada em modo de teste. Por favor, faça uma nova assinatura no ambiente de produção.",
  "mode_mismatch": true,
  "is_test_customer": true
}
```

### 2. Frontend Improvements (`src/app/doctor/configuracoes/page.tsx`)

**Enhanced Error Display:**
- Parses API error responses
- Shows specific alert messages for different error types:
  - **Test subscription detected**: Explains user needs to create a new subscription with real payment
  - **Customer not found**: Explains this might be a test subscription
  - **Generic errors**: Provides helpful guidance

**User-Friendly Messages:**
```
⚠️ Assinatura de Teste Detectada

Esta assinatura foi criada em modo de teste e não pode ser gerenciada no ambiente de produção.

Para usar o ProntoDoc em produção, por favor:
1. Crie uma nova assinatura com um cartão de crédito real
2. As assinaturas de teste são apenas para desenvolvimento

Entre em contato com o suporte se tiver dúvidas.
```

## How to Test

### Development (Test Mode)
1. Subscribe using test card: `4242 4242 4242 4242`
2. Click "Gerenciar Assinatura"
3. Should redirect to Stripe test mode customer portal

### Production (Live Mode)
1. If user has test subscription:
   - Click "Gerenciar Assinatura"
   - See clear error message explaining need to re-subscribe
2. If user has real subscription:
   - Click "Gerenciar Assinatura"
   - Should redirect to Stripe live mode customer portal

## Environment Variables Check

**Development (.env.local):**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**Production (Vercel/Railway):**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

## Migration Path for Test Users

For users who subscribed in test mode and want to use production:

1. **Option 1 - Manual Migration:**
   - User creates new subscription in production with real payment
   - Admin manually updates subscription status if needed

2. **Option 2 - Self-Service (Recommended):**
   - User sees error message explaining the issue
   - User clicks "Assinar Professional" button to create new subscription
   - System creates new subscription with live payment

## Deployment Checklist

- [x] Update customer portal API endpoint
- [x] Update frontend error handling
- [x] Test in development (test mode)
- [ ] Deploy to production
- [ ] Test in production (live mode)
- [ ] Verify test users get helpful error message
- [ ] Verify real subscriptions work correctly

## Related Files Modified

1. `src/app/api/stripe/customer-portal/route.ts` - Backend API
2. `src/app/doctor/configuracoes/page.tsx` - Frontend settings page
3. `CUSTOMER_PORTAL_FIX.md` - This documentation

## Logs to Monitor

**Development:**
```
[CUSTOMER PORTAL] Subscription data: { customer_id: 'cus_test_...', ... }
[CUSTOMER PORTAL] Portal session created: https://billing.stripe.com/p/session/test_...
```

**Production with test customer:**
```
[CUSTOMER PORTAL] Test customer in live mode: cus_test_...
```

**Production with live customer:**
```
[CUSTOMER PORTAL] Subscription data: { customer_id: 'cus_...', ... }
[CUSTOMER PORTAL] Portal session created: https://billing.stripe.com/p/session/live_...
```
