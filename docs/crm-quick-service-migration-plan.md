# Etapa 03 | Plano anterior ao SQL

Proposta local, não autorizada para aplicação remota. Base PR #14, commit 26d2c1a. Etapa 02 homologada manualmente pelo usuário: 12/12 cenários, sem falha relatada; não integrada à produção.

## Mudança mínima

Acrescentar a clients um interest_profile JSONB validado e interest_revision para concorrência otimista. Não criar outra tabela de contatos, leads ou histórico. Manter todas as políticas de carteira existentes e a titularidade. Índice não único por dono/telefone normalizado, preservando duplicatas legadas.

RPC de cadastro/edição rápida valida sessão comercial, dono, campos permitidos, revisão e duplicidade somente na carteira acessível. Serializa operações de cadastro rápido por usuário e usa recibo de ação no crm_event_log existente para retries idempotentes. Não cria lead automaticamente. Colisões de telefone em outra carteira não são consultadas nem reveladas. Formulários antigos continuam disponíveis.

Reutilizar crm_audit_change, sem expor before_data/after_data. RPC de timeline devolve somente resumos dos eventos relacionados ao cliente autorizado. Contato confirmado usa evento explícito idempotente no crm_event_log; abrir WhatsApp/copiar texto não gera contato realizado. Tarefas, visitas, propostas, negociações e apresentações mantêm seus registros atuais.

## Riscos e controles

- JSON inválido/financeiro excessivo: allowlist de chaves, tipos, limites, valores decimais, faixas e texto; sem documentos, renda ou dados bancários.
- IDOR: sessão validada no banco, client_readable e dono atual; gestão sem exceção para carteiras alheias.
- Escrita direta: constraint valida JSON; trigger mantém revisão; RLS existente continua protegendo clientes. Recibos/eventos não têm DML de navegador.
- Concorrência: lock por corretor nas gravações rápidas, revisão otimista e recibo por action_id. Fluxo antigo não é apresentado como garantia global de unicidade.
- História privada: leitura resumida, sem snapshots; relações sempre limitadas ao cliente/corretor autorizado.
- Schema ausente: mensagem de recurso ainda indisponível, sem sucesso fictício ou fallback que perca o perfil. Recursos anteriores continuam utilizáveis.

## Testes locais antes de qualquer aplicação

PGlite com schema versionado e claims sintéticas: A/B/admin/gestor/anon/inativo; ID alheio, contato arquivado, JSON adulterado, dono forjado, revisão obsoleta, retry, payload diferente com mesmo recibo, duplicidade e telefone de outra carteira. Conferir eventos únicos, ausência de lead automático e resumos sem dados privados. Não equivale a JWT/RLS remoto ou concorrência multi-sessão real.

Código e navegador com fixtures isoladas: CRUD, perfil, validações, duplicidade, WhatsApp sem envio, rascunho/revisão sem microfone, erros, sessão, rotas antigas, teclado e 360/768/1440. Lint, TypeScript, build seguro e suíte anterior.

## Rollback proposto

Antes de aplicação futura: backup atualizado e restauração local verificada, preflight e autorização específica de staging. Não reaplicar migrations históricas. Para retornar a interface, usar commit anterior com dados novos preservados. Remover RPCs/triggers/índice adicionados somente após revisão de dependências; exportar com proteção os perfis/recibos necessários antes de qualquer remoção de colunas. Não apagar audit_logs/crm_event_log ou executar DROP CASCADE. Colunas podem permanecer sem uso durante rollback de aplicação. Nenhum rollback remoto será executado nesta etapa.
