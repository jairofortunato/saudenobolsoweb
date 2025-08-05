'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

export interface SessionParticipant {
  id: string;
  name: string;
  role: 'patient' | 'doctor';
  email?: string;
  specialty?: string;
  avatar?: string;
}

export interface SessionDetails {
  sessionId: string;
  recordingId?: string;
  patient: SessionParticipant;
  doctor: SessionParticipant;
  startedAt?: Date;
  consultationType?: string;
  specialty?: string;
  status: 'inactive' | 'active' | 'paused' | 'completed' | 'error';
}

interface SessionInfoProps {
  session: SessionDetails;
  showDetails?: boolean;
  className?: string;
}

export function SessionInfo({ 
  session, 
  showDetails = true, 
  className 
}: SessionInfoProps) {
  const getStatusColor = (status: SessionDetails['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusText = (status: SessionDetails['status']) => {
    switch (status) {
      case 'active': return 'Em andamento';
      case 'paused': return 'Pausada';
      case 'completed': return 'Finalizada';
      case 'error': return 'Erro';
      default: return 'Inativa';
    }
  };

  const getStatusIcon = (status: SessionDetails['status']) => {
    switch (status) {
      case 'active':
        return (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        );
      case 'paused':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <rect x="6" y="4" width="2" height="12" rx="1" />
            <rect x="12" y="4" width="2" height="12" rx="1" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
          </svg>
        );
      default:
        return (
          <div className="w-2 h-2 bg-slate-400 rounded-full" />
        );
    }
  };

  const ParticipantCard = ({ participant }: { participant: SessionParticipant }) => (
    <div className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-slate-200">
      {/* Avatar */}
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white",
        participant.role === 'doctor' 
          ? "bg-blue-500" 
          : "bg-pink-500"
      )}>
        {participant.avatar ? (
          <img 
            src={participant.avatar} 
            alt={participant.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          participant.name.charAt(0).toUpperCase()
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {participant.name}
        </p>
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span className={cn(
            "px-2 py-0.5 rounded-full font-medium",
            participant.role === 'doctor'
              ? "bg-blue-100 text-blue-700"
              : "bg-pink-100 text-pink-700"
          )}>
            {participant.role === 'doctor' ? 'Médico' : 'Paciente'}
          </span>
          {participant.specialty && (
            <span>{participant.specialty}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card variant="lavender" className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Informações da Consulta</CardTitle>
          <div className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border",
            getStatusColor(session.status)
          )}>
            {getStatusIcon(session.status)}
            <span>{getStatusText(session.status)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Participants */}
        <div className="space-y-3">
          <ParticipantCard participant={session.doctor} />
          <ParticipantCard participant={session.patient} />
        </div>

        {/* Session Details */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-200">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  ID da Sessão
                </p>
                <p className="text-sm text-slate-900 font-mono truncate">
                  {session.sessionId.slice(0, 8)}...
                </p>
              </div>

              {session.recordingId && (
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                    ID da Gravação
                  </p>
                  <p className="text-sm text-slate-900 font-mono truncate">
                    {session.recordingId.slice(0, 8)}...
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {session.startedAt && (
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Iniciada em
                  </p>
                  <p className="text-sm text-slate-900">
                    {session.startedAt.toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {(session.consultationType || session.specialty) && (
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Tipo de Consulta
                  </p>
                  <p className="text-sm text-slate-900">
                    {session.consultationType || session.specialty || 'Consulta Geral'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-purple-200">
          <div className="text-xs text-slate-500">
            ProntoDoc - Transcrição em tempo real
          </div>
          
          <div className="flex items-center space-x-1 text-xs text-slate-500">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" />
            </svg>
            <span>Seguro e criptografado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}