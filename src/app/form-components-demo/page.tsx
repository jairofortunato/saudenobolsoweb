'use client';

import React, { useState } from 'react';
import { 
  FormField, 
  CPFInput, 
  PINInput, 
  RoleSelector, 
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  type UserRole 
} from '../../../components';

export default function FormComponentsDemo() {
  const [cpfValue, setCpfValue] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>();
  const [formData, setFormData] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormData({
      cpf: cpfValue,
      pin: pinValue,
      role: selectedRole,
      timestamp: new Date().toISOString()
    });
  };

  const resetForm = () => {
    setCpfValue('');
    setPinValue('');
    setSelectedRole(undefined);
    setFormData({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Form Components Demo
          </h1>
          <p className="text-slate-600">
            Showcase of all custom form components for Saúde no Bolso
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Form Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive Form</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* CPF Input */}
                <FormField 
                  label="CPF" 
                  required
                  helperText="Digite seu CPF para formatação automática"
                >
                                     <CPFInput
                     value={cpfValue}
                     onChange={(value: string, isValid: boolean) => {
                       setCpfValue(value);
                       console.log('CPF:', value, 'Valid:', isValid);
                     }}
                     placeholder="000.000.000-00"
                   />
                </FormField>

                {/* PIN Input */}
                <FormField 
                  label="PIN de Emergência" 
                  required
                  helperText="6 dígitos únicos para acesso médico"
                >
                                     <PINInput
                     value={pinValue}
                     onChange={(value: string, isValid: boolean) => {
                       setPinValue(value);
                       console.log('PIN:', value, 'Valid:', isValid);
                     }}
                     placeholder="000 000"
                   />
                </FormField>

                {/* Role Selector */}
                <FormField 
                  label="Tipo de Usuário" 
                  required
                  helperText="Selecione seu tipo de acesso"
                >
                                     <RoleSelector
                     value={selectedRole}
                     onChange={(role: UserRole) => {
                       setSelectedRole(role);
                       console.log('Role:', role);
                     }}
                     required
                   />
                </FormField>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    variant="primary"
                    className="flex-1"
                  >
                    Enviar Formulário
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={resetForm}
                  >
                    Limpar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Results Display */}
          <Card>
            <CardHeader>
              <CardTitle>Form State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                
                {/* Current Values */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Current Values:</h3>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    <div>
                      <span className="font-medium">CPF:</span> 
                      <span className="ml-2 font-mono">{cpfValue || '(empty)'}</span>
                    </div>
                    <div>
                      <span className="font-medium">PIN:</span> 
                      <span className="ml-2 font-mono">{pinValue || '(empty)'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Role:</span> 
                      <span className="ml-2">{selectedRole || '(not selected)'}</span>
                    </div>
                  </div>
                </div>

                {/* Last Submission */}
                {Object.keys(formData).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-2">Last Submission:</h3>
                    <pre className="bg-slate-800 text-green-400 rounded-xl p-4 text-xs overflow-auto">
                      {JSON.stringify(formData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Component Info */}
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">Components Features:</h3>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• <strong>CPFInput:</strong> Auto-formatting, validation</li>
                    <li>• <strong>PINInput:</strong> 6-digit PIN, show/hide toggle</li>
                    <li>• <strong>RoleSelector:</strong> Visual role selection</li>
                    <li>• <strong>FormField:</strong> Consistent labeling & errors</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Component Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Component Usage Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* CPF Example */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">CPFInput</h3>
                <pre className="bg-slate-100 rounded-lg p-3 text-xs overflow-auto">
{`<CPFInput
  value={cpfValue}
  onChange={(value, isValid) => {
    setCpfValue(value);
    console.log('Valid:', isValid);
  }}
  placeholder="000.000.000-00"
/>`}
                </pre>
              </div>

              {/* PIN Example */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">PINInput</h3>
                <pre className="bg-slate-100 rounded-lg p-3 text-xs overflow-auto">
{`<PINInput
  value={pinValue}
  onChange={(value, isValid) => {
    setPinValue(value);
  }}
  showValue={false}
/>`}
                </pre>
              </div>

              {/* Role Selector Example */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">RoleSelector</h3>
                <pre className="bg-slate-100 rounded-lg p-3 text-xs overflow-auto">
{`<RoleSelector
  value={selectedRole}
  onChange={(role) => {
    setSelectedRole(role);
  }}
  required
/>`}
                </pre>
              </div>

              {/* FormField Example */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">FormField</h3>
                <pre className="bg-slate-100 rounded-lg p-3 text-xs overflow-auto">
{`<FormField 
  label="Field Label" 
  required
  helperText="Helper text"
  error="Error message"
>
  <Input />
</FormField>`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 