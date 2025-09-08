'use client';

/**
 * =====================================
 * SIMPLE PRONTUÁRIO TEXT EDITOR
 * =====================================
 * 
 * Simple text editor component for displaying prontuário text.
 * Shows the raw prontuário text in an editable textarea format.
 */

interface SimpleProntuarioEditorProps {
  prontuarioText: string;
  patientName?: string;
  onClose?: () => void;
  className?: string;
}

export function SimpleProntuarioEditor({
  prontuarioText,
  patientName,
  onClose,
  className = ''
}: SimpleProntuarioEditorProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-blue-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-blue-800">
              📋 Medical Record Generated
            </h3>
            {patientName && (
              <p className="text-sm text-blue-600">
                {patientName}
              </p>
            )}
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          {/* Text Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medical Record Content
            </label>
            <textarea
              value={prontuarioText}
              readOnly
              className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm leading-relaxed resize-none"
              placeholder="Medical record content will appear here..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                const element = document.createElement('a');
                const file = new Blob([prontuarioText], { type: 'text/plain' });
                element.href = URL.createObjectURL(file);
                element.download = `prontuario-${patientName || 'patient'}-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </button>
            
            <button
              onClick={() => navigator.clipboard.writeText(prontuarioText)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}