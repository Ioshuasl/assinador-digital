# 📦 Guia de Instalação do Ghostscript

**Versão:** Windows e Linux

**Nível de Dificuldade:** Básico

Este guia tem como objetivo preparar o seu computador para executar comandos de manipulação de PDF. O Ghostscript é uma ferramenta de "linha de comando", o que significa que ele não tem uma "janela bonitinha" (interface gráfica) como o Word ou Excel; ele funciona nos bastidores.

---

## 🖥️ 1. Instalação no Windows

No Windows, o processo é dividido em duas etapas: instalar o programa e "ensinar" o Windows onde ele está (Configuração de Variáveis).

### Passo 1: Download e Instalação

1. Acesse o site oficial de downloads ou o repositório confiável indicado pela sua equipe.
* *Nota:* Busque pela versão **"Ghostscript AGPL Release"**.


2. Escolha a versão compatível com seu sistema (geralmente **Ghostscript [versão] for Windows (64 bit)**).
3. Baixe o arquivo instalador (ex: `gs10012w64.exe`).
4. Execute o instalador:
* Clique em **Next** (Próximo).
* Clique em **I Agree** (Eu concordo).
* **Importante:** Anote o caminho de instalação sugerido (Geralmente é `C:\Program Files\gs\gs10.XX`).
* Clique em **Install**.
* Ao finalizar, clique em **Finish**.



### Passo 2: Configurando o Caminho (O "Pulo do Gato")

Para que você possa abrir o terminal em qualquer pasta e digitar apenas `gswin64c` sem dar erro, precisamos configurar as **Variáveis de Ambiente**.

1. No teclado, aperte a tecla **Windows** e digite: `Variáveis de ambiente`.
2. Clique na opção: **"Editar as variáveis de ambiente do sistema"**.
3. Na janela que abrir, clique no botão **Variáveis de Ambiente...** (no canto inferior direito).
4. Na caixa de baixo (**Variáveis do sistema**), procure a linha chamada **Path** e selecione-a.
5. Clique em **Editar**.
6. Clique em **Novo** e cole o caminho da pasta `bin` do Ghostscript.
* *Exemplo:* `C:\Program Files\gs\gs10.06\bin`
* *(Dica: A pasta `bin` é onde ficam os executáveis dentro da pasta que você instalou).*


7. Clique em **OK** em todas as janelas para salvar.

### Passo 3: Testando se funcionou

1. Abra o **Prompt de Comando** (cmd) ou **PowerShell**.
2. Digite o comando abaixo e aperte Enter:
```bash
gswin64c --version

```


3. **Resultado esperado:** Se aparecer o número da versão (ex: `10.06`) e informações de copyright, está tudo pronto!

---

## 🐧 2. Instalação no Linux

No Linux, a instalação é muito mais direta, pois o Ghostscript já está presente nos repositórios oficiais da maioria das distribuições.

### Método Recomendado (Gerenciador de Pacotes)

Abra o seu terminal e execute o comando correspondente à sua distribuição:

**Para Ubuntu, Debian e derivados (Mint, Pop!_OS):**

```bash
sudo apt update
sudo apt install ghostscript

```

**Para Fedora, CentOS, RHEL:**

```bash
sudo dnf install ghostscript

```

**Para Arch Linux:**

```bash
sudo pacman -S ghostscript

```

### Método Alternativo (Compilação via Código Fonte)

*Use este método apenas se precisar de uma versão específica que não está na loja oficial.*

Conforme detalhado no arquivo *building from source.pdf* que analisamos:

1. Baixe o código fonte (`.tar.gz`) no site do Ghostscript.
2. Extraia o arquivo.
3. No terminal, entre na pasta extraída e rode:
```bash
./configure
make
sudo make install

```



### Passo Final: Testando no Linux

1. No terminal, digite:
```bash
gs --version

```


2. **Resultado esperado:** O terminal deve retornar a versão instalada (ex: `9.55` ou `10.06`).

---

## ⚠️ Diferenças Importantes de Comandos

Uma confusão muito comum para quem está começando é o nome do comando principal. Anote essa diferença:

