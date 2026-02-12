# ==========================================
# ESTÁGIO 1: Build (Compilação TypeScript)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies para rodar o tsc)
RUN npm install

# Copia todo o código fonte
COPY . .

# Executa a compilação do TypeScript diretamente (ignorando o script 'build' do package.json que usa xcopy)
RUN npx tsc

# ==========================================
# ESTÁGIO 2: Produção (Runner Leve)
# ==========================================
FROM node:20-alpine

WORKDIR /app

# --- CRÍTICO: Instalação do Ghostscript (Necessário para PdfA-converterService) ---
RUN apk add --no-cache ghostscript

# Define variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Copia o package.json para instalar apenas dependências de produção
COPY package*.json ./

# Instala apenas dependências necessárias para rodar (remove typescript, etc)
RUN npm install --only=production

# Copia o código compilado do estágio de build
COPY --from=builder /app/dist ./dist

# --- CORREÇÃO DE ASSETS ---
# Como o script 'build' do Windows não rodou, copiamos os assets manualmente
# O código espera encontrar assets em relative path: ../../assets
# Se o JS está em /app/dist/core/services/, ele buscará em /app/dist/assets/
COPY src/assets ./dist/assets

# Copia a pasta docs (Swagger) se necessário
COPY src/docs ./dist/docs

# Cria a pasta temporária que o código exige (PdfA-converterService)
RUN mkdir -p dist/temp && chmod 777 dist/temp

# Expõe a porta da aplicação
EXPOSE 3000

# Comando de inicialização
CMD ["node", "dist/app.js"]