import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Exclusão de Dados do Usuário | Saúde no Bolso',
  description: 'Solicite a exclusão de seus dados pessoais e informações de saúde da plataforma Saúde no Bolso de forma segura e em conformidade com a LGPD',
}

export default function ExclusaoDadosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}