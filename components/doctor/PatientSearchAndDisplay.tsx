'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button,
  Input
} from '../index';
import { PatientDisplay } from './PatientDisplay';

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
   * CREATE NEW PATIENT
   * 
   * When user types a name not found in database:
   * 1. Creates temporary patient object with isExisting: false
   * 2. Patient will be saved to database later during consultation creation
   * 3. New patient gets inserted into profiles table with:
   *    - full_name: user input
   *    - cpf: to be collected later
   *    - pin: auto-generated 6-digit number
   *    - role: 'patient'
   *    - created_by: current doctor's profile_id
   *    - user_id: null (doctor-created patient)
   */
  const handleCreateNewPatient = () => {
    if (!searchQuery.trim()) return;

    // Check if exact name already exists in search results
    const exactMatch = searchResults.find(
      patient => patient.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );
    
    if (exactMatch) {
      // Select the existing patient instead
      handlePatientSelect(exactMatch);
    } else {
      // Create new patient entry (temporary, will be saved later)
      const newPatient: PatientProfile = {
        id: 'temp-' + Date.now(), // temporary ID
        name: searchQuery.trim(),
        cpf: '', // will be filled later if needed
        pin: '', // will be generated later
        isExisting: false
      };
      setSelectedPatient(newPatient);
      setSearchResults([]);
      setPatientMedicalData(null); // No medical data for new patients
      
      // Notify parent component
      onPatientSelected(newPatient);
    }
  };

  /**
   * HANDLE ENTER KEY PRESS
   * Same as clicking "Criar Paciente" button
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleCreateNewPatient();
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
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
                  onClick={handleCreateNewPatient}
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
    </div>
  );
}