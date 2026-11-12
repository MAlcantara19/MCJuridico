'use client';
// Carrega clientes e nomes de serviços (usados em várias telas da gestão).
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/lib/gestao';

export function useBase() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicos, setServicos] = useState<string[]>([]);

  const recarregar = useCallback(async () => {
    const [c, s] = await Promise.all([
      supabase().from('clientes').select('*').order('nome'),
      supabase().from('servicos').select('nome').order('nome'),
    ]);
    setClientes((c.data as Cliente[]) ?? []);
    setServicos(Array.from(new Set(((s.data as { nome: string }[]) ?? []).map((x) => x.nome))));
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);
  return { clientes, servicos, recarregar };
}