| Sistema Operacional | Nome do Comando no Terminal | Observação |
| --- | --- | --- |
| **Linux / Mac** | **`gs`** | Simples e curto. |
| **Windows** | **`gswin64c`** | O "c" no final significa "Command Line" (Linha de comando). Se usar apenas `gswin64`, ele abrirá uma janelinha separada, o que não é ideal para automação. |

---

# 📦 Complemento de Instalação: Arquivos de Cor (ICC)

**Motivo:** Obrigatório para criar arquivos PDF/A válidos.

O PDF/A exige que você diga a ele exatamente "o que é a cor vermelha" matematicamente. Para isso, usamos um arquivo padrão internacional chamado **sRGB**. O Ghostscript não baixa isso sozinho na instalação básica do Windows.

### No Windows: Baixando e Organizando

1. **Baixe o Perfil sRGB:**
* O perfil mais comum e compatível é o `srgb.icc`.
* Você pode baixá-lo diretamente do repositório oficial do Ghostscript ou de sites de padrões de cor.
* *Para facilitar:* Acesse o GitHub do Artifex (criador do Ghostscript), procure a pasta `iccprofiles` e baixe o arquivo `srgb.icc` (ou `default_rgb.icc`).


2. **Crie uma Pasta Organizada:**
* Não deixe esse arquivo solto na pasta de Downloads.
* Vá até o disco `C:`
* Crie uma pasta chamada `gs_arquivos` (vamos usar essa pasta para guardar scripts e perfis).
* Dentro dela, coloque o arquivo `srgb.icc` que você baixou.


3. **O Caminho Final:**
* Anote este caminho, vamos usá-lo nos comandos:
* `C:\gs_arquivos\srgb.icc`



### No Linux: Verificando a Instalação

No Linux, geralmente os pacotes de instalação já trazem esses perfis, mas eles ficam em pastas do sistema.

1. Abra o terminal e verifique se o pacote de perfis está instalado.
* **Debian/Ubuntu:**
```bash
sudo apt install icc-profiles-free

```




2. **Localize o arquivo:**
* Geralmente ele é instalado em `/usr/share/color/icc/`.
* Você pode verificar com o comando:
```bash
find /usr/share/color/icc -name "srgb.icc"

```


* *Anote o caminho que aparecer.* Se não encontrar, você pode baixar o arquivo manualmente (igual no Windows) e colocar na sua pasta de usuário.



---

# 🛠️ Parte 2: Conceitos e Comandos Básicos

**Nível:** Iniciante
**Objetivo:** Entender a estrutura de um comando ("A Receita") para não apenas copiar e colar códigos sem saber o que eles fazem.

## 1. A Anatomia do Comando (A "Fórmula")

Todo comando do Ghostscript segue uma lógica estrita. Se você entender essa ordem, nunca mais ficará perdido. A estrutura é sempre esta:

`[PROGRAMA]` + `[FERRAMENTA]` + `[AJUSTES]` + `[SAÍDA]` + `[ENTRADA]`

Vamos traduzir isso para a linguagem do Ghostscript:

1. **O Programa (`gswin64c`):** "Ei, computador, chame o Chef Ghostscript."
2. **A Ferramenta (`-sDEVICE`):** "Chef, use a ferramenta de criar PDF (ou a de criar Imagem)."
3. **Os Ajustes (Flags):** "Não faça perguntas, termine rápido, use alta qualidade."
4. **A Saída (`-o`):** "O prato pronto deve ser entregue neste arquivo."
5. **A Entrada:** "Os ingredientes brutos estão neste arquivo aqui."

---

## 2. O Conceito de "Device" (Dispositivo)

Esta é a parte mais importante que aprendemos nos arquivos *Output Devices* e *High Level Devices*.
O Ghostscript é modular. Ele não sabe o que você quer fazer até que você escolha o **Dispositivo (`-sDEVICE`)**.

Existem dois tipos principais de dispositivos que você vai usar:

### A. Dispositivos de Imagem (Baixo Nível)

Transformam as páginas do seu PDF em fotos (JPG, PNG).

* **Comando:** `-sDEVICE=png16m` (Cria um PNG colorido de alta qualidade).
* **Comando:** `-sDEVICE=jpeg` (Cria um JPG padrão).

