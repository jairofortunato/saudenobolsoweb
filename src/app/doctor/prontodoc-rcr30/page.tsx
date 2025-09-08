'use client';

/**
 * =====================================
 * RCR-30 CONSULTATION PAGE ROUTE
 * =====================================
 * 
 * Next.js page route for the RCR-30 consultation interface.
 * Integrates with the dashboard layout and provides the complete RCR-30 workflow.
 */

import { RCR30Page } from '../../../../components/rcr-30/RCR30Page';
import { DashboardLayout } from '../../../../components/layout/DashboardLayout';

export default function RCR30ConsultationPage() {
  return (
    <DashboardLayout>
      <RCR30Page />
    </DashboardLayout>
  );
}