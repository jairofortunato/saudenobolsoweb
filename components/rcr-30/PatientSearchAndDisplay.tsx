'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Modal
} from '../index';
import { PatientDisplay } from './PatientDisplay';
import { CPFInput } from '../ui/CPFInput';
import { PINInput } from '../ui/PINInput';
import { Alert } from '../ui/Alert';
import { cleanNumeric } from '@/lib/form-validation';

/**
 * =====================================
 * PATIENT SEARCH AND DISPLAY COMPONENT
 * =====================================
 * 
 * This component handles:
 * 1. Real-time patient search by name
 * 2. Patient selection (existing or new)
 * 3. Medical data fetching and display
 * 4. New patient creation workflow
 * 
 * API ROUTES USED:
 * - POST /api/doctor/patient-search-by-name
 *   → Searches patients by name (case-insensitive, starts-with pattern)
 *   → Returns: { patients: PatientProfile[], query: string, count: number }
 * 
 * - POST /api/doctor/patient-search  
 *   → Fetches complete patient data including medical history by PIN
 *   → Returns: { patient: PatientProfile, medicalData: MedicalData }
 * 
 * DATABASE TABLES INVOLVED:
 * 
 * 1. profiles (main patient table)
 *    - profile_id: UUID primary key
 *    - full_name: patient name (searched field)
 *    - cpf: patient CPF document
 *    - pin: 6-digit PIN for patient lookup
 *    - role: 'patient' | 'doctor'
 *    - created_by: doctor who created patient (nullable)
 *    - user_id: linked Supabase auth user (nullable for doctor-created patients)
 * 
 * 2. medications (patient medications)
 *    - patient_id: references profiles.profile_id
 *    - name, dosage, frequency, notes
 *    - is_active: boolean for current medications
 * 
 * 3. allergies (patient allergies)
 *    - patient_id: references profiles.profile_id  
 *    - name, severity, reaction, notes
 * 
 * 4. diseases (patient diseases/conditions)
 *    - patient_id: references profiles.profile_id
 *    - name, diagnosed_on, chronic, status, description
 * 
 * 5. exams (patient exams/tests)
 *    - patient_id: references profiles.profile_id
 *    - name, exam_date, result, doctor_name, file_url
 * 
 * 6. consultations (patient consultations)
 *    - patient_id: references profiles.profile_id
 *    - doctor_name, specialty, consultation_date, diagnosis, treatment
 *    - Enhanced with ProntoDoc fields: transcript, speaker_separation, etc.
 */

interface PatientProfile {
  id: string;
  name: string;
  cpf: string;
  pin: string;
  isExisting: boolean; // true for existing patients, false for new ones
}

interface PatientSearchAndDisplayProps {
  onPatientSelected: (patient: PatientProfile | null) => void;
  disabled?: boolean;
  className?: string;
}

