# 🏥 Medical Specialty Templates Setup Guide

This guide explains how to populate the database with 5 different medical specialty templates in Portuguese.

## 📋 Available Templates

The following templates will be created:

1. **Consulta Geral (SOAP)** - Clínica Geral (Default)
2. **Consulta Cardiovascular** - Cardiologia
3. **Consulta Pediátrica** - Pediatria
4. **Consulta Ginecológica** - Ginecologia
5. **Consulta Ortopédica** - Ortopedia
6. **Consulta Dermatológica** - Dermatologia

## 🚀 How to Populate the Database

### ⚠️ Important Note
If you get the error `"there is no unique or exclusion constraint matching the ON CONFLICT specification"`, use the **simple version** of the script (`populate-medical-templates-simple.sql`).

### Option 1: Using Supabase Dashboard (Recommended)

1. **Access your Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project
   - Go to **SQL Editor**

2. **Execute the template population script**
   - Copy the contents of `populate-medical-templates-simple.sql` (recommended)
   - Or use `populate-medical-templates.sql` if you want conflict handling
   - Paste it into the SQL Editor
   - Click **Run** to execute

3. **Verify the templates were created**
   ```sql
   SELECT name, specialty, is_default, is_public 
   FROM consultation_templates 
   ORDER BY is_default DESC, name ASC;
   ```

### Option 2: Using Supabase CLI

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Execute the script**
   ```bash
   supabase db reset --linked
   # Then execute the SQL script in your database
   ```

## 🔧 Template Features

### Default Template Priority
- The **SOAP template** is always set as the default
- It will appear first in the template selector
- It will be auto-selected when the page loads

### Template Structure
Each template includes:
- **Specialized sections** for that medical specialty
- **Custom AI prompts** in Portuguese
- **Professional medical terminology**
- **Structured prontuário format**

### Template Access
- All templates are **public** (available to all doctors)
- Doctors can create **private templates** for their own use
- The system supports both **default** and **custom** templates

## 🎯 Template Details

### 1. Consulta Geral (SOAP) - Default
- **Specialty**: Clínica Geral
- **Sections**: Queixa Principal, História da Doença Atual, Revisão de Sistemas, Exame Físico, Avaliação, Plano Terapêutico
- **AI Prompt**: Standard SOAP format with allergies, medications, comorbidities

### 2. Consulta Cardiovascular
- **Specialty**: Cardiologia
- **Sections**: Queixa Principal, História da Doença Atual, História Cardiovascular, Fatores de Risco, Exame Cardiovascular, Avaliação Cardiovascular, Plano Terapêutico
- **AI Prompt**: Specialized for cardiovascular conditions with NYHA classification

### 3. Consulta Pediátrica
- **Specialty**: Pediatria
- **Sections**: Queixa Principal, História da Doença Atual, História Neonatal, Desenvolvimento, Vacinação, Exame Físico, Avaliação, Plano Terapêutico
- **AI Prompt**: Pediatric-specific with growth, development, and vaccination tracking

### 4. Consulta Ginecológica
- **Specialty**: Ginecologia
- **Sections**: Queixa Principal, História da Doença Atual, História Ginecológica, História Obstétrica, Exame Ginecológico, Avaliação, Plano Terapêutico
- **AI Prompt**: Gynecological history with menstrual cycle and obstetric data

### 5. Consulta Ortopédica
- **Specialty**: Ortopedia
- **Sections**: Queixa Principal, História da Doença Atual, História Traumática, Exame Ortopédico, Avaliação Funcional, Avaliação, Plano Terapêutico
- **AI Prompt**: Musculoskeletal focus with trauma history and functional assessment

### 6. Consulta Dermatológica
- **Specialty**: Dermatologia
- **Sections**: Queixa Principal, História da Doença Atual, História Dermatológica, Exame Dermatológico, Avaliação, Plano Terapêutico
- **AI Prompt**: Dermatological examination with lesion characteristics and skin history

## 🔍 Verification

After running the script, you should see:

```sql
name                    | specialty      | is_default | is_public
----------------------|----------------|------------|----------
Consulta Geral (SOAP) | Clínica Geral | true       | true
Consulta Cardiovascular | Cardiologia   | false      | true
Consulta Pediátrica   | Pediatria     | false      | true
Consulta Ginecológica | Ginecologia   | false      | true
Consulta Ortopédica   | Ortopedia     | false      | true
Consulta Dermatológica| Dermatologia  | false      | true
```

## 🎯 Frontend Behavior

After populating the database:

1. **Template Selector** will show all 6 templates
2. **SOAP template** will be auto-selected by default
3. **Doctors can switch** between templates as needed
4. **Custom templates** can still be created by doctors
5. **All templates** are available for prontuário generation

## 🚨 Troubleshooting

### If templates don't appear:
1. Check if the SQL script executed successfully
2. Verify the `consultation_templates` table exists
3. Check if RLS policies allow access to the templates
4. Ensure the API route is working correctly

### If SOAP template is not default:
1. Verify the `is_default = true` flag is set
2. Check if the template name contains "SOAP"
3. Restart the development server if needed

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify the database connection
3. Ensure all environment variables are set correctly
4. Check the API route logs for authentication issues 