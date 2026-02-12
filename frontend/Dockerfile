# ==========================================
# ESTÁGIO 1: Build (Node.js)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de Build (Para injetar a URL da API se quiser mudar via EasyPanel)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copia arquivos de dependência
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o código fonte
COPY . .

# Gera o build de produção (cria a pasta /dist)
RUN npm run build

# ==========================================
# ESTÁGIO 2: Servidor Web (Nginx)
# ==========================================
FROM nginx:alpine

# Remove a config padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos gerados no estágio anterior para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta 80
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]