### B. Dispositivos de Vetor (Alto Nível)

Criam novos arquivos PDF. É aqui que faremos nossa mágica de conversão.

* **Comando:** `-sDEVICE=pdfwrite`
* *Nota:* Este é o dispositivo que lê um PDF e "reescreve" ele do zero. É essencial para limpar arquivos corrompidos ou, no seu caso, converter para **PDF/A**.

---

## 3. As "Flags" Essenciais (Os Temperos)

Nos manuais que você enviou (*usando ghostscript.pdf*), existem centenas de comandos. Mas 90% do tempo você só precisa destes quatro:

| Flag (Comando) | Significado Simples | Por que usar? |
| --- | --- | --- |
| **`-dNOPAUSE`** | "Não faça pausas" | Sem isso, o Ghostscript para a cada página e pergunta se pode continuar. Queremos que ele vá direto. |
| **`-dBATCH`** | "Feche ao terminar" | Sem isso, após terminar o serviço, o terminal fica aberto esperando novos comandos. Isso fecha o programa automaticamente. |
| **`-dSAFER`** | "Modo Seguro" | Bloqueia que o Ghostscript delete arquivos ou acesse pastas do sistema que não deve. Sempre use por segurança. |
| **`-r300`** | "Resolução" | Define a qualidade (300 DPI é o padrão de impressão). Se não colocar, ele pode usar uma qualidade baixa de tela (720 dpi interno, mas rasterizado a 72/96 dpi). |

---

## 4. O Atalho Mágico: `-o` vs `-sOutputFile`

Você encontrará tutoriais antigos ensinando a usar `-sOutputFile=arquivo.pdf`.
Porém, as versões modernas (que instalamos) têm um "atalho mágico": a flag **`-o`**.

* **Jeito Antigo (Difícil):**
`... -sOutputFile=saida.pdf -dBATCH -dNOPAUSE ...`
*(Você é obrigado a digitar o batch e nopause para ele não travar).*
* **Jeito Novo (Recomendado):**
`... -o saida.pdf ...`
*(Ao usar `-o`, o Ghostscript já entende automaticamente que é para salvar, não pausar e fechar ao terminar. É muito mais limpo).*

---

## 5. Mão na Massa: Seus Primeiros Comandos

Abra seu terminal (Prompt de Comando) e vamos testar se você entendeu a "Fórmula".
*Certifique-se de ter um arquivo chamado `teste.pdf` na pasta onde você está, ou mude o nome no comando.*

### Exemplo 1: Convertendo PDF em Imagem (PNG)

Vamos pegar a página 1 do seu PDF e virar uma foto.

```bash
gswin64c -dSAFER -sDEVICE=png16m -r300 -o pagina-01.png teste.pdf

```

* **Tradução:** Ghostscript, modo seguro, use a ferramenta de PNG colorido, qualidade 300, salve como `pagina-01.png`, usando o ingrediente `teste.pdf`.

### Exemplo 2: O "Re-escritor" de PDF (Preparação para PDF/A)

Vamos pegar um PDF e pedir para o Ghostscript reescrevê-lo. Isso geralmente diminui o tamanho do arquivo.

```bash
gswin64c -dSAFER -sDEVICE=pdfwrite -o novo_arquivo.pdf teste.pdf

```

* **Tradução:** Ghostscript, modo seguro, use a ferramenta de escrever PDF, salve como `novo_arquivo.pdf`, usando o ingrediente `teste.pdf`.

---

### ⚠️ Resumo para Linux

Se você estiver no Linux, a lógica é **exatamente a mesma**. A única mudança é o nome do Chef.

* Onde está escrito `gswin64c`, leia-se **`gs`**.
* Exemplo: `gs -dSAFER -sDEVICE=pdfwrite -o novo.pdf input.pdf`

---

Chegamos à parte final e mais importante. É aqui que vamos juntar a **Instalação (Parte 1)** e os **Comandos (Parte 2)** para realizar o objetivo principal: criar um documento à prova de futuro.

---

# 🛡️ Parte 3: Conversão para PDF/A

