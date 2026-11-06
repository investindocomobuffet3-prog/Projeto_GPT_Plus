import { fichasService } from '../services/fichasService.js';

const TIPOS = {
  massa: 'Massa',
  recheio: 'Recheio',
  reducao: 'Redução',
  doce: 'Doce',
  sobremesa: 'Sobremesa',
  cobertura: 'Cobertura',
};

const state = { fichaEditandoId: null, ingredientesTemporarios: [] };

const esc = value => String(value ?? '')
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&#039;');

const money = value => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function custoInsumo(insumoId, estoqueService) {
  return Number(estoqueService?.buscarItemPorInsumoId?.(insumoId)?.custoMedio || 0);
}

function nomeInsumo(insumoId, insumos) {
  const i = insumos.find(item => String(item.id) === String(insumoId));
  return i ? `${i.nome}${i.marca ? ` - ${i.marca}` : ''}` : 'N/A';
}

function renderIngredientes(insumos) {
  if (!state.ingredientesTemporarios.length) {
    return '<p class="empty-state">Nenhum ingrediente adicionado.</p>';
  }

  return `<table class="data-table">
    <thead><tr><th>Ingrediente</th><th>Quantidade</th><th>Custo unit.</th><th>Subtotal</th><th>Ações</th></tr></thead>
    <tbody>${state.ingredientesTemporarios.map((ing,index)=>`
      <tr>
        <td>${esc(nomeInsumo(ing.insumoId,insumos))}</td>
        <td>${Number(ing.quantidade || 0)}</td>
        <td>${money(ing.custoUnitario)}</td>
        <td>${money(Number(ing.quantidade || 0)*Number(ing.custoUnitario || 0))}</td>
        <td><button type="button" class="btn secondary ficha-remove-ingrediente" data-index="${index}">Remover</button></td>
      </tr>`).join('')}</tbody>
  </table>`;
}

