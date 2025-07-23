'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { TitleToggleCard } from '../../../components';

export default function TitleToggleDemoPage() {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const demoItems = [
    {
      id: '1',
      title: '🩺 Consulta Cardiológica',
      type: 'consultation',
      details: {
        date: '2024-01-15',
        doctor: 'Dr. João Silva',
        status: 'Agendada',
        location: 'Hospital Central'
      }
    },
    {
      id: '2', 
      title: '📊 Hemograma Completo',
      type: 'exam',
      details: {
        date: '2024-01-20',
        lab: 'Lab Exames',
        status: 'Pendente',
        results: 'Aguardando'
      }
    },
    {
      id: '3',
      title: '🏥 Alergia a Penicilina',
      type: 'allergy',
      details: {
        severity: 'Grave',
        reaction: 'Urticária e inchaço',
        discovered: '2020-05-10',
        notes: 'Evitar antibióticos da família penicilina'
      }
    }
  ];

  const handleEdit = (id: string) => {
    setEditing(id);
  };

  const handleDelete = (id: string) => {
    setDeleting(id);
    // Simulate API call
    setTimeout(() => {
      setDeleting(null);
      alert(`Item ${id} deletado com sucesso!`);
    }, 1000);
  };

  const handleSave = () => {
    setSaving(true);
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setEditing(null);
      alert('Alterações salvas com sucesso!');
    }, 1000);
  };

  const handleCancel = () => {
    setEditing(null);
  };

  return (
    <DashboardLayout
      title="🎯 TitleToggleCard Demo"
      subtitle="Demonstração do componente TitleToggleCard reutilizável"
    >
      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {demoItems.map((item) => (
            <TitleToggleCard
              key={item.id}
              id={item.id}
              title={item.title}
              isEditing={editing === item.id}
              onEdit={() => handleEdit(item.id)}
              onDelete={() => handleDelete(item.id)}
              onSave={handleSave}
              onCancel={handleCancel}
              deleteConfirmMessage={`Tem certeza que deseja deletar "${item.title}"?`}
              editingTitle={
                <input
                  type="text"
                  defaultValue={item.title}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Editar título"
                />
              }
              isDeleting={deleting === item.id}
              isSaving={saving}
            >
              {/* Different content based on type */}
              {item.type === 'consultation' && (
                <div className="space-y-2">
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-sm">
                      <span className="font-medium text-green-800">📅 Data:</span>
                      <span className="text-green-700 ml-2">{item.details.date}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-green-800">👨‍⚕️ Médico:</span>
                      <span className="text-green-700 ml-2">{item.details.doctor}</span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">🏥 Local:</span>
                    <span className="ml-2">{item.details.location}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-slate-700">Status:</span>
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {item.details.status}
                    </span>
                  </div>
                </div>
              )}

              {item.type === 'exam' && (
                <div className="space-y-2">
                  <div className="bg-purple-50 rounded-lg p-2">
                    <div className="text-sm">
                      <span className="font-medium text-purple-800">📅 Data:</span>
                      <span className="text-purple-700 ml-2">{item.details.date}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-purple-800">🏥 Laboratório:</span>
                      <span className="text-purple-700 ml-2">{item.details.lab}</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-slate-700">📊 Resultado:</span>
                    <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                      {item.details.results}
                    </span>
                  </div>
                </div>
              )}

              {item.type === 'allergy' && (
                <div className="space-y-2">
                  <div className="bg-red-50 rounded-lg p-2">
                    <div className="text-sm">
                      <span className="font-medium text-red-800">⚠️ Gravidade:</span>
                      <span className="text-red-700 ml-2">{item.details.severity}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-red-800">🔄 Reação:</span>
                      <span className="text-red-700 ml-2">{item.details.reaction}</span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">📅 Descoberta:</span>
                    <span className="ml-2">{item.details.discovered}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="text-sm">
                      <span className="font-medium text-slate-700 block mb-1">📝 Observações:</span>
                      <span className="text-slate-600">{item.details.notes}</span>
                    </div>
                  </div>
                </div>
              )}
            </TitleToggleCard>
          ))}
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mt-8">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📖 Como usar o TitleToggleCard
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• <strong>Hover para expandir:</strong> Passe o mouse sobre o card para ver os detalhes</p>
            <p>• <strong>Edição inline:</strong> Clique no botão de editar para modificar o conteúdo</p>
            <p>• <strong>Deletar com confirmação:</strong> Botão de deletar com confirmação automática</p>
            <p>• <strong>Totalmente customizável:</strong> Conteúdo flexível para diferentes tipos de dados</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 