**Nível:** Intermediário
**Objetivo:** Transformar um PDF comum em um arquivo de arquivamento de longo prazo (PDF/A-2b), aceito por cartórios, tribunais e órgãos governamentais.

## 1. O Conceito: O que é PDF/A?

Imagine que um PDF comum é como um **papel impresso a lápis**. Com o tempo, ou se você mudar de país (mudar de computador), a fonte pode mudar, as cores podem desbotar ou referências podem se perder.

O **PDF/A** é como **plastificar esse documento**. Ele obriga o arquivo a conter *tudo* o que ele precisa dentro dele (fontes, cores, metadados) para garantir que, daqui a 20 anos, ele abra exatamente igual a hoje.

Para fazer isso, o Ghostscript precisa de uma "Certidão de Nascimento" para o arquivo. No mundo técnico, chamamos isso de arquivo `PDFA_def.ps`.

---

## 2. O Ingrediente Secreto: Criando o `PDFA_def.ps`

O Ghostscript não faz PDF/A apenas com uma "flag". Ele precisa de um arquivo de texto auxiliar que diga: *"Estou usando tais cores e este arquivo é um PDF/A"*.

Vamos criar esse arquivo agora. Não se assuste, é apenas copiar e colar.

1. Abra o **Bloco de Notas** do Windows.
2. Copie **exatamente** o código abaixo e cole no Bloco de Notas:

```postscript
%!
% Define o caminho do perfil.
/ICCProfile (C:/gs_arquivos/sRGB2014.icc) def

% Configurações do PDF/A
[ /GTS_PDFA1 true def
  /Title (PDF/A-1b Compliant)
  /DOCINFO pdfmark

% Carrega o arquivo de cor
[ /_objdef {icc_PDFIt} /type /stream /OBJ pdfmark
[ {icc_PDFIt} <</N 3 >> /PUT pdfmark
[ {icc_PDFIt} ICCProfile (r) file /PUT pdfmark

% Define a Intenção de Saída (OutputIntent) com o nome PADRAO
[ /Type /OutputIntent
  /DestOutputProfile {icc_PDFIt}
  /OutputConditionIdentifier (sRGB IEC61966-2.1)
  /Info (sRGB IEC61966-2.1)
  /RegistryName (http://www.color.org)
  /Subtype /GTS_PDFA1
  /OUTPUTINTENT pdfmark

```

3. **Atenção Crítica:** Veja a linha `/ICCProfile (C:/gs_arquivos/sRGB2014.icc) def`.
* O Ghostscript usa barras normais `/` mesmo no Windows. **Não use** contra-barras `\`.
* Certifique-se de que o arquivo `sRGB2014.icc` (que baixamos na Parte 1) esteja realmente nessa pasta.


4. Clique em **Arquivo > Salvar Como**.
5. Navegue até a pasta `C:\gs_arquivos`.
6. Em "Tipo", mude de "Documentos de texto" para **"Todos os arquivos"**.
7. Nomeie o arquivo como: `PDFA_def.ps`
8. Salve.

---

## 3. A Receita Final (O Comando de Conversão)

Agora temos tudo:

1. **O Chef:** `gswin64c`
2. **O Perfil de Cor:** `sRGB2014.icc` (na pasta)
3. **As Regras:** `PDFA_def.ps` (na pasta)
4. **O Documento:** `entrada.pdf` (seu arquivo original)

Abra o terminal (CMD) na pasta onde está o seu PDF original e execute este comando (pode copiar tudo numa linha só):

```bash
gswin64c -dSAFER --permit-file-read="C:\gs_arquivos\\" -dBATCH -dNOPAUSE -sDEVICE=pdfwrite -dPDFA=1 -dPDFACompatibilityPolicy=1 -dOverrideICC=true -sColorConversionStrategy=UseDeviceIndependentColor -sProcessColorModel=DeviceRGB -sOutputICCProfile="C:\gs_arquivos\sRGB2014.icc" -sOutputFile=resultado_final.pdf "C:\gs_arquivos\PDFA_def.ps" entrada.pdf

