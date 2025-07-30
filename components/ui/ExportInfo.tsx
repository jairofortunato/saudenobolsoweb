'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Loading } from './Loading';

interface ExportInfoProps {
  className?: string;
}

export const ExportInfo: React.FC<ExportInfoProps> = ({ 
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [exportedText, setExportedText] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const response = await fetch('/api/export-medical-info');
      
      if (!response.ok) {
        throw new Error('Failed to export medical information');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Set the exported text to display
      setExportedText(data.formattedText);
      
      // Copy formatted text to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(data.formattedText);
        setSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        // Fallback for browsers that don't support the Clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = data.formattedText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
          }, 3000);
        } catch (err) {
          throw new Error('Failed to copy to clipboard');
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
    } catch (err) {
      console.error('Error exporting medical information:', err);
      setError(err instanceof Error ? err.message : 'Erro ao exportar informações médicas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow p-3 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>📤 Exportar Informações Médicas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-slate-600 text-sm">
            Exporte todas as suas informações médicas organizadas em um formato 
            profissional e claro, adequado para compartilhar com médicos ou para 
            seu uso pessoal.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleExport}
              disabled={loading}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loading size="sm" />
                  <span>Exportando...</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Exportar e Copiar</span>
                </>
              )}
            </Button>
            
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                <span className="font-medium text-red-800">Erro:</span>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-xs">
                <span className="font-medium text-green-800">Sucesso!</span>
                <p className="text-green-700 mt-1">
                  Suas informações médicas foram copiadas para a área de transferência.
                </p>
              </div>
            )}
          </div>
          
          
          
          {/* Display exported text */}
          {exportedText && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  Informações Exportadas:
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(exportedText);
                    }
                  }}
                  className="text-xs px-2 py-1"
                >
                  📋 Copiar
                </Button>
              </div>
              <div className="bg-white p-3 rounded border border-slate-200 max-h-60 overflow-y-auto">
                <pre className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {exportedText}
                </pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 