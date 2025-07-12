'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Layout,
  AuthLayout,
  DashboardLayout,
} from '../../../components';

export default function LayoutDemo() {
  const [currentLayout, setCurrentLayout] = useState<'default' | 'auth' | 'dashboard'>('default');

  if (currentLayout === 'auth') {
    return (
      <AuthLayout
        title="Layout Demo - Auth"
        subtitle="Demonstração do layout de autenticação"
        showBackLink
        backLinkHref="/layout-demo"
        backLinkText="Voltar para demo"
      >
        <div className="space-y-6">
          <Card variant="soft">
            <CardHeader>
              <CardTitle>AuthLayout</CardTitle>
              <CardDescription>
                Layout especializado para páginas de autenticação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Este layout fornece uma interface centrada e bonita para signup, signin e outras páginas de autenticação.
              </p>
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  ✨ Características:
                </p>
                <ul className="text-xs text-slate-600 space-y-1 ml-4">
                  <li>• Fundo com gradientes suaves</li>
                  <li>• Logo centralizado</li>
                  <li>• Card com backdrop blur</li>
                  <li>• Elementos decorativos animados</li>
                  <li>• Footer com links úteis</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex gap-3">
            <Button onClick={() => setCurrentLayout('default')} variant="outline">
              Ver Layout Padrão
            </Button>
            <Button onClick={() => setCurrentLayout('dashboard')} variant="primary">
              Ver Dashboard
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (currentLayout === 'dashboard') {
    return (
      <DashboardLayout
        title="Layout Demo - Dashboard"
        subtitle="Demonstração do layout de dashboard para usuários autenticados"
        breadcrumbs={[
          { label: 'Demo', href: '/layout-demo' },
          { label: 'Dashboard Layout' },
        ]}
        actions={
          <div className="flex gap-3">
            <Button onClick={() => setCurrentLayout('default')} variant="outline" size="sm">
              Ver Layout Padrão
            </Button>
            <Button onClick={() => setCurrentLayout('auth')} variant="secondary" size="sm">
              Ver Auth Layout
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="pink" hover="lift">
            <CardHeader>
              <CardTitle>Header Component</CardTitle>
              <CardDescription>
                Navegação principal com logo e menu do usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Logo responsivo</li>
                <li>• Menu desktop/mobile</li>
                <li>• Avatar do usuário</li>
                <li>• Botão de emergência</li>
                <li>• Sign out</li>
              </ul>
            </CardContent>
          </Card>

          <Card variant="blue" hover="lift">
            <CardHeader>
              <CardTitle>Sidebar Component</CardTitle>
              <CardDescription>
                Navegação lateral recolhível
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Navegação por role</li>
                <li>• Indicador de página ativa</li>
                <li>• Modo colapsado</li>
                <li>• Info do usuário</li>
                <li>• Acesso de emergência</li>
              </ul>
            </CardContent>
          </Card>

          <Card variant="green" hover="lift">
            <CardHeader>
              <CardTitle>DashboardLayout</CardTitle>
              <CardDescription>
                Layout completo para páginas autenticadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Header + Sidebar integrados</li>
                <li>• Breadcrumbs automáticos</li>
                <li>• Área de ações da página</li>
                <li>• Loading states</li>
                <li>• Mobile responsivo</li>
              </ul>
            </CardContent>
          </Card>

          <Card variant="lavender" hover="scale">
            <CardHeader>
              <CardTitle>Layout Flexível</CardTitle>
              <CardDescription>
                Suporte a diferentes tipos de conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Container width configurável</li>
                <li>• Sidebar opcional</li>
                <li>• Headers personalizáveis</li>
                <li>• Spacing consistente</li>
              </ul>
            </CardContent>
          </Card>

          <Card variant="yellow" hover="glow">
            <CardHeader>
              <CardTitle>Microinterações</CardTitle>
              <CardDescription>
                Animações suaves e feedback visual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Hover effects</li>
                <li>• Transitions suaves</li>
                <li>• Scale transforms</li>
                <li>• Loading states</li>
              </ul>
            </CardContent>
          </Card>

          <Card variant="soft" hover="lift">
            <CardHeader>
              <CardTitle>Design System</CardTitle>
              <CardDescription>
                Consistência visual em todos os layouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Poppins typography</li>
                <li>• Rounded corners</li>
                <li>• Pastel gradients</li>
                <li>• Consistent spacing</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Como usar os Layouts</CardTitle>
            <CardDescription>
              Exemplos de uso dos componentes de layout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <h4 className="font-medium text-slate-800 mb-2">AuthLayout para páginas de autenticação:</h4>
                <code className="text-xs text-slate-600 bg-white p-2 rounded-xl block">
                  {`<AuthLayout title="Entrar" subtitle="Acesse sua conta">
  {/* Formulário de login */}
</AuthLayout>`}
                </code>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-2xl">
                <h4 className="font-medium text-slate-800 mb-2">DashboardLayout para páginas autenticadas:</h4>
                <code className="text-xs text-slate-600 bg-white p-2 rounded-xl block">
                  {`<DashboardLayout 
  title="Medicamentos" 
  subtitle="Gerencie seus medicamentos"
  actions={<Button>Nova Entrada</Button>}
>
  {/* Conteúdo da página */}
</DashboardLayout>`}
                </code>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl">
                <h4 className="font-medium text-slate-800 mb-2">Layout genérico para máxima flexibilidade:</h4>
                <code className="text-xs text-slate-600 bg-white p-2 rounded-xl block">
                  {`<Layout 
  variant="dashboard" 
  showHeader={true} 
  showSidebar={true}
>
  {/* Conteúdo personalizado */}
</Layout>`}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <Layout variant="default" showHeader showSidebar={false}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-800">
            🏗️ Layout Components Demo
          </h1>
          <p className="text-lg text-slate-600">
            Explore os componentes de layout com Poppins, cantos arredondados e gradientes pastéis
          </p>
        </div>

        {/* Layout Options */}
        <Card variant="soft" padding="lg">
          <CardHeader>
            <CardTitle>Tipos de Layout Disponíveis</CardTitle>
            <CardDescription>
              Clique nos botões abaixo para visualizar cada tipo de layout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="default" hover="lift">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>🎯</span>
                    <span>Layout Padrão</span>
                  </CardTitle>
                  <CardDescription>
                    Layout básico com header opcional
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    Ideal para páginas de conteúdo geral, landing pages e páginas estáticas.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setCurrentLayout('default')}
                  >
                    Atual
                  </Button>
                </CardContent>
              </Card>

              <Card variant="blue" hover="lift">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>🔐</span>
                    <span>AuthLayout</span>
                  </CardTitle>
                  <CardDescription>
                    Layout centrado para autenticação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    Perfeito para páginas de login, registro e recuperação de senha.
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setCurrentLayout('auth')}
                  >
                    Visualizar
                  </Button>
                </CardContent>
              </Card>

              <Card variant="pink" hover="lift">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>DashboardLayout</span>
                  </CardTitle>
                  <CardDescription>
                    Layout completo com sidebar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    Layout robusto para páginas autenticadas com navegação lateral.
                  </p>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setCurrentLayout('dashboard')}
                  >
                    Visualizar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="green" hover="lift">
            <CardHeader>
              <CardTitle>✨ Características dos Layouts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span><strong>Responsivo:</strong> Funciona perfeitamente em todos os dispositivos</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span><strong>Acessível:</strong> ARIA labels e navegação por teclado</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span><strong>Animado:</strong> Transições suaves e microinterações</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-pink-500 mt-0.5">•</span>
                  <span><strong>Flexível:</strong> Altamente configurável e reutilizável</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card variant="lavender" hover="scale">
            <CardHeader>
              <CardTitle>🎨 Design System</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  <span><strong>Tipografia:</strong> Poppins em todos os textos</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span><strong>Cores:</strong> Gradientes pastéis suaves</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span><strong>Bordas:</strong> Cantos arredondados consistentes</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span><strong>Spacing:</strong> Espaçamento harmonioso</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
} 