```



### 🔍 Dicionário do Comando (Tag por Tag)

Dividimos o comando em **4 blocos lógicos** para facilitar o entendimento:

#### Bloco 1: Segurança e Controle

* **`gswin64c`**: É o "Chef de Cozinha". O executável do programa.
* **`-dSAFER`**: A "Trava de Segurança". Impede que o comando apague arquivos ou acesse pastas do Windows que não deveria.
* **`--permit-file-read="C:\gs_arquivos\\"`**: A "Permissão VIP". Como ativamos a trava de segurança (`SAFER`), precisamos dar uma permissão explícita para ele ler os arquivos de cor dentro da nossa pasta `gs_arquivos`. Sem isso, o comando falha silenciosamente.
* **`-dBATCH`**: "Feche a loja". Ao terminar o serviço, fecha o terminal do Ghostscript.
* **`-dNOPAUSE`**: "Sem interrupções". Processa todas as páginas de uma vez sem parar para perguntar "posso continuar?".

#### Bloco 2: O Motor de Conversão

* **`-sDEVICE=pdfwrite`**: A "Máquina". Escolhe a ferramenta interna que reescreve arquivos PDF (é a única capaz de criar PDF/A).
* **`-dPDFA=1`**: A "Norma". Define que queremos um arquivo **PDF/A-1**. É uma versão mais antiga e rígida que a versão 2, mas é extremamente aceita por sistemas governamentais e tribunais.
* **`-dPDFACompatibilityPolicy=1`**: A "Persistência". Diz ao Ghostscript: "Se você encontrar algo no arquivo original que não é compatível, não desista! Tente converter mesmo assim e me avise, mas gere o arquivo final".

#### Bloco 3: O Segredo das Cores (A Correção do Erro)

* **`-dOverrideICC=true`**: A "Autoridade". Ignora quaisquer perfis de cor bagunçados que existam no arquivo original. Nós vamos ditar as regras novas.
* **`-sColorConversionStrategy=UseDeviceIndependentColor`**: **O Pulo do Gato.** Em vez de converter para um RGB simples, converte para uma cor matemática "independente". Isso elimina a ambiguidade que causava o erro de validação.
* **`-sProcessColorModel=DeviceRGB`**: Define que, no fundo, o processo matemático será feito usando lógica de mistura de luz (Vermelho, Verde, Azul).
* **`-sOutputICCProfile="C:\gs_arquivos\sRGB2014.icc"`**: O "Alvo Final". É aqui que definimos para onde aquelas cores independentes devem ir. Estamos usando o perfil oficial de 2014.

#### Bloco 4: Arquivos (Entrada e Saída)

* **`-sOutputFile=resultado_final.pdf`**: O nome do arquivo que será criado.
* **`"C:\gs_arquivos\PDFA_def.ps"`**: O "Documento de Identidade". O arquivo de texto que injeta os metadados (XML) dizendo "Eu sou um PDF/A".
* **`entrada.pdf`**: O arquivo original que você quer converter.

---

## 4. Como saber se funcionou? (Validação)

Depois de rodar o comando, você terá o arquivo `resultado_pdfa.pdf`. Mas como saber se ele é realmente um PDF/A válido?

1. **Adobe Acrobat Reader (Gratuito):**
* Abra o arquivo.
* Se for um PDF/A válido, aparecerá uma **faixa azul** no topo dizendo: *"Este arquivo está em conformidade com o padrão PDF/A e foi aberto como somente leitura para evitar modificações."*


2. **Validadores Online:**
* Existem sites como *AvePDF* ou *PDF Tools* onde você sobe o arquivo e ele confirma: "Valid PDF/A-2b".



---

## 5. Resumo Geral das 3 Partes

Parabéns! Você agora tem uma documentação completa. Vamos recapitular o fluxo de trabalho que você construiu:

1. **Instalação:** Você instalou o GS e criou a pasta `C:\gs_arquivos`.
2. **Preparação:** Você baixou o `srgb.icc` e criou o `PDFA_def.ps` e colocou ambos nessa pasta (isso só precisa ser feito uma vez na vida).
3. **Ação:** Sempre que precisar converter um PDF, você abre o terminal e roda a "Receita Final".