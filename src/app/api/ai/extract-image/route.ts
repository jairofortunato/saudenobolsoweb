/**
 * =====================================
 * IMAGE EXTRACTION API ENDPOINT
 * =====================================
 *
 * Extracts medical information from exam images using OpenAI Vision API (gpt-4o).
 * Processes images like blood tests, X-rays, prescriptions, and medical documents.
 *
 * Based on telegram-doczap/services/image_service.py implementation.
 *
 * ENDPOINT: POST /api/ai/extract-image
 *
 * REQUEST:
 * - Content-Type: multipart/form-data
 * - Body: FormData with 'image' file and optional 'appointment_id'
 *
 * RESPONSE:
 * {
 *   "success": true,
 *   "extracted_text": "Detailed medical information...",
 *   "metadata": {
 *     "file_name": "exam.jpg",
 *     "file_size": 123456,
 *     "mime_type": "image/jpeg"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  console.log('🖼️ [IMAGE EXTRACT] Starting image extraction...');

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const appointmentId = formData.get('appointment_id') as string | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    console.log('📷 [IMAGE EXTRACT] Image received:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
      appointmentId
    });

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    console.log('🔄 [IMAGE EXTRACT] Image converted to base64:', {
      base64Length: base64Image.length,
      originalSize: imageFile.size
    });

    // Call OpenAI Vision API
    console.log('🤖 [IMAGE EXTRACT] Calling OpenAI Vision API...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // gpt-4o supports vision
      messages: [
        {
          role: 'system',
          content: `Você é um assistente médico especializado em extrair informações de imagens médicas.

Sua tarefa é analisar a imagem fornecida e extrair TODAS as informações médicas relevantes de forma estruturada e detalhada.

INSTRUÇÕES:
1. Identifique o tipo de documento (exame de sangue, raio-X, prescrição, etc.)
2. Extraia TODAS as informações visíveis, incluindo:
   - Resultados de exames com valores e unidades
   - Diagnósticos e observações médicas
   - Medicamentos com dosagens e frequências
   - Sinais vitais e medições
   - Datas e informações do paciente (se visíveis)
   - Qualquer texto manuscrito ou impresso relevante

3. Organize as informações de forma clara e estruturada
4. Use português brasileiro (pt-BR)
5. Mantenha a precisão dos valores numéricos
6. Indique se há informações ilegíveis

FORMATO DE SAÍDA:
Organize a saída em seções claras:

**TIPO DE DOCUMENTO:**
[Tipo do documento médico]

**INFORMAÇÕES EXTRAÍDAS:**
[Lista detalhada de todas as informações]

**OBSERVAÇÕES:**
[Qualquer observação relevante, incluindo partes ilegíveis]

Seja minucioso e não omita nenhuma informação médica relevante.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageFile.type};base64,${base64Image}`,
                detail: 'high' // Use high detail for medical accuracy
              }
            },
            {
              type: 'text',
              text: 'Por favor, extraia todas as informações médicas desta imagem de forma detalhada e estruturada.'
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for factual extraction
    });

    const extractedText = response.choices[0]?.message?.content || '';

    console.log('✅ [IMAGE EXTRACT] Extraction completed:', {
      extractedLength: extractedText.length,
      tokensUsed: response.usage?.total_tokens,
      preview: extractedText.substring(0, 200) + '...'
    });

    // Return extracted text
    return NextResponse.json({
      success: true,
      extracted_text: extractedText,
      metadata: {
        file_name: imageFile.name,
        file_size: imageFile.size,
        mime_type: imageFile.type,
        appointment_id: appointmentId,
        extraction_timestamp: new Date().toISOString(),
        tokens_used: response.usage?.total_tokens
      }
    });

  } catch (error) {
    console.error('❌ [IMAGE EXTRACT] Error:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: 'OpenAI API error',
          details: error.message,
          status: error.status
        },
        { status: error.status || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to extract text from image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
