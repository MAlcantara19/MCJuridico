'use client';
// Formulário de textos das configurações gerais (usado em várias abas).
import { useState } from 'react';
import type { Config } from '@/lib/tipos';

export type CampoConfig = { nome: keyof Config; rotulo: string; area?: boolean; dica?: string };

export default function FormConfig({ campos, config, salvar, titulo }: {
  campos: CampoConfig[];
  config: Config;
  salvar: (p: Partial<Config>) => Promise<void>;
  titulo?: string;
}) {
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(campos.map((c) => [c.nome, String(config[c.nome] ?? '')]))
  );
  const [mudou, setMudou] = useState(false);

  function alterar(nome: string, v: string) {
    setValores((x) => ({ ...x, [nome]: v }));
    setMudou(true);
  }

  async function enviar() {
    await salvar(valores as Partial<Config>);
    setMudou(false);
  }

  return (
    <div className={`adm-item${mudou ? ' mudou' : ''}`}>
      {titulo && <h3>{titulo}</h3>}
      <div className="adm-grade">
        {campos.map((c) => (
          <label key={c.nome} style={c.area ? { gridColumn: '1 / -1' } : undefined}>
            {c.rotulo}
            {c.area ? (
              <textarea value={valores[c.nome]} onChange={(e) => alterar(c.nome, e.target.value)} rows={4} />
            ) : (
              <input value={valores[c.nome]} onChange={(e) => alterar(c.nome, e.target.value)} />
            )}
            {c.dica && <span className="adm-dica" style={{ fontWeight: 400 }}>{c.dica}</span>}
          </label>
        ))}
      </div>
      <div><button className="adm-btn pri" onClick={enviar} disabled={!mudou}>{mudou ? 'Salvar alterações' : 'Salvo'}</button></div>
    </div>
  );
}
