# CAVC · Comunicação

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
- Clique em **Solicitar post** e preencha título, área, prazo, ideias, intenção, formato e uso de template.
- Abra um cartão para editar seus detalhes, atribuir um responsável e mudar a etapa: Post pedido → Sendo feito → Post feito → Programado → Postado.
- O responsável é obrigatório a partir da etapa Sendo feito. O prazo indica a entrega solicitada; Programado é uma etapa de organização, sem integração de publicação automática.
- Arraste cartões entre as colunas do kanban no computador. Se o post ainda não tiver responsável, a janela de detalhes abrirá para preenchê-lo antes de confirmar a mudança. No celular ou pelo teclado, use o campo **Etapa** nos detalhes do cartão.
- Use a busca e o filtro por área no quadro e no calendário.
- A aba **Calendário** exibe um mês completo com os posts nos seus prazos de entrega. Navegue pelas setas, use **Hoje** para voltar ao mês atual e clique num post para abrir os detalhes. No celular, deslize horizontalmente para ver todos os dias da semana.
- Nos detalhes do cartão, preencha **Link do Canva** com um endereço HTTPS do Canva. Depois de salvo, o link fica disponível ao reabrir o post, com o botão **Abrir design no Canva**. O site não altera as permissões de acesso do arquivo no Canva.
- Alterne entre os temas claro e escuro pelo botão no topo. A escolha fica salva neste navegador.
- Os exemplos iniciais podem ser editados ou excluídos pela janela do cartão.

## Banco de dados com Supabase

A integração com login por nome de usuário e senha, opção de mostrar/ocultar senha e banco compartilhado está implementada. Contas antigas continuam aceitando e-mail no login. A opção **Registrar conta** permite criar um usuário, que aguarda aprovação administrativa para acessar o quadro. Habilite cadastros e desative confirmação de e-mail no Supabase conforme o guia. Siga o [guia de configuração do Supabase](docs/SUPABASE.md) para criar o projeto, executar o SQL, autorizar a equipe e configurar o ambiente/Vercel. Sem as variáveis, a aplicação continua no modo local.

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
