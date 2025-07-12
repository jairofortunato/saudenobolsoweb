'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  NovaEntradaModal
} from '../../../components';
import { getDisplayName } from '../../../lib/auth-utils';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [isNovaEntradaModalOpen, setIsNovaEntradaModalOpen] = useState(false);

  // DashboardLayout will handle cases where user or profile is missing
  if (!user) {
    return null;
  }

  const handleCategoryClick = (category: string) => {
    router.push(`/${category}`);
  };

  const handleEmergencyClick = () => {
    router.push('/emergency');
  };

  const handleNovaEntradaClick = () => {
    setIsNovaEntradaModalOpen(true);
  };

  const handleNovaEntradaSubmit = (data: { category: string; content: string }) => {
    console.log('Nova entrada submitted:', data);
    // TODO: Implement actual submission logic
    // For now, just log the data
  };

  // If profile is missing, DashboardLayout will show a loading state
  return (
    <DashboardLayout
      title={`${profile ? getDisplayName(profile) : 'Usuário'}`}
      subtitle="Gerencie suas informações médicas de forma segura"
      breadcrumbs={[
      ]}
    > 
      {profile ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            
    

            {/* Emergency Card - at the top for all users */}
            <Card className="md:col-span-2 lg:col-span-3 bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <Button 
                  variant="danger" 
                  size="lg" 
                  className="w-full transform hover:scale-105 transition-transform"
                  onClick={handleEmergencyClick}
                >
                  🚨 Emergência
                </Button>
              </CardContent>
            </Card>
          
            {/* Quick Actions for Patients */}
            {profile.role === 'patient' && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>💊 Medicamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      Gerencie seus medicamentos ativos
                    </p>
                    <Button 
                      variant="primary" 
                      size="lg" 
                      className="w-full"
                      onClick={() => handleCategoryClick('medications')}
                    >
                      Ver Medicamentos
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>⚠️ Alergias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      Registre suas alergias e reações
                    </p>
                    <Button 
                      variant="warning" 
                      size="lg" 
                      className="w-full"
                      onClick={() => handleCategoryClick('allergies')}
                    >
                      Ver Alergias
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>🔬 Exames</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      Acompanhe seus exames médicos
                    </p>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      className="w-full"
                      onClick={() => handleCategoryClick('exams')}
                    >
                      Ver Exames
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>🩺 Doenças</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      Gerencie suas condições médicas
                    </p>
                    <Button 
                      variant="danger" 
                      size="lg" 
                      className="w-full"
                      onClick={() => handleCategoryClick('diseases')}
                    >
                      Ver Doenças
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>👩‍⚕️ Consultas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      Histórico de consultas médicas
                    </p>
                    <Button 
                      variant="success" 
                      size="lg" 
                      className="w-full"
                      onClick={() => handleCategoryClick('consultations')}
                    >
                      Ver Consultas
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Quick Actions for Doctors */}
            {profile.role === 'doctor' && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>🔍 Buscar Paciente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      Busque pacientes por CPF + PIN
                    </p>
                    <Button 
                      variant="primary" 
                      className="w-full"
                      onClick={() => router.push('/doctor/search')}
                    >
                      Buscar Paciente
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>🚨 Acesso de Emergência</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      Acesso rápido em situações de emergência
                    </p>
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => router.push('/doctor/emergency-access')}
                    >
                      Acesso de Emergência
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Nova Entrada Button - Fixed at bottom for patients */}
          {profile.role === 'patient' && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
              <Button 
                variant="success" 
                size="lg"
                className="px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                onClick={handleNovaEntradaClick}
              >
                ➕ Nova Entrada
              </Button>
            </div>
          )}

          {/* Nova Entrada Modal */}
          <NovaEntradaModal
            open={isNovaEntradaModalOpen}
            onClose={() => setIsNovaEntradaModalOpen(false)}
            onSubmit={handleNovaEntradaSubmit}
          />
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-slate-600">Carregando informações do perfil...</p>
        </div>
      )}
    </DashboardLayout>
  );
} 