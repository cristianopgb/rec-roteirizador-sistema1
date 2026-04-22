interface ManifestoPdfInput {
  manifestoId: string;
  filialNome: string | null;
  dataRodada: string;
  veiculoPerfil: string | null;
  veiculoTipo: string | null;
  kmTotal: number | null;
  pesoTotal: number | null;
  qtdEntregas: number;
  freteMinimo: number | null;
  itens: Array<{
    sequencia_atual: number;
    nro_documento: string | null;
    destinatario: string | null;
    cidade: string | null;
    uf: string | null;
    peso: number | null;
    inicio_entrega: string | null;
    fim_entrega: string | null;
    observacoes: string | null;
  }>;
}

function escapeHtml(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '-';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '-';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function imprimirManifesto(input: ManifestoPdfInput): void {
  const rows = input.itens
    .map(
      (it) => `
    <tr>
      <td class="seq">${it.sequencia_atual}</td>
      <td>${escapeHtml(it.nro_documento) || '-'}</td>
      <td>${escapeHtml(it.destinatario) || '-'}</td>
      <td>${escapeHtml(it.cidade) || '-'}</td>
      <td class="center">${escapeHtml(it.uf) || '-'}</td>
      <td class="right">${fmtNum(it.peso)}</td>
      <td class="center">${escapeHtml(it.inicio_entrega) || '-'} - ${escapeHtml(it.fim_entrega) || '-'}</td>
      <td class="obs">${escapeHtml(it.observacoes) || ''}</td>
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Manifesto ${escapeHtml(input.manifestoId)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 24px; }
  .header { border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; color: #0f172a; }
  .header .sub { margin-top: 4px; font-size: 13px; color: #475569; }
  .resume { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
  .card .value { font-size: 15px; font-weight: 600; margin-top: 4px; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #0f172a; color: #f8fafc; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .center { text-align: center; }
  .right { text-align: right; }
  .seq { font-weight: 700; color: #0f172a; width: 40px; }
  .obs { color: #475569; font-size: 11px; max-width: 260px; }
  .footer { margin-top: 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  @media print { body { margin: 12mm; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>Manifesto ${escapeHtml(input.manifestoId)}</h1>
    <div class="sub">Filial: ${escapeHtml(input.filialNome) || '-'} &middot; Data: ${escapeHtml(input.dataRodada)}</div>
  </div>
  <div class="resume">
    <div class="card"><div class="label">Veículo</div><div class="value">${escapeHtml(input.veiculoPerfil) || escapeHtml(input.veiculoTipo) || '-'}</div></div>
    <div class="card"><div class="label">Entregas</div><div class="value">${input.qtdEntregas}</div></div>
    <div class="card"><div class="label">Peso Total (kg)</div><div class="value">${fmtNum(input.pesoTotal)}</div></div>
    <div class="card"><div class="label">KM Total</div><div class="value">${fmtNum(input.kmTotal)}</div></div>
    <div class="card" style="grid-column: span 4;"><div class="label">Frete Mínimo (ANTT)</div><div class="value">${fmtMoney(input.freteMinimo)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Seq</th><th>Documento</th><th>Destinatário</th><th>Cidade</th><th>UF</th>
        <th class="right">Peso (kg)</th><th>Janela</th><th>Observações</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Documento gerado para operação — sequência conforme M7 / edições aplicadas pelo usuário.</div>
  <script>window.onload = () => { setTimeout(() => window.print(), 150); };</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('Não foi possível abrir a janela de impressão. Verifique bloqueadores de pop-up.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
