'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button
} from '../../../components';

export default function NovaEntradaPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const handleCategorySelect = (category: string) => {
    // Navigate to the specific category page for adding an entry
    router.push(`/${category}?action=add`);
  };

  return (
    <DashboardLayout
      title="➕ Nova Entrada"
      subtitle="Adicione novas informações médicas"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Nova Entrada', href: '/nova-entrada' }
      ]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Que tipo de informação você quer adicionar?
          </h2>
          <p className="text-slate-600">
            Escolha uma categoria para adicionar uma nova entrada médica
          </p>
        </div>

        {/* Category Selection */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Medications */}
          <Card className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="text-6xl mb-2">💊</div>
              <CardTitle className="text-blue-800">Medicamento</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-4">
                Adicione um novo medicamento ao seu tratamento
              </p>
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full"
                onClick={() => handleCategorySelect('medications')}
              >
                ➕ Adicionar Medicamento
              </Button>
            </CardContent>
          </Card>

          {/* Allergies */}
          <Card className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="text-6xl mb-2">⚠️</div>
              <CardTitle className="text-orange-800">Alergia</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-4">
                Registre uma nova alergia ou reação adversa
              </p>
              <Button 
                variant="warning" 
                size="lg" 
                className="w-full"
                onClick={() => handleCategorySelect('allergies')}
              >
                ➕ Adicionar Alergia
              </Button>
            </CardContent>
          </Card>

          {/* Exams */}
          <Card className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="text-6xl mb-2">🔬</div>
              <CardTitle className="text-purple-800">Exame</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-4">
                Adicione um novo exame médico realizado
              </p>
              <Button 
                variant="secondary" 
                size="lg" 
                className="w-full"
                onClick={() => handleCategorySelect('exams')}
              >
                ➕ Adicionar Exame
              </Button>
            </CardContent>
          </Card>

          {/* Diseases */}
          <Card className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="text-6xl mb-2">🩺</div>
              <CardTitle className="text-red-800">Condição Médica</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-4">
                Registre uma nova condição médica ou diagnóstico
              </p>
              <Button 
                variant="danger" 
                size="lg" 
                className="w-full"
                onClick={() => handleCategorySelect('diseases')}
              >
                ➕ Adicionar Condição
              </Button>
            </CardContent>
          </Card>

          {/* Consultations */}
          <Card className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-105">
            <CardHeader className="text-center">
              <div className="text-6xl mb-2">👩‍⚕️</div>
              <CardTitle className="text-green-800">Consulta</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-4">
                Registre uma nova consulta médica realizada
              </p>
              <Button 
                variant="success" 
                size="lg" 
                className="w-full"
                onClick={() => handleCategorySelect('consultations')}
              >
                ➕ Adicionar Consulta
              </Button>
            </CardContent>
          </Card>

          {/* AI Assistant */}
          <Card className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardHeader className="text-center">
              <div className="text-6xl mb-2">🤖</div>
              <CardTitle className="text-blue-800">Assistente IA</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-4">
                Use IA para processar texto, voz ou imagem
              </p>
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                onClick={() => router.push('/ai-assistant')}
              >
                ✨ Usar Assistente IA
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Dicas para adicionar informações
          </h3>
          <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-600">
            <div>
              <div className="text-2xl mb-1">📝</div>
              <p>Seja específico com nomes e dosagens</p>
            </div>
            <div>
              <div className="text-2xl mb-1">📅</div>
              <p>Inclua sempre as datas dos eventos</p>
            </div>
            <div>
              <div className="text-2xl mb-1">🔍</div>
              <p>Use o assistente IA para ajudar</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 