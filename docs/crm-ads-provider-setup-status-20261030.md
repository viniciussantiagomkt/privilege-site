# Conexão de anúncios: dependências externas

30/10/2026. O usuário confirmou nesta conversa que ainda não possui aplicativo Meta nem projeto Google Cloud preparados para a integração.

Estado já concluído: migration de anúncios no staging (21 versões), preview do painel READY e crm-ads-sync instalada v1 com chamadas sem autorização recusadas. Ver docs/crm-ads-preview-worker-20261030.md. A sincronização não está habilitada.

Próxima dependência: criação/configuração dos aplicativos oficiais pelo titular autorizado das contas. Não solicitar credenciais no chat. Não marcar contas como conectadas apenas por cadastro de IDs e não ativar cron antes de leitura real validada.

Meta: o titular deve entrar no portal oficial https://developers.facebook.com/apps/ usando o perfil autorizado e verificar se tem acesso ao painel de aplicativos ou se há cadastro de desenvolvedor pendente. Os nomes atuais de telas/opções não foram confirmados pela pesquisa web desta rodada; não orientar uma seleção por nome presumido. Depois conferir app/use case/produto adequados ao acesso de leitura de anúncios e requisitos oficiais de permissão/revisão para o modelo institucional/pessoal. Não aprovar termos ou criar apps em nome do titular sem o fluxo oficial autorizado.

Google: criar/configurar projeto Cloud e Google Ads API, consentimento OAuth, cliente e acesso permitido às contas conforme documentação atual. Não exigir automaticamente developer token por referência histórica; confirmar a política vigente do projeto antes da configuração. Não ativar faturamento ou serviços pagos como suposição.

Nesta etapa nenhuma nova aplicação externa, credencial, conexão, conta ou agendamento foi criada. A primeira ativação institucional e o acesso pessoal de corretores requerem consentimento explícito do titular. Onboarding OAuth self-service não está implementado. Segredos deverão ser configurados diretamente no ambiente seguro pelo fluxo administrativo documentado; jamais em campos do CRM, arquivos versionados ou mensagens.
