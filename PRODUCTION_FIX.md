# 🚀 Production Fix for Audio Transcription

## ❌ **Problem**
Frontend was trying to connect to `http://localhost:8000` in production, causing CORS errors:
```
Access to fetch at 'http://localhost:8000/api/prontodoc/prerecorded/transcribe' from origin 'https://saudenobolsoweb.vercel.app' has been blocked by CORS policy
```

## ✅ **Solution Applied**

### **1. Fixed API Base URL Configuration**
Updated all API base URL configurations to include production fallback:

**Before:**
```javascript
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
```

**After:**
```javascript
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_AI_PROCESSOR_URL || 'https://saude-ai-processor-production.up.railway.app';
```

### **2. Files Updated**
- ✅ `src/app/prontodoc-prerecorded/page.tsx` (3 occurrences)
- ✅ `lib/prontodoc-client-prerecorded.ts`
- ✅ `lib/prontodoc-client.ts`
- ✅ `src/app/prontodoc/page.tsx`

### **3. Production Environment Variable**
Set this environment variable in Vercel:

```bash
NEXT_PUBLIC_API_BASE_URL=https://saude-ai-processor-production.up.railway.app
```

**Alternative:**
```bash
NEXT_PUBLIC_AI_PROCESSOR_URL=https://saude-ai-processor-production.up.railway.app
```

## 🔧 **How to Deploy**

### **Option 1: Set Environment Variable in Vercel**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_BASE_URL` = `https://saude-ai-processor-production.up.railway.app`
3. Redeploy

### **Option 2: Use Code Fallback (Already Applied)**
The code now automatically falls back to the production URL if no environment variables are set.

## 🧪 **Verification**

After deployment, the audio transcription should work with:
- **Row 1**: Deepgram API (`/api/prontodoc/prerecorded/transcribe`)
- **Row 2**: AssemblyAI API (`/api/prontodoc/prerecorded/transcribe-assemblyai`)  
- **Row 3**: OpenAI Whisper API (`/api/prontodoc/prerecorded/transcribe-openai-whisper`)

## 🎯 **Expected Result**
✅ No more CORS errors
✅ Audio files upload successfully  
✅ Transcription works in production
✅ AI processing works for all three providers