export function PatientSearchAndDisplay({
  onPatientSelected,
  disabled = false,
  className
}: PatientSearchAndDisplayProps) {
  // Search and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [searchResults, setSearchResults] = useState<PatientProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [patientMedicalData, setPatientMedicalData] = useState<any>(null);

  // Modal state for creating new patient
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [formData, setFormData] = useState({ cpf: '', pin: '' });
  const [validation, setValidation] = useState({ cpf: false, pin: false });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  /**
   * SEARCH PATIENTS BY NAME
   * 
   * API: POST /api/doctor/patient-search-by-name
   * 
   * This function performs real-time search as user types:
   * 1. Sends name query to backend
   * 2. Backend searches profiles table with ILIKE '%name%' pattern
   * 3. Returns all patients matching the name (any doctor's patients)
   * 4. Updates dropdown with results showing name + CPF
   * 
   * SQL Query executed:
   * SELECT profile_id, full_name, cpf, pin, created_at 
   * FROM profiles 
   * WHERE role = 'patient' 
   * AND full_name ILIKE '%searchName%'
   * ORDER BY full_name ASC 
   * LIMIT 10
   */
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/doctor/patient-search-by-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: query.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Mark all found patients as existing
        const existingPatients = (data.patients || []).map((patient: any) => ({
          ...patient,
          isExisting: true
        }));
        setSearchResults(existingPatients);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * HANDLE PATIENT SELECTION
   * 
   * When user selects an existing patient:
   * 1. Fetches complete medical data using PIN
   * 2. API: POST /api/doctor/patient-search (existing endpoint)
   * 3. Loads all medical history from related tables:
   *    - medications (active medications)
   *    - allergies (all allergies with severity)
   *    - diseases (conditions with status)  
   *    - exams (test results with files)
   *    - consultations (previous appointments)
   * 
   * SQL Queries executed (in parallel):
   * - SELECT * FROM medications WHERE patient_id = ? AND is_active = true
   * - SELECT * FROM allergies WHERE patient_id = ?
   * - SELECT * FROM diseases WHERE patient_id = ?
   * - SELECT * FROM exams WHERE patient_id = ?
   * - SELECT * FROM consultations WHERE patient_id = ?
   */
  const handlePatientSelect = async (patient: PatientProfile) => {
    setSelectedPatient(patient);
    setSearchQuery(patient.name);
    setSearchResults([]);

    // Notify parent component
    onPatientSelected(patient);

    // If it's an existing patient, fetch their complete medical data
    if (patient.isExisting && patient.id) {
      try {
        const response = await fetch('/api/doctor/patient-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pin: patient.pin }),
        });

        if (response.ok) {
          const data = await response.json();
          setPatientMedicalData(data.medicalData);
        }
      } catch (error) {
        console.error('Error fetching patient medical data:', error);
      }
    } else {
      // Clear medical data for new patients
      setPatientMedicalData(null);
    }
  };

  /**
   * OPEN CREATE PATIENT MODAL
   *
   * When user clicks "Criar Paciente":
   * 1. Opens modal with CPF and PIN fields
   * 2. Pre-fills name from search query
   * 3. Requires CPF (11 digits) and PIN (6 digits)
   * 4. Creates real patient in database via API
   */
  const handleOpenCreateModal = () => {
    if (!searchQuery.trim()) return;

    // Check if exact name already exists
    const exactMatch = searchResults.find(
      patient => patient.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    if (exactMatch) {
      // Select existing patient instead
      handlePatientSelect(exactMatch);
    } else {
      // Open modal to create new patient
      setNewPatientName(searchQuery.trim());
      setFormData({ cpf: '', pin: '' });
      setValidation({ cpf: false, pin: false });
      setCreateError('');
      setCreateSuccess('');
      setShowCreateModal(true);
    }
  };

  /**
   * CREATE NEW PATIENT IN DATABASE
   *
   * Calls the same API as CreatePatientModal:
   * POST /api/doctor/create-patient
   *
   * Creates patient in profiles table with:
   * - full_name: from search query
   * - cpf: from form input
   * - pin: from form input
   * - role: 'patient'
   * - created_by: current doctor's profile_id
   * - user_id: null (doctor-created patient)
   */
  const handleCreatePatient = async () => {
    if (!validation.cpf || !validation.pin || creating) return;

    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const cleanPin = cleanNumeric(formData.pin);

      const response = await fetch('/api/doctor/create-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cpf: formData.cpf,
          name: newPatientName,
          pin: cleanPin
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCreateSuccess(`✅ Paciente "${data.patient.full_name}" criado com sucesso!`);

        // Select the newly created patient
        const newPatient: PatientProfile = {
          id: data.patient.profile_id,
          name: data.patient.full_name,
          cpf: data.patient.cpf,
          pin: data.patient.pin,
          isExisting: true
        };

        setSelectedPatient(newPatient);
        setSearchQuery(newPatient.name);
        onPatientSelected(newPatient);

        // Close modal after 1.5 seconds
        setTimeout(() => {
          setShowCreateModal(false);
        }, 1500);
      } else {
        setCreateError(data.error || 'Erro ao criar paciente');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      setCreateError('Erro de conexão. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  /**
   * HANDLE ENTER KEY PRESS
   * Same as clicking "Criar Paciente" button
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleOpenCreateModal();
    }
  };

  /**
   * RESET SEARCH AND SELECTION
   * Clears all state and notifies parent
   */
  const handleReset = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setSearchResults([]);
    setPatientMedicalData(null);
    onPatientSelected(null);
  };

  /**
   * DEBOUNCED SEARCH
   * Delays search API calls by 300ms to avoid excessive requests
   */
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  return (
    <div className={`space-y-8 ${className}`}>
      {/* =====================================
          PATIENT SEARCH INTERFACE
          ===================================== */}
      <div className="text-center space-y-6">
        <h1 className="title-1 mb-8">
          Qual nome do paciente?
        </h1>
        
        <div className="relative mx-auto">
          {/* SEARCH INPUT */}
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite o nome do paciente..."
            className="w-full bg-gray-50 text-lg py-7 px-6 rounded-full border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            disabled={disabled}
            autoFocus
          />
          
          {/* LOADING INDICATOR */}
          {isSearching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* SEARCH RESULTS DROPDOWN */}
          {/* Shows existing patients found in profiles table */}
          {searchResults.length > 0 && !selectedPatient && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {searchResults.map((patient, index) => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium text-gray-900">{patient.name}</div>
                    <div className="text-sm text-gray-500">Paciente existente</div>
                  </div>
                  <div className="text-sm text-gray-600 font-mono">
                    {patient.cpf}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* NEW PATIENT HINT AND BUTTON */}
          {/* Shows when name not found in database */}
          {searchQuery.trim() && searchResults.length === 0 && !isSearching && !selectedPatient && (
            <div className="mt-2 p-3 border  rounded-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-lg text-gray-700 flex-1">
                  ✨ <strong>"{searchQuery}"</strong> será criado como novo paciente.
                </p>
                <Button
                  onClick={handleOpenCreateModal}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-lg font-medium transition-colors"
                  disabled={disabled}
                >
                  Criar Paciente
                </Button>
              </div>
            </div>
          )}
          
          {/* SELECTED PATIENT SUMMARY */}
          {selectedPatient && (
            <div className="mt-4 p-4 mx-24 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-blue-600 font-medium mb-1">
                    {selectedPatient.isExisting ? '' : 'Novo Paciente:'}
                  </div>
                  <div className="text-lg font-semibold text-blue-900">{selectedPatient.name}</div>
                  {selectedPatient.isExisting && selectedPatient.cpf && (
                    <div className="text-sm text-blue-700 font-mono">{selectedPatient.cpf}</div>
                  )}
                  {!selectedPatient.isExisting && (
                    <div className="text-sm text-blue-600 mt-1">
                    </div>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                  disabled={disabled}
                >
                  Alterar
                </button>
              </div>
            </div>
          )}

          {/* SEARCH INSTRUCTIONS */}
          {!selectedPatient && (
            <div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================
          PATIENT MEDICAL DATA DISPLAY
          ===================================== */}
      {/* Only shows for existing patients with medical history */}
      {/* Uses PatientDisplay component to show complete medical profile */}
      {selectedPatient && selectedPatient.isExisting && patientMedicalData && (
        <div className="space-y-4">
          <PatientDisplay
            patient={{
              id: selectedPatient.id,
              full_name: selectedPatient.name,
              cpf: selectedPatient.cpf,
              pin: selectedPatient.pin,
              email: '',
              created_at: new Date().toISOString()
            }}
            medicalData={patientMedicalData}
            onNewSearch={handleReset}
          />
        </div>
      )}

      {/* =====================================
          CREATE PATIENT MODAL
          ===================================== */}
      <Modal
        open={showCreateModal}
        onClose={() => !creating && setShowCreateModal(false)}
        title="➕ Criar Novo Paciente"
        description={`Crie um perfil para "${newPatientName}"`}
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreatePatient(); }} className="space-y-6">
          {/* Success Message */}
          {createSuccess && (
            <Alert variant="success">
              {createSuccess}
            </Alert>
          )}

          {/* Error Message */}
          {createError && (
            <Alert variant="error">
              {createError}
            </Alert>
          )}

          {/* Patient Name (Read-only) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Nome do Paciente
            </label>
            <Input
              type="text"
              value={newPatientName}
              disabled
              className="bg-slate-50"
            />
          </div>

          {/* CPF Input */}
          <div className="space-y-2">
            <label htmlFor="modal-cpf" className="block text-sm font-medium text-slate-700">
              CPF do Paciente *
            </label>
            <CPFInput
              id="modal-cpf"
              value={formData.cpf}
              onChange={(cpf, isValid) => {
                setFormData(prev => ({ ...prev, cpf }));
                setValidation(prev => ({ ...prev, cpf: isValid }));
                setCreateError('');
              }}
              placeholder="000.000.000-00"
              disabled={creating}
              helperText="O CPF será usado para vincular a conta"
              variant={validation.cpf && formData.cpf ? 'success' : 'default'}
            />
          </div>

          {/* PIN Input */}
          <div className="space-y-2">
            <label htmlFor="modal-pin" className="block text-sm font-medium text-slate-700">
              PIN do Paciente (6 dígitos) *
            </label>
            <PINInput
              id="modal-pin"
              value={formData.pin}
              onChange={(pin, isValid) => {
                setFormData(prev => ({ ...prev, pin }));
                setValidation(prev => ({ ...prev, pin: isValid }));
                setCreateError('');
              }}
              placeholder="000 000"
              disabled={creating}
              showValue={true}
              helperText="PIN para busca rápida do paciente"
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
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={creating}
              disabled={!validation.cpf || !validation.pin || creating}
              className="w-full sm:w-auto"
            >
              {creating ? 'Criando...' : 'Criar Paciente'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}