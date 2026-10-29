# Gestão Escolar Integrada

DESENVOLVIMENTO DE APLICATIVO — SISTEMA INTELIGENTE DE GESTÃO DE SERVIDORES DA EDUCAÇÃO

1. Objetivo do projeto

Desenvolva um aplicativo web responsivo, moderno, profissional e funcional para a Secretaria Municipal de Educação, destinado ao controle administrativo, cadastro, organização, análise e gerenciamento dos servidores de toda a rede municipal de ensino.

O sistema deverá centralizar as informações dos funcionários, permitir a importação de planilhas Excel já existentes, calcular quantitativos automaticamente, organizar os servidores por situação funcional e apresentar dados estratégicos para auxiliar a Secretaria Municipal de Educação na tomada de decisões.

O aplicativo será utilizado principalmente pelo secretário municipal de Educação, subsecretário, setor de Recursos Humanos (RH), equipe administrativa autorizada e responsáveis pela gestão de pessoal.

Nome provisório: Gestão Inteligente de Servidores da Educação.

Objetivo principal: transformar os dados da planilha geral de servidores em um sistema digital organizado, pesquisável, editável, seguro e capaz de gerar relatórios administrativos completos.

2. Cadastro geral de servidores

Criar um módulo de cadastro individual para todos os servidores vinculados à Secretaria Municipal de Educação.

Cada cadastro deverá permitir armazenar:

- Nome completo.
- Matrícula funcional.
- CPF, com acesso restrito conforme o perfil do usuário.
- E-mail e telefone, quando disponíveis.
- Cargo.
- Função exercida.
- Situação funcional.
- Tipo de vínculo.
- Unidade escolar ou setor de lotação.
- Município e local de exercício, quando aplicável.
- Data de admissão ou ingresso.
- Data de desligamento, exoneração ou aposentadoria, quando aplicável.
- Carga horária.
- Turno de trabalho.
- Número e data do ato administrativo, quando houver.
- Observações administrativas.
- Histórico de alterações cadastrais.

Permitir cadastrar, consultar, editar, inativar e, conforme autorização, excluir registros. Preferir a inativação para preservar o histórico funcional e a rastreabilidade administrativa.

O sistema deverá impedir duplicidades indevidas, validar campos obrigatórios e permitir pesquisas por nome, matrícula, cargo, função, situação funcional e unidade de lotação.

3. Importação e análise automática da planilha Excel

Criar uma funcionalidade para importar a planilha geral de servidores utilizada atualmente pela Secretaria Municipal de Educação.

Formatos aceitos: XLSX e CSV.

Ao importar o arquivo, o sistema deverá:

1. Ler e identificar as colunas existentes.
2. Apresentar uma prévia dos dados antes de confirmar a importação.
3. Permitir relacionar as colunas da planilha aos campos do sistema.
4. Identificar registros duplicados, dados incompletos e possíveis inconsistências.
5. Informar quantos registros serão importados, atualizados, ignorados ou encaminhados para correção.
6. Permitir cancelar a operação antes de confirmar.
7. Preservar os dados originais e manter um registro da importação realizada.
8. Permitir exportar os dados tratados novamente para Excel.

Criar uma rotina de atualização da base cadastral para que o RH possa importar novas versões da planilha sem duplicar automaticamente todos os servidores.

A importação não deverá apagar ou substituir dados existentes silenciosamente. Toda atualização deverá apresentar uma prévia e solicitar confirmação.

4. Painel principal — Dashboard da Secretaria

Criar um painel visual com indicadores atualizados automaticamente conforme os cadastros e os filtros aplicados.

Apresentar cartões com:

- Total geral de servidores cadastrados.
- Total de servidores efetivos.
- Total de servidores contratados temporariamente.
- Total de servidores em processo seletivo.
- Total de servidores cedidos.
- Total de servidores permutados.
- Total de servidores desviados de função.
- Total de servidores requisitados, quando essa categoria existir na base.
- Total de servidores aposentados.
- Total de servidores exonerados.
- Total de servidores desligados.
- Total de servidores por cargo e função.
- Total de servidores por unidade escolar.
- Total de servidores por tipo de vínculo.
- Total de servidores por situação funcional.

Não contabilizar o mesmo servidor em duplicidade no total geral. As categorias deverão ser organizadas de forma que vínculos, situações e movimentações funcionais não provoquem somas incorretas.

Incluir gráficos e tabelas para facilitar a visualização da distribuição dos servidores por unidade, cargo, função e vínculo.

Disponibilizar filtros por ano, unidade escolar, cargo, função, vínculo e situação funcional.

5. Cadastro e quantitativo de unidades escolares e turmas

Criar um módulo para cadastrar as escolas e demais unidades vinculadas à Secretaria Municipal de Educação.

Cada unidade deverá possuir nome, código identificador, endereço, situação e demais informações administrativas necessárias.

Permitir cadastrar e consultar as turmas vinculadas a cada unidade, quando aplicável.

Apresentar:

