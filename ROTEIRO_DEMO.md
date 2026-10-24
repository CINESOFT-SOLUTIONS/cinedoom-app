# Roteiro de Demonstração CineDoom - 5 minutos

**Data:** 12 de novembro de 2026  
**Apresentadores:** Equipe CineSoft Solutions  
**Público:** Banca Avaliadora

## Pré-requisitos
- Ambiente com seed executado: `pnpm prisma db seed`
- Servidor rodando: `pnpm dev`
- Usuários: `gerente@cinedoom.com` / `atendente@cinedoom.com` (senha: `Cinema123!`)

## Cronograma

### 1. Apresentação Geral (0:00 - 1:00)
- **Objetivo:** Apresentar o CineDoom como SaaS multi-tenant para gestão de cinemas
- **Ação:** Mostrar página inicial com módulos (Portal, Bilheteria, Painel Gerencial)
- **Destaque:** Arquitetura ACID, isolamento multi-tenant, conformidade LGPD

### 2. Painel de Ocupação - Gerente (1:00 - 2:00)
- **Login:** Acessar como `gerente@cinedoom.com`
- **Rota:** `/gerente/ocupacao`
- **Demonstração:**
  - Visualizar sessões do dia com cards
  - Mostrar sessão pré-lotada com ~90% de ocupação
  - Destacar barra de progresso e totais
- **Destaque:** Agregação em tempo real, isolamento por tenant

### 3. Bilheteria - Venda Presencial (2:00 - 3:30)
- **Login:** Acessar como `atendente@cinedoom.com`
- **Rota:** `/bilheteria` ou via API
- **Demonstração:**
  - Selecionar sessão com poucos assentos disponíveis
  - Realizar venda do último assento
  - Mostrar venda atômica com trava SELECT FOR UPDATE
- **Destaque:** Consistência ACID, prevenção de double-booking

### 4. Baixa Presencial de Reserva (3:30 - 4:15)
- **Rota:** `/bilheteria/baixa-reserva`
- **Demonstração:**
  - Buscar reserva por código
  - Confirmar pagamento presencial
  - Gerar ingressos automaticamente
  - Atualizar status PENDING → CONFIRMED e assentos para SOLD
- **Destaque:** Fluxo completo de reserva → pagamento → ingresso

### 5. Encerramento (4:15 - 5:00)
- **Destaque:** Multi-tenancy, RBAC, criptografia LGPD, testes automatizados
- **Perguntas e respostas**

## Dicas para Apresentação
- Ter o painel de ocupação aberto em tela secundária
- Mostrar logs do ConsoleLogger das notificações
- Destacar os 694 testes passando
- Mencionar conformidade ISO/IEC/IEEE 12207:2021
