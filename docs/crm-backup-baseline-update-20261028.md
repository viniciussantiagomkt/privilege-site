# Backup staging: atualização do baseline

O usuário executou a versão anterior do script de backup, que exigia 16 migrations e ausência do RPC de diretório. O script parou antes do pg_dump por divergência. Arquivos parciais não são backup concluído.

A leitura remota confirmou exatamente 17 versões, terminando em 20261028143926 (Central de Marketing/notificações já autorizada e aplicada). A migration de motivo opcional ainda não consta. O script foi atualizado para exigir as 17 versões exatas e a presença do diretório, sem remover a proteção contra drift. Não houve aplicação/repetição de migration, restore ou escrita no staging.

Revisão estática e git diff --check passaram; PowerShell/Windows não está disponível neste ambiente para execução. Gerar nova cópia em pasta nova e validar restauração local antes da migration pendente. Preservar arquivos privados.
