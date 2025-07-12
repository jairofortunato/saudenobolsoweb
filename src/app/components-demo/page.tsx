'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Modal,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Loading,
  Alert,
  Toast,
} from '../../../components';

export default function ComponentsDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-slate-800">
            🎨 Saúde no Bolso - Base Components
          </h1>
          <p className="text-lg text-slate-600">
            Rounded shapes, pastel colors, delightful microinteractions, and beautiful Poppins typography
          </p>
        </div>

        {/* Buttons Section */}
        <Card variant="soft" padding="lg">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>
              Bubbly buttons with smooth hover animations and pastel gradients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="success">Success Button</Button>
              <Button variant="warning">Warning Button</Button>
              <Button variant="danger">Danger Button</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button loading>Loading Button</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Inputs Section */}
        <Card variant="blue" padding="lg">
          <CardHeader>
            <CardTitle>Input Fields</CardTitle>
            <CardDescription>
              Soft, rounded inputs with validation states and smooth focus transitions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Nome Completo"
                placeholder="Digite seu nome"
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
              />
              <Input 
                label="Email"
                type="email"
                placeholder="seu@email.com"
                variant="success"
                helperText="Email válido"
              />
              <Input 
                label="Senha"
                type="password"
                placeholder="••••••••"
                error="Senha deve ter pelo menos 8 caracteres"
              />
              <Input 
                label="Carregando..."
                placeholder="Aguarde..."
                loading
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Textarea Section */}
        <Card variant="lavender" padding="lg">
          <CardHeader>
            <CardTitle>Textarea Fields</CardTitle>
            <CardDescription>
              Multi-line text areas with Poppins font and black text color
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea 
                label="Observações Médicas"
                placeholder="Digite suas observações aqui..."
                rows={4}
              />
              <Textarea 
                label="Histórico Familiar"
                placeholder="Descreva o histórico médico da família..."
                variant="success"
                helperText="Informações salvas automaticamente"
                rows={4}
              />
              <Textarea 
                label="Sintomas"
                placeholder="Descreva os sintomas..."
                error="Campo obrigatório"
                rows={3}
                size="sm"
              />
              <Textarea 
                label="Notas do Doutor"
                placeholder="Aguarde..."
                loading
                disabled
                rows={3}
                size="lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="pink" hover="lift">
            <CardHeader>
              <CardTitle>Medicamentos</CardTitle>
              <CardDescription>12 registros</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Seus medicamentos atuais e histórico de uso.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="primary" size="sm">Ver Todos</Button>
            </CardFooter>
          </Card>

          <Card variant="green" hover="scale">
            <CardHeader>
              <CardTitle>Exames</CardTitle>
              <CardDescription>8 resultados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Resultados de exames e análises médicas.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="success" size="sm">Consultar</Button>
            </CardFooter>
          </Card>

          <Card variant="lavender" hover="glow">
            <CardHeader>
              <CardTitle>Consultas</CardTitle>
              <CardDescription>5 agendadas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Histórico e próximas consultas médicas.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" size="sm">Agendar</Button>
            </CardFooter>
          </Card>
        </div>

        {/* Loading States Section */}
        <Card variant="yellow" padding="lg">
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>
              Different loading animations with pastel colors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <h4 className="font-medium text-slate-700">Spinner</h4>
                <Loading type="spinner" variant="primary" size="lg" />
                <Loading type="spinner" variant="secondary" size="md" />
                <Loading type="spinner" variant="success" size="sm" />
              </div>
              <div className="text-center space-y-4">
                <h4 className="font-medium text-slate-700">Dots</h4>
                <Loading type="dots" variant="warning" size="lg" />
                <Loading type="dots" variant="danger" size="md" />
                <Loading type="dots" variant="lavender" size="sm" />
              </div>
              <div className="text-center space-y-4">
                <h4 className="font-medium text-slate-700">Pulse</h4>
                <Loading type="pulse" variant="primary" size="lg" />
                <Loading type="pulse" variant="secondary" size="md" />
                <Loading type="pulse" variant="success" size="sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Section */}
        <div className="space-y-4">
          <Alert
            variant="success"
            title="Dados salvos com sucesso!"
            description="Suas informações foram atualizadas no sistema."
            closable
            onClose={() => console.log('Alert closed')}
          />
          <Alert
            variant="warning"
            title="Atenção"
            description="Algumas informações podem estar desatualizadas."
            closable
            onClose={() => console.log('Warning closed')}
          />
          <Alert
            variant="info"
            title="Nova funcionalidade"
            description="Agora você pode exportar seus dados em PDF."
          />
        </div>

        {/* Interactive Demo */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>Interactive Demo</CardTitle>
            <CardDescription>
              Test the modal and toast components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="primary" 
                onClick={() => setIsModalOpen(true)}
              >
                Open Modal
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowToast(true)}
              >
                Show Toast
              </Button>
              <Button 
                variant="success" 
                onClick={() => window.location.href = '/layout-demo'}
              >
                🏗️ View Layout Demo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Beautiful Modal"
          description="This modal showcases the smooth animations and design system."
          size="md"
        >
          <div className="space-y-4">
            <p className="text-slate-600">
              This modal demonstrates the smooth animations, rounded corners, and 
              backdrop blur effects of our design system.
            </p>
            <Input 
              label="Test Input"
              placeholder="Type something..."
            />
            <Textarea 
              label="Test Textarea"
              placeholder="Type your message here..."
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                onClick={() => setIsModalOpen(false)}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* Toast */}
        <Toast
          show={showToast}
          variant="success"
          title="Toast Notification"
          description="This is a beautiful toast with smooth animations!"
          onClose={() => setShowToast(false)}
          duration={3000}
          position="top-right"
        />
      </div>
    </div>
  );
} 