# CAVC Gestão Lumiar

Site em React e Vite para organizar solicitações de posts, com visual escuro e responsivo.

## Iniciar

Pré-requisito: Node.js 22.12+ (ou 20.19+) e npm.

```bash
npm ci
npm run dev
```

Abra o endereço informado pelo Vite (normalmente porta 5173).
Se o ambiente restringir o cache padrão do npm, use `npm ci --cache /tmp/cavc-npm-cache`.

Para gerar e conferir a versão de produção:

```bash
npm run build
npm run preview
```

## Como usar

- As áreas disponíveis são **Academica, Mobilização, Eventos, APSM e Gestão**. Posts antigos mantêm sua área anterior até a edição; selecione uma área atual ao salvá-los.
- Ao marcar **Usar um template existente**, informe o nome ou referência no campo exibido.
- No quadro compartilhado, a Diretoria cria, atribui e movimenta os próprios pedidos. O Secretário também pode gerenciar pedidos e aprovar cadastros.
- Você pode atribuir a confecção ao criar o post ou ao arrastar um pedido sem atribuição para **Sendo feito**. Ao cancelar a atribuição, o pedido fica na coluna original. Quando outra pessoa é indicada, o post só muda de etapa após o aceite. Em um pedido próprio, use **Eu vou fazer** para iniciar na hora. Diretoria e Secretário podem indicar qualquer outro membro aprovado. Quem aceita pode editar o pedido em andamento e movê-lo para **Post feito**.
- O cartão mostra quem pediu o post e, depois do aceite, quem ficou responsável. Use o avatar na lateral para atualizar sua foto de perfil. A etapa pode ser alterada pelo campo **Etapa** ou arrastando o cartão entre as colunas permitidas. **Programado** é uma etapa de organização, sem integração de publicação automática.
- Use a busca e o filtro por área no quadro e no calendário.
- A aba **Calendário** exibe um mês completo com os posts nos seus prazos de entrega. Navegue pelas setas, use **Hoje** para voltar ao mês atual e clique num post para abrir os detalhes. No celular, deslize horizontalmente para ver todos os dias da semana.
- Nos detalhes do cartão, preencha **Link do Canva** com um endereço HTTPS do Canva. Depois de salvo, o link fica disponível ao reabrir o post, com o botão **Abrir design no Canva**. O site não altera as permissões de acesso do arquivo no Canva.
- Escolha Escuro, Escuro Lumiar ou Claro Lumiar no seletor do topo. Na primeira visita, o tema é Escuro Lumiar. A escolha fica salva em um cookie por até um ano.
- Os exemplos iniciais podem ser editados ou excluídos pela janela do cartão.

## Banco de dados com Supabase

O cadastro usa e-mail real, nome de usuário e cargo solicitado. Depois de confirmar o e-mail, a pessoa aguarda a aprovação do Secretário, que define o cargo efetivo. O [guia do Supabase](docs/SUPABASE.md) inclui a migração que preserva os posts e a autorização do primeiro Secretário. Sem as variáveis, a aplicação usa o modo local.

## Persistência e limitações

No modo local, os posts ficam em `localStorage` (`cavc-posts`) neste navegador. No modo Supabase, os posts ficam no banco compartilhado, acessíveis apenas às contas autorizadas pela tabela `team_members`. O quadro atualiza ao voltar à janela ou clicar em **Atualizar quadro**. Dados antigos locais não são migrados automaticamente.

Testes: `npm test` (contrato de persistência e tratamento de conflitos). Compilação: `npm run build`. O teste contra o serviço real exige configurar o projeto conforme o guia.

As fontes usam Google Fonts, com fontes locais de fallback quando indisponíveis. Ícones são fornecidos por lucide-react.

## Estrutura

- `src/main.jsx`: formulário, cartões, etapas, filtros e persistência.
- `src/AuthGate.jsx`: login e sessão.
- `src/postRepository.js` e `src/usePostStore.js`: persistência local/remota e conflitos.
- `supabase/schema.sql`: tabelas, validações e políticas de acesso.
- `src/style.css`: identidade visual escura e layouts responsivos.
- `index.html`: entrada da aplicação.
