'use client';

import React from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button
} from '../../../components';

export default function EmergencyPage() {
  const { user, profile } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout
      title="🚨 Emergência"
      subtitle="Informações críticas para atendimento médico"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Emergência', href: '/emergency' }
      ]}
    >
      <div className="space-y-6">
        {/* Emergency Header */}
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-500 text-2xl mr-3">🚨</div>
            <div>
              <h2 className="text-xl font-bold text-red-800">
                Informações de Emergência
              </h2>
              <p className="text-red-700">
                Mantenha essas informações sempre atualizadas para situações de emergência
              </p>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Patient Details */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader className="bg-red-100">
              <CardTitle className="text-red-800">👤 Dados do Paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <strong className="text-red-700">Nome:</strong>
                <p className="text-slate-700">{profile?.full_name || 'Não informado'}</p>
              </div>
              <div>
                <strong className="text-red-700">CPF:</strong>
                <p className="text-slate-700 font-mono">{profile?.cpf || 'Não informado'}</p>
              </div>
              <div>
                <strong className="text-red-700">PIN:</strong>
                <p className="text-slate-700 font-mono text-xl">{profile?.pin || 'Não informado'}</p>
              </div>
              <div>
                <strong className="text-red-700">Data de Nascimento:</strong>
                <p className="text-slate-700">{profile?.birth_date || 'Não informado'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader className="bg-red-100">
              <CardTitle className="text-red-800">📞 Contato de Emergência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <strong className="text-red-700">Nome:</strong>
                <p className="text-slate-700">{profile?.emergency_contact_name || 'Não informado'}</p>
              </div>
              <div>
                <strong className="text-red-700">Telefone:</strong>
                <p className="text-slate-700 font-mono">{profile?.emergency_contact_phone || 'Não informado'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Critical Medications */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader className="bg-red-100">
              <CardTitle className="text-red-800">💊 Medicamentos Críticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-4xl mb-2">💊</div>
                <p className="text-slate-600">Nenhum medicamento crítico registrado</p>
              </div>
            </CardContent>
          </Card>

          {/* Allergies */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader className="bg-red-100">
              <CardTitle className="text-red-800">⚠️ Alergias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-slate-600">Nenhuma alergia registrada</p>
              </div>
            </CardContent>
          </Card>

          {/* Critical Diseases */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader className="bg-red-100">
              <CardTitle className="text-red-800">🩺 Condições Críticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-4xl mb-2">🩺</div>
                <p className="text-slate-600">Nenhuma condição crítica registrada</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button variant="danger" size="lg">
            📋 Exportar PDF
          </Button>
          <Button variant="secondary" size="lg">
            📱 Gerar QR Code
          </Button>
          <Button variant="success" size="lg">
            📋 Copiar Informações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
} 