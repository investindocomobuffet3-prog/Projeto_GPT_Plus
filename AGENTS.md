# AGENTS.md

## Regra obrigatória de sessão
No início de toda sessão:
1. leia `docs/HANDOFF.md`
2. leia `docs/CURRENT_STATE.md`

Quando necessário:
- ARCHITECTURE.md
- ROADMAP.md
- TESTING.md
- DEPLOYMENT.md
- SECURITY.md
- DECISIONS.md

No final de toda sessão significativa:
- atualize CURRENT_STATE.md
- atualize CHANGELOG.md
- atualize HANDOFF.md
- atualize ROADMAP/DECISIONS quando aplicável

## Regras de trabalho
1. Preserve lógica/UX aprovadas.
2. Automatize implementação e testes.
3. Trabalho manual só quando inevitável.
4. Forneça scripts completos.
5. Preserve gates aprovados.
6. Diagnostique só a camada que falhou.
7. Checkpoint/rollback antes de ação destrutiva.
8. Staging antes de produção.
9. Não mutar D1 production em testes.
10. Não habilitar centralWrite global sem gate explícito.
11. Não fazer commit/push/deploy oficial sem etapa prevista.
12. Não salvar secrets no repositório.
13. Sempre verificar cleanup E2E.
14. Tratar SPA fallback 200 como possível falso positivo.
15. Aguardar Pages Functions estabilizarem após deploy.

## Fonte de verdade
1. código
2. Git
3. docs/
4. testes/auditorias
5. conversa da IA

## Handoff
Ao receber `/handoff` ou `faça o handoff`:
- inspecione Git
- identifique mudanças e testes
- atualize CURRENT_STATE
- atualize CHANGELOG
- atualize ROADMAP/DECISIONS se necessário
- sobrescreva HANDOFF com estado acionável
- valide consistência
- nunca inclua secrets
- não faça commit/push sem autorização