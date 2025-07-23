'use client';

import React, { useState } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Loading,
  Input
} from '../index';
import { Medication, Allergy, Exam, Disease, Consultation } from '../../types/database';

interface PatientProfile {
  id: string;
  full_name: string;
  cpf: string;
  pin: string;
  email: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
}

interface PatientMedicalData {
  medications: Medication[];
  allergies: Allergy[];
  exams: Exam[];
  diseases: Disease[];
  consultations: Consultation[];
}

interface PatientSearchResult {
  patient: PatientProfile;
  medicalData: PatientMedicalData;
}

interface PatientSearchProps {
  onPatientFound?: (result: PatientSearchResult) => void;
  onClear?: () => void;
}

export function PatientSearch({ onPatientFound, onClear }: PatientSearchProps) {
  const [pin, setPin] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!pin || pin.trim().length !== 6) {
      setError('Por favor, digite um PIN válido de 6 dígitos');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/doctor/patient-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar paciente');
      }



      // Call the callback with the found patient data
      if (onPatientFound) {
        onPatientFound(data);
      }

    } catch (error) {
      console.error('Error searching patient:', error);
      setError(error instanceof Error ? error.message : 'Erro ao buscar paciente. Tente novamente.');
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setPin('');
    setError(null);
    if (onClear) {
      onClear();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

    return (
    <Card className="p-4 max-w-2xl">
      <div className="flex items-center gap-4">
        {/* Title */}
        <h2 className="text-xl font-semibold text-slate-800 whitespace-nowrap">🔍 Buscar Paciente por PIN</h2>
        
        {/* PIN Input */}
        <Input
          type="text"
          value={pin}
          onChange={(e) => {
            // Only allow numbers and limit to 6 digits
            const value = e.target.value.replace(/\D/g, '').substring(0, 6);
            setPin(value);
            if (error) setError(null); // Clear error when user types
          }}
          placeholder="123456"
          maxLength={6}
          className="w-48 ml-6 text-center text-lg font-mono"
          onKeyDown={handleKeyDown}
          disabled={searching}
        />
        
        {/* Buscar Button */}
        <Button 
          variant="primary" 
          onClick={handleSearch}
          loading={searching}
          disabled={pin.length !== 6}
          className="w-64"
        >
          Buscar
        </Button>
        
        
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </Card>
  );
} 