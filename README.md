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

- Clique em **Solicitar post** e preencha título, área, prazo, ideias, intenção, formato e uso de template.
- Abra um cartão para editar seus detalhes, atribuir um responsável e mudar a etapa: Post pedido → Sendo feito → Post feito → Programado → Postado.
- O responsável é obrigatório a partir da etapa Sendo feito. O prazo indica a entrega solicitada; Programado é uma etapa de organização, sem integração de publicação automática.
- Use a busca, o filtro por área e a aba Calendário (lista ordenada pelos prazos).
- Os exemplos iniciais podem ser editados ou excluídos pela janela do cartão.

## Persistência e limitações

Os dados são salvos em `localStorage`, na chave `cavc-posts`, apenas neste navegador e endereço. Limpar os dados do navegador remove os posts. Não há servidor, autenticação ou sincronização entre usuários: para uso coletivo da equipe, conecte a aplicação a um backend/banco de dados com controle de acesso. Não armazene informações sensíveis nesta versão.

As fontes usam Google Fonts, com fontes locais de fallback quando indisponíveis. Ícones são fornecidos por lucide-react.

## Estrutura

- `src/main.jsx`: formulário, cartões, etapas, filtros e persistência.
- `src/style.css`: identidade visual escura e layouts responsivos.
- `index.html`: entrada da aplicação.