- Quantidade total de unidades escolares no município.
- Quantidade de unidades por localidade.
- Quantidade total de turmas no município.
- Quantidade de turmas por unidade escolar.
- Quantidade de servidores lotados em cada unidade.
- Distribuição dos servidores por cargo e função em cada unidade.

Os quantitativos deverão ser calculados com base nos registros efetivamente cadastrados, sem valores fictícios ou preenchidos manualmente apenas para exibição.

6. Módulo de vagas disponíveis para concurso e contratação

Criar um módulo específico para planejamento de vagas e levantamento das necessidades de pessoal da rede municipal.

O sistema deverá analisar a quantidade de servidores por cargo e função, as situações funcionais e as informações disponíveis sobre vagas autorizadas, ocupadas e disponíveis.

Permitir cadastrar, por cargo e função:

- Quantidade de cargos ou vagas previstas em lei, quando informada.
- Quantidade de vagas autorizadas para provimento.
- Quantidade de vagas ocupadas.
- Quantidade de vagas disponíveis.
- Quantidade de vagas reservadas ou bloqueadas, quando aplicável.
- Quantidade de servidores efetivos.
- Quantidade de servidores temporários.
- Quantidade de servidores cedidos, permutados ou em outras situações.
- Quantidade de vagas previstas para concurso público.
- Quantidade de vagas previstas para processo seletivo.
- Observações e justificativas administrativas.
- Data de atualização das informações.

O sistema deverá apresentar uma relação de vagas por cargo e função e permitir filtrar os dados por unidade, quando a informação de lotação estiver disponível.

Regra fundamental: não presumir que toda aposentadoria, exoneração, cessão, permuta ou desvio de função gera automaticamente uma vaga legalmente disponível. O sistema deverá apresentar indicadores de necessidade de pessoal e permitir a validação das vagas pela equipe competente, com base na legislação, no quadro de cargos e nos atos administrativos aplicáveis.

7. Relatório de vagas para concurso público

Criar um relatório específico para auxiliar o planejamento de concursos públicos e processos seletivos.

O relatório deverá apresentar:

- Cargo e função.
- Quantidade de cargos previstos, quando informada.
- Quantidade de vagas autorizadas.
- Quantidade de vagas ocupadas.
- Quantidade de vagas disponíveis confirmadas.
- Quantidade de vagas cuja situação ainda depende de análise.
- Quantidade de servidores temporários.
- Quantidade de servidores efetivos.
- Necessidade estimada de contratação por cargo.
- Justificativa e observações.
- Data da última atualização.

Permitir gerar relatórios separados para:

1. Concurso público.
2. Processo seletivo simplificado.
3. Contratação temporária.
4. Levantamento de necessidades de pessoal.
5. Vagas por cargo e função.
6. Vagas por unidade escolar.

Disponibilizar visualização na tela, impressão e exportação para PDF e Excel.

Não apresentar estimativas como vagas oficialmente autorizadas. Diferenciar claramente os quantitativos calculados pelo sistema daqueles confirmados administrativamente.

8. Organização por situação funcional

Criar uma área para organizar os servidores nas seguintes categorias, conforme os registros e as regras administrativas do município:

- Efetivos.
- Contratados temporários.
- Servidores admitidos por processo seletivo.
- Cedidos.
- Permutados.
- Em desvio de função.
- Requisitados.
- Aposentados.
- Exonerados.
- Desligados.
- Outros vínculos ou situações cadastrados pelo administrador.

Permitir que os servidores sejam consultados por cada categoria, com quantitativos automáticos e relatórios individualizados.

As categorias deverão ser configuráveis para se adaptarem à estrutura administrativa municipal. Quando necessário, diferenciar tipo de vínculo, situação do vínculo e movimentação funcional para evitar classificações incorretas.

9. Cadastro administrativo e permissões de acesso

Criar uma área administrativa destinada ao secretário municipal de Educação, subsecretário, RH e demais usuários autorizados.

Permitir cadastrar usuários, definir perfis e atribuir permissões.

Perfis sugeridos:

- Administrador do sistema: gerencia configurações, usuários e permissões.
- Secretário de Educação: consulta indicadores gerais, relatórios e informações estratégicas.
- Subsecretário: consulta e acompanha os dados autorizados.
- RH: cadastra, edita, importa, atualiza e consulta dados funcionais conforme sua permissão.
- Equipe administrativa: acessa somente os módulos autorizados.
- Consulta: visualiza informações permitidas, sem alterar registros.

Registrar quem criou, alterou, importou ou inativou cada registro, incluindo data, hora e tipo de alteração.

Permitir que o secretário, o subsecretário e o RH tenham acesso de edição conforme as permissões definidas pelo administrador, sem obrigar que todas as funções administrativas fiquem concentradas em uma única conta.

10. Pesquisa, filtros e relatórios

Criar uma área central de relatórios com filtros e opções de exportação.

Relatórios obrigatórios:

