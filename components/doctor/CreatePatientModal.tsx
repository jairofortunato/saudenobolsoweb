'use client';

import React, { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CPFInput } from '../ui/CPFInput';
import { PINInput } from '../ui/PINInput';
import { Alert } from '../ui/Alert';
import { cleanNumeric } from '@/lib/form-validation';

interface CreatePatientModalProps {
  open: boolean;
  onClose: () => void;
  onPatientCreated?: (patient: any) => void;
}

interface FormData {
  cpf: string;
  name: string;
  pin: string;
}

interface FormValidation {
  cpf: boolean;
  name: boolean;
  pin: boolean;
}

export function CreatePatientModal({ open, onClose, onPatientCreated }: CreatePatientModalProps) {
  const [formData, setFormData] = useState<FormData>({
    cpf: '',
    name: '',
    pin: ''
  });

  const [validation, setValidation] = useState<FormValidation>({
    cpf: false,
    name: false,
    pin: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const resetForm = useCallback(() => {
    setFormData({ cpf: '', name: '', pin: '' });
    setValidation({ cpf: false, name: false, pin: false });
    setError('');
    setSuccess('');
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    if (!loading) {
      resetForm();
      onClose();
    }
  }, [loading, resetForm, onClose]);

  const handleCPFChange = useCallback((cpf: string, isValid: boolean) => {
    setFormData(prev => ({ ...prev, cpf }));
    setValidation(prev => ({ ...prev, cpf: isValid }));
    setError('');
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({ ...prev, name }));
    setValidation(prev => ({ ...prev, name: name.trim().length >= 2 }));
    setError('');
  }, []);

  const handlePINChange = useCallback((pin: string, isValid: boolean) => {
    setFormData(prev => ({ ...prev, pin }));
    setValidation(prev => ({ ...prev, pin: isValid }));
    setError('');
  }, []);

  const isFormValid = validation.cpf && validation.name && validation.pin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid || loading) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

          try {
        // Clean the PIN by removing spaces and non-numeric characters
        const cleanPin = cleanNumeric(formData.pin);
        
        const response = await fetch('/api/doctor/create-patient', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cpf: formData.cpf,
            name: formData.name,
            pin: cleanPin
          }),
        });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`✅ Paciente "${data.patient.full_name}" criado com sucesso!`);
        onPatientCreated?.(data.patient);
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(data.error || 'Erro ao criar paciente');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="➕ Criar Novo Paciente"
      description="Crie um perfil para o paciente poder acessar posteriormente"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success Message */}
        {success && (
          <Alert variant="success">
            {success}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {/* CPF Input */}
        <div className="space-y-2">
          <label htmlFor="cpf" className="block text-sm font-medium text-slate-700">
            CPF do Paciente
          </label>
          <CPFInput
            id="cpf"
            value={formData.cpf}
            onChange={handleCPFChange}
            placeholder="000.000.000-00"
            disabled={loading}
            helperText="O CPF será usado para vincular a conta quando o paciente se cadastrar"
            variant={validation.cpf && formData.cpf ? 'success' : 'default'}
          />
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Nome Completo
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="Ex: João Silva Santos"
            disabled={loading}
            helperText="Nome completo do paciente"
            variant={validation.name ? 'success' : 'default'}
            autoComplete="name"
          />
        </div>

        {/* PIN Input */}
        <div className="space-y-2">
          <label htmlFor="pin" className="block text-sm font-medium text-slate-700">
            PIN do Paciente
          </label>
          <PINInput
            id="pin"
            value={formData.pin}
            onChange={handlePINChange}
            placeholder="000 000"
            disabled={loading}
            showValue={true}
            helperText="PIN de 6 dígitos para busca rápida e emergências"
            variant={validation.pin && formData.pin ? 'success' : 'default'}
          />
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-blue-600 text-lg">💡</span>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="space-y-1 text-xs">
                <li>• O paciente poderá se cadastrar usando este CPF</li>
                <li>• Automaticamente receberá acesso aos dados médicos</li>
                <li>• Use o PIN para buscar o paciente rapidamente</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={!isFormValid || loading}
            className="w-full sm:w-auto"
          >
            {loading ? 'Criando...' : 'Criar Paciente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 