function renderLista(fichas) {
  if (!fichas.length) return '<div class="empty-state"><p>Nenhuma ficha técnica cadastrada.</p></div>';

  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Nome</th><th>Tipo</th><th>Rendimento</th><th>Ingredientes</th><th>Custo total</th><th>Custo unitário</th><th>Ações</th></tr></thead>
    <tbody>${fichas.map(f=>`
      <tr>
        <td><strong>${esc(f.nome)}</strong>${f.panelaReferencia ? `<br><small>Panela ${esc(f.panelaReferencia)}</small>` : ''}</td>
        <td>${esc(TIPOS[f.tipo] || f.tipo || '-')}</td>
        <td>${Number(f.rendimento || 0)} ${esc(f.unidadeMedida || '')}</td>
        <td>${f.ingredientes?.length || 0}</td>
        <td>${money(f.custoTotal)}</td>
        <td>${money(f.custoUnitario)}</td>
        <td>
          <button type="button" class="btn secondary ficha-editar" data-id="${esc(f.id)}">Editar</button>
          <button type="button" class="btn ficha-excluir" data-id="${esc(f.id)}">Excluir</button>
        </td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

export function renderFichas(insumosService, estoqueService) {
  const fichas = fichasService.listar();
  const insumos = insumosService.listar();
  const editando = state.fichaEditandoId ? fichasService.buscarPorId(state.fichaEditandoId) : null;

  if (editando && state.ingredientesTemporarios.length === 0) {
    state.ingredientesTemporarios = editando.ingredientes.map(ing => ({
      ...ing,
      custoUnitario: custoInsumo(ing.insumoId, estoqueService) || ing.custoUnitario,
    }));
  }

  const custoTotal = fichasService.calcularCustoTotal(state.ingredientesTemporarios);

  return `
    <section class="page-header"><div>
      <h2>Fichas Técnicas</h2>
      <p class="page-description">Receitas, rendimento, ingredientes e custo calculado pelo estoque.</p>
    </div></section>

    <section class="page-content">
      <div class="info-box"><p>Total de fichas técnicas: <strong>${fichas.length}</strong></p></div>

      <div class="form-container">
        <h3>${editando ? 'Editar ficha técnica' : 'Nova ficha técnica'}</h3>
        <form id="ficha-form">
          <div class="form-grid">
            <label>Nome *<input name="nome" required value="${esc(editando?.nome || '')}"></label>
            <label>Tipo *<select name="tipo">${Object.entries(TIPOS).map(([v,l])=>`<option value="${v}" ${(editando?.tipo || 'massa')===v?'selected':''}>${l}</option>`).join('')}</select></label>
            <label>Rendimento *<input name="rendimento" type="number" min="0" step="0.001" required value="${esc(editando?.rendimento ?? '')}"></label>
            <label>Unidade<select name="unidadeMedida">${['g','kg','ml','L','un'].map(u=>`<option value="${u}" ${(editando?.unidadeMedida || 'g')===u?'selected':''}>${u}</option>`).join('')}</select></label>
            <label>Panela / referência<input name="panelaReferencia" value="${esc(editando?.panelaReferencia || '')}"></label>
            <label>Peso padrão do doce (g)<input name="pesoPadraoDoce" type="number" min="0" step="0.001" value="${esc(editando?.pesoPadraoDoce ?? '')}"></label>
            <label>Ficha base<select name="baseId"><option value="">Nenhuma</option>${fichas.filter(f=>String(f.id)!==String(editando?.id||'')).map(f=>`<option value="${esc(f.id)}" ${String(editando?.baseId||'')===String(f.id)?'selected':''}>${esc(f.nome)}</option>`).join('')}</select></label>
            <label>Qtd base (g)<input name="baseQuantidadeG" type="number" min="0" step="0.001" value="${esc(editando?.baseQuantidadeG ?? '')}"></label>
          </div>

          <h4>Ingredientes</h4>
          <div class="form-grid">
            <label>Insumo<select id="ficha-insumo"><option value="">Selecione...</option>${insumos.map(i=>`<option value="${esc(i.id)}">${esc(i.nome)}${i.marca?` - ${esc(i.marca)}`:''}</option>`).join('')}</select></label>
            <label>Quantidade<input id="ficha-ing-qtd" type="number" min="0" step="0.001"></label>
            <div><button type="button" id="ficha-add-ingrediente" class="btn secondary">+ Adicionar ingrediente</button></div>
          </div>

          ${renderIngredientes(insumos)}
          <div class="info-box"><p>Custo total calculado: <strong>${money(custoTotal)}</strong></p></div>
          <label>Modo de preparo<textarea name="modoPreparo">${esc(editando?.modoPreparo || '')}</textarea></label>
          <label>Observações<textarea name="observacoes">${esc(editando?.observacoes || '')}</textarea></label>

          <div class="form-actions">
            <button type="submit" class="btn">${editando ? 'Salvar alterações' : 'Adicionar ficha'}</button>
            ${editando ? '<button type="button" id="ficha-cancelar" class="btn secondary">Cancelar</button>' : ''}
          </div>
        </form>
      </div>

      <div class="lista-container"><h3>Fichas cadastradas</h3>${renderLista(fichas)}</div>
    </section>`;
}

export function attachFichasHandlers(insumosService, estoqueService, rerender) {
  const form = document.getElementById('ficha-form');
  if (!form) return;

  document.getElementById('ficha-add-ingrediente')?.addEventListener('click', () => {
    const insumoId = document.getElementById('ficha-insumo')?.value;
    const quantidade = Number(document.getElementById('ficha-ing-qtd')?.value || 0);

    if (!insumoId) return alert('Selecione um insumo.');
    if (quantidade <= 0) return alert('A quantidade deve ser maior que zero.');

    const atual = state.ingredientesTemporarios.find(i => String(i.insumoId) === String(insumoId));
    if (atual) {
      atual.quantidade += quantidade;
      atual.custoUnitario = custoInsumo(insumoId, estoqueService);
    } else {
      state.ingredientesTemporarios.push({
        insumoId,
        quantidade,
        custoUnitario: custoInsumo(insumoId, estoqueService),
      });
    }
    rerender();
  });

  document.querySelectorAll('.ficha-remove-ingrediente').forEach(button => {
    button.addEventListener('click', () => {
      state.ingredientesTemporarios.splice(Number(button.dataset.index),1);
      rerender();
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const fd = new FormData(form);
    const payload = {
      nome: fd.get('nome'),
      tipo: fd.get('tipo'),
      rendimento: Number(fd.get('rendimento')),
      unidadeMedida: fd.get('unidadeMedida'),
      ingredientes: state.ingredientesTemporarios,
      pesoPadraoDoce: fd.get('pesoPadraoDoce'),
      baseId: fd.get('baseId') || null,
      baseQuantidadeG: fd.get('baseQuantidadeG'),
      panelaReferencia: fd.get('panelaReferencia'),
      modoPreparo: fd.get('modoPreparo'),
      observacoes: fd.get('observacoes'),
    };

    let result = state.fichaEditandoId
      ? fichasService.editar(state.fichaEditandoId,payload)
      : fichasService.adicionar(payload);

    if (!result.sucesso && result.avisoNomeDuplicado && confirm(result.erros.join('\n'))) {
      result = fichasService.adicionar({...payload,forceAdd:true});
    }

    if (!result.sucesso) return alert((result.erros || ['Falha ao salvar ficha.']).join('\n'));

    state.fichaEditandoId = null;
    state.ingredientesTemporarios = [];
    rerender();
  });

  document.getElementById('ficha-cancelar')?.addEventListener('click', () => {
    state.fichaEditandoId = null;
    state.ingredientesTemporarios = [];
    rerender();
  });

  document.querySelectorAll('.ficha-editar').forEach(button => {
    button.addEventListener('click', () => {
      const ficha = fichasService.buscarPorId(button.dataset.id);
      if (!ficha) return;
      state.fichaEditandoId = ficha.id;
      state.ingredientesTemporarios = ficha.ingredientes.map(ing => ({
        ...ing,
        custoUnitario: custoInsumo(ing.insumoId,estoqueService) || ing.custoUnitario,
      }));
      rerender();
    });
  });

  document.querySelectorAll('.ficha-excluir').forEach(button => {
    button.addEventListener('click', () => {
      if (!confirm('Deseja realmente excluir esta ficha técnica?')) return;
      fichasService.remover(button.dataset.id);
      state.fichaEditandoId = null;
      state.ingredientesTemporarios = [];
      rerender();
    });
  });
}