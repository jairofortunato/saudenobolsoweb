'use client';
import React from 'react';
import Link from 'next/link';
import { Button } from '../../components';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-slate-900" aria-hidden="true" />
            <span className="text-xl font-semibold text-slate-900">Prontodoc</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/signin">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">Começar agora</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <section className="text-center mb-16 md:mb-24">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-4">
            Prontuário Inteligente Automático
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
            Transcrição instantânea e notas estruturadas em segundos. Poupe 2–4 horas por semana e foque no que importa: seus pacientes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button variant="primary" size="lg" className="min-w-[200px]">Experimentar por 7 dias</Button>
            </Link>
            <Link href="/signin">
              <Button variant="secondary" size="lg" className="min-w-[200px]">Já sou usuário</Button>
            </Link>
          </div>
          <div className="mt-4 text-slate-500 text-sm">R$ 298/mês • Garantia: 7 dias sem risco</div>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <h3 className="font-semibold text-slate-900 mb-2">Dor</h3>
            <p className="text-slate-600">Médicos perdem 2–4 horas/semana com documentação — menos foco no paciente e mais burnout.</p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-slate-900 mb-2">Dinheiro</h3>
            <p className="text-slate-600">Horas desperdiçadas = menos consultas/dia = receita perdida.</p>
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-slate-900 mb-2">Urgência</h3>
            <p className="text-slate-600">Alta em plantões e clínicas com 10+ pacientes/dia. Posicione antes de turnos pesados.</p>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-10 items-start mb-16">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">5–10× mais rápido que digitar</h3>
            <p className="text-slate-600">O padrão hoje é digitar manualmente ou preencher formulários lentos do prontuário eletrônico. O Prontodoc oferece transcrição precisa e instantânea com notas estruturadas automaticamente.</p>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Valor em menos de 5 minutos</h3>
            <p className="text-slate-600">Abra o app → Toque em gravar → Termine a consulta → Veja a nota estruturada → Exporte para EMR/PDF.</p>
          </div>
        </section>

        <section className="bg-slate-50 rounded-lg p-6 md:p-8 mb-16">
          <div className="grid md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <p className="italic text-slate-800">“Economizei 2 horas por dia; agora atendo 3 pacientes a mais diariamente.”</p>
              <p className="text-sm text-slate-500 mt-2">— Caso real de médicos parceiros</p>
            </div>
            <div className="text-center md:text-right">
              <div className="text-2xl font-bold text-slate-900">R$ 298/mês</div>
              <div className="text-slate-600 text-sm">Teste por 7 dias. Se não reduzir o tempo de documentação em 50%, você não paga.</div>
              <Link href="/signup" className="inline-block mt-3">
                <Button variant="primary" size="sm">Começar agora</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Prontodoc</span>
          <div className="flex items-center gap-4">
            <Link href="/signin" className="hover:text-slate-700">Entrar</Link>
            <Link href="/signup" className="hover:text-slate-700">Criar conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
