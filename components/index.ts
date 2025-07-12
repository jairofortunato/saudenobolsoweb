// Reusable components
// Export all components from this file

// Base components (Phase 3.1)
export { Button, buttonVariants } from './ui/Button';
export { Input, inputVariants } from './ui/Input';
export { Textarea, textareaVariants } from './ui/Textarea';
export { Modal } from './ui/Modal';
export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants 
} from './ui/Card';
export { Loading, loadingVariants } from './ui/Loading';
export { Alert, Toast, alertVariants, toastVariants } from './ui/Alert';

// Layout components (Phase 3.2)
export { Header } from './layout/Header';
export { Sidebar } from './layout/Sidebar';
export { Layout } from './layout/Layout';
export { AuthLayout } from './layout/AuthLayout';
export { DashboardLayout } from './layout/DashboardLayout';

// Form components (Phase 3.3)
export { FormField } from './ui/FormField';
export { CPFInput } from './ui/CPFInput';
export { PINInput } from './ui/PINInput';
export { RoleSelector, type UserRole } from './ui/RoleSelector';

// Modal components
export { NovaEntradaModal } from './ui/NovaEntradaModal';

// Add component exports here as they are created 