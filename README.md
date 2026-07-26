# Sistema de Etiquetas de Refeição Hospital Municipal Dr. Ernesto Che Guevara (HMDECG)

> **Projeto:** `CheGuevara_etiquetas`
> **Autor:** Juliana Miiller

## 📋 Visão geral
Este repositório contém a aplicação web utilizada pelo Hospital Municipal **Dr. Ernesto Che Guevara** (Maricá) para gerar etiquetas de refeição dos pacientes. A solução é composta por:

- **Backend** (Node.js + Express) – responsável por servir a API e gerar PDFs das etiquetas.
- **Frontend** (HTML + CSS + JavaScript) – interface simples para selecionar pacientes, visualizar e imprimir as etiquetas.
- **Recursos estáticos** (logotipos, estilos, imagens) que dão a identidade visual ao sistema.

A aplicação foi pensada para ser rápida, leve e fácil de implantar em ambientes Windows ou Linux.

## 🚀 Como executar (modo desenvolvimento)
### Pré‑requisitos
- **Node.js** (versão ≥ 18) e **npm** instalados.
- **Git** para clonar o repositório.

### Passos
```bash
# 1️⃣ Clone o repositório
git clone https://github.com/julianamiiller/CheGuevara_etiquetas.git
cd CheGuevara_etiquetas

# 2️⃣ Instale as dependências do backend
npm install   # na raiz (backend) – o package.json já está configurado

# 3️⃣ Inicie o servidor
npm start     # ou: node backend/server.js
```
Com o servidor rodando (por padrão na porta **3000**), abra o navegador e acesse:
```
http://localhost:3000
```
A interface `frontend/index.html` será carregada e você poderá gerar as etiquetas.

## 📦 Estrutura de pastas
```
CheGuevara_etiquetas/
├─ backend/                # Código do servidor Express
│   ├─ server.js           # Entrypoint
│   ├─ package.json        # Dependências do backend
│   └─ data/patients.json # Exemplo de base de pacientes
├─ frontend/               # Interface web estática
│   ├─ index.html
│   ├─ style.css
│   ├─ app.js
│   └─ *.png              # Logos e imagens
├─ .gitignore              # Ignora node_modules, logs, etc.
└─ README.md               # **Este documento**
```

## 🧹 Limpeza e boas práticas
- **Dependências:** nunca versionamos a pasta `node_modules`. O arquivo `.gitignore` já garante que ela seja ignorada.
- **Logs e arquivos temporários:** são ignorados (`*.log`, `*.tmp`).
- **Variáveis de ambiente:** caso precise de configurações sensíveis crie um arquivo `.env` (não versionado) e adicione a chave ao `.gitignore`.

## 🤝 Contribuindo
1. Fork este repositório.
2. Crie uma branch para sua feature: `git checkout -b minha-feature`.
3. Commit suas mudanças e abra um Pull Request.
4. Certifique‑se de que o **linters** (`npm run lint` – opcional) e os testes (se houver) passem antes de submeter.

## 📄 Licença
Este projeto está licenciado sob a **MIT License** – veja o arquivo `LICENSE` para mais detalhes.

---
*Feito com ❤️ para facilitar o cotidiano do Hospital Municipal Dr. Ernesto Che Guevara (HMDECG). Projeto pessoal.*
*Desenvolvido por: Juliana Miiller*
