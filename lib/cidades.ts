// Páginas por cidade (/advogados/<cidade>) geradas a partir das comarcas do mapa.
import { normalizar } from './util';
import type { Comarca } from './tipos';

export const slugCidade = (nome: string) => normalizar(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const acharCidade = (lista: Comarca[] | undefined, slug: string) => (lista ?? []).find((c) => slugCidade(c.nome) === slug);
export const ROTULO_TIPO: Record<string, string> = { base: 'Atendimento presencial no dia a dia', deslocamento: 'Atendimento com deslocamento', consulta: 'Atendimento sob consulta' };
