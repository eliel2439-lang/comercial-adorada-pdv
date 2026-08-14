# Comercial Adorada — PDV

Pacote preparado para publicação no GitHub e deploy no Vercel.

## Estrutura

- `index.html` — sistema PDV (versão preparada para publicação)
- `api/health.js` — rota simples para confirmar que o backend do Vercel está respondendo
- `vercel.json` — configuração do projeto Vercel
- `.gitignore` — impede o envio de arquivos locais e segredos
- `.env.example` — modelo vazio para futuras variáveis do banco e da integração fiscal

## MUITO IMPORTANTE SOBRE OS DADOS

Nesta etapa, o PDV continua guardando os dados principais no navegador (armazenamento local). Publicar no Vercel NÃO transfere automaticamente os dados que estavam salvos ao abrir o HTML pelo `file:///`.

Se já houver dados reais no HTML atual, antes de trocar de versão use no PDV as opções de backup/exportação e guarde o arquivo gerado.

O banco online será uma etapa separada. O Vercel hospeda o site e o backend, mas o banco precisa ser conectado a um serviço de banco de dados.

## GitHub

1. Crie um repositório, por exemplo: `comercial-adorada-pdv`.
2. Descompacte este ZIP no computador.
3. No GitHub, abra o repositório.
4. Use **Add file > Upload files**.
5. Envie o CONTEÚDO desta pasta, mantendo a pasta `api`.
6. Confirme o commit.

O arquivo `index.html` precisa ficar na raiz do repositório.

## Vercel

1. Entre no Vercel.
2. Escolha **Add New > Project** / **New Project**.
3. Conecte sua conta GitHub, se ainda não estiver conectada.
4. Selecione o repositório `comercial-adorada-pdv`.
5. Framework Preset: **Other**.
6. Para este projeto HTML puro não é necessário comando de build.
7. Faça o Deploy.

Depois do deploy, teste:

- Abra a URL principal do projeto: deve aparecer o PDV.
- Abra `/api/health`: deve retornar um JSON com `"ok": true`.

## Atualizações futuras

Depois que GitHub e Vercel estiverem ligados, cada alteração enviada ao branch de produção do repositório poderá gerar um novo deploy no Vercel.

## Banco de dados

Ainda NÃO ative a sincronização remota dentro do PDV.

O próximo passo técnico será conectar um banco Postgres compatível e criar as rotas reais de persistência. Só depois disso ativaremos `Sincronização` no sistema.

## Emissão fiscal

Não coloque no HTML/GitHub:

- senha do certificado digital;
- certificado digital;
- token da API fiscal;
- CSC secreto;
- senha do banco.

Esses dados deverão ficar como variáveis protegidas no Vercel/backend quando a integração fiscal for criada.