- Relação geral de servidores.
- Relação de servidores por unidade escolar.
- Relação de servidores por cargo e função.
- Relação de servidores por situação funcional.
- Quantitativo de servidores por vínculo.
- Quantitativo de servidores por unidade.
- Relação de servidores efetivos.
- Relação de servidores contratados temporários.
- Relação de servidores cedidos e permutados.
- Relação de servidores em desvio de função.
- Relação de servidores aposentados e exonerados.
- Quadro geral de vagas.
- Relatório de vagas para concurso público.
- Relatório de vagas para processo seletivo.
- Relatório de inconsistências cadastrais.
- Histórico de alterações funcionais.

Os relatórios deverão possuir cabeçalho institucional, nome da Secretaria Municipal de Educação, título, período de referência, filtros utilizados, data de emissão e paginação.

Permitir impressão em formato A4, exportação para PDF e Excel e organização por ordem alfabética, cargo, função, vínculo ou unidade escolar.

Restringir os dados pessoais exibidos em cada relatório conforme o perfil do usuário e a finalidade administrativa.

11. Interface e identidade visual

Desenvolver uma interface profissional, intuitiva e de fácil utilização, inclusive para usuários sem conhecimentos técnicos avançados.

Utilizar:

- Layout responsivo para computador, tablet e celular.
- Menu lateral organizado por módulos.
- Painel principal com cartões de indicadores.
- Gráficos e tabelas de leitura simples.
- Campos de pesquisa e filtros visíveis.
- Botões claros para cadastrar, importar, editar, consultar, imprimir e exportar.
- Identificação visual institucional, com possibilidade de inserir o brasão do município e a logomarca da Secretaria de Educação.
- Cores sóbrias, aparência moderna e acessibilidade visual.

12. Segurança, privacidade e integridade dos dados

Implementar autenticação de usuários, controle de acesso por função e proteção das informações pessoais.

Aplicar os princípios da Lei Geral de Proteção de Dados Pessoais (LGPD), considerando a finalidade pública e a base legal adequada para o tratamento de dados funcionais.

Implementar:

- Controle de permissões no servidor e no banco de dados.
- Proteção de dados pessoais e documentos.
- Registro de auditoria das operações relevantes.
- Validação de formulários.
- Proteção contra acessos não autorizados.
- Política de backup e recuperação de dados.
- Tratamento seguro dos arquivos importados.
- Confirmação antes de operações críticas.
- Histórico de importações e alterações.
- Restrições de acesso a CPF e outras informações sensíveis.

Não utilizar apenas controles visuais na interface para proteger dados. As permissões também deverão ser aplicadas no backend e no banco de dados.

13. Banco de dados e funcionamento real

Utilizar uma estrutura de banco de dados persistente, preferencialmente integrada ao Supabase, com tabelas relacionadas para:

- Servidores.
- Cargos.
- Funções.
- Unidades escolares.
- Lotações.
- Tipos de vínculo.
- Situações funcionais.
- Vagas e quadro de cargos.
- Usuários e permissões.
- Histórico de alterações.
- Importações de planilhas.
- Relatórios e registros administrativos necessários.

Criar relacionamentos consistentes, identificadores únicos e validações para evitar duplicidade e perda de informações.

Todos os indicadores, filtros, cadastros e relatórios deverão utilizar os dados reais do banco de dados.

Não criar botões meramente decorativos, dados fictícios apresentados como reais ou funcionalidades simuladas como se estivessem concluídas.

14. Regras de cálculo

Implementar cálculos automáticos e transparentes.

O total geral deverá contar servidores únicos, conforme a regra de identificação definida pela Secretaria.

Os quantitativos por vínculo e situação deverão seguir critérios documentados, permitindo identificar quando um servidor possui mais de um vínculo funcional.

O cálculo de vagas deverá utilizar o quadro legal e administrativo informado, considerando as vagas ocupadas e as demais situações relevantes.

Quando não houver informação suficiente para calcular determinado indicador, apresentar “Dados insuficientes para cálculo” ou “Aguardando validação”, sem inventar valores.

Todos os cálculos deverão ser rastreáveis e passíveis de conferência.

15. Entrega esperada

Desenvolver o aplicativo em etapas, garantindo que cada módulo esteja funcional antes de avançar.

Etapa 1: autenticação, banco de dados, usuários e cadastro de servidores.

Etapa 2: importação e validação da planilha Excel.

Etapa 3: painel principal e indicadores automáticos.

Etapa 4: cadastro de unidades, cargos, funções e situações funcionais.

Etapa 5: quadro de vagas e planejamento de concurso público e processos seletivos.

Etapa 6: relatórios, impressão e exportação para PDF e Excel.

Etapa 7: permissões, auditoria, segurança e testes completos.

Antes de considerar o projeto concluído, testar o cadastro, a edição, a importação, a atualização de registros, os filtros, os cálculos, as permissões, a impressão e as exportações.

O resultado deverá ser um sistema administrativo realmente funcional, centralizado, seguro e preparado para auxiliar a Secretaria Municipal de Educação no gerenciamento de seus servidores e no planejamento das necessidades de pessoal da rede municipal.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e142983e-8f91-4023-979b-d437dc97d0cf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
