// Dados de demonstração usados por prisma/seed.ts.
// Os ids aqui ("dep_ti", "usr_admin"…) são chaves internas do seed; no banco viram UUIDs.
import { DEMO_PASSWORD } from "../src/lib/demo-accounts";
import type {
  Checklist,
  DbState,
  Department,
  Procedure,
  Ticket,
  TicketChecklist,
  TicketComment,
  User,
} from "../src/lib/types";

function ago(days: number, hours = 0) {
  return new Date(Date.now() - (days * 24 + hours) * 3600_000).toISOString();
}

export type SeedUser = User & { password: string };

export function createSeed(): Omit<DbState, "users"> & { users: SeedUser[] } {
  const departments: Department[] = [
    { id: "dep_ti", name: "Tecnologia da Informação", acronym: "TI", managerName: "Coordenação de TI", extension: "2000", location: "Prédio Sede — Sala 12", active: true, createdAt: ago(400) },
    { id: "dep_rh", name: "Recursos Humanos", acronym: "RH", managerName: "Mariana Lopes", extension: "2101", location: "Prédio Sede — Sala 03", active: true, createdAt: ago(400) },
    { id: "dep_fin", name: "Secretaria de Finanças", acronym: "FIN", managerName: "Roberto Andrade", extension: "2201", location: "Prédio Sede — 1º andar", active: true, createdAt: ago(400) },
    { id: "dep_lic", name: "Licitações e Contratos", acronym: "LIC", managerName: "Paula Ferreira", extension: "2301", location: "Anexo I", active: true, createdAt: ago(380) },
    { id: "dep_sau", name: "Secretaria de Saúde", acronym: "SAU", managerName: "Dra. Helena Costa", extension: "3001", location: "Centro de Saúde", active: true, createdAt: ago(380) },
    { id: "dep_obr", name: "Secretaria de Obras", acronym: "OBR", managerName: "Eng. Marcos Vieira", extension: "4001", location: "Pátio Municipal", active: true, createdAt: ago(360) },
    { id: "dep_gab", name: "Gabinete do Prefeito", acronym: "GAB", managerName: "Chefe de Gabinete", extension: "1001", location: "Prédio Sede — 2º andar", active: true, createdAt: ago(360) },
  ];

  const users: SeedUser[] = [
    { id: "usr_admin", name: "Fernanda Ribeiro", email: "admin@chamati.local", password: DEMO_PASSWORD, role: "ADMIN", departmentId: "dep_ti", phone: "2000", active: true, createdAt: ago(400) },
    { id: "usr_carlos", name: "Carlos Mendes", email: "carlos.tecnico@chamati.local", password: DEMO_PASSWORD, role: "TECNICO", departmentId: "dep_ti", phone: "2002", active: true, createdAt: ago(300) },
    { id: "usr_juliana", name: "Juliana Prado", email: "juliana.tecnico@chamati.local", password: DEMO_PASSWORD, role: "TECNICO", departmentId: "dep_ti", phone: "2003", active: true, createdAt: ago(250) },
    { id: "usr_diego", name: "Diego Santos", email: "diego.tecnico@chamati.local", password: DEMO_PASSWORD, role: "TECNICO", departmentId: "dep_ti", phone: "2004", active: true, createdAt: ago(120) },
    { id: "usr_ana", name: "Ana Souza", email: "ana.rh@chamati.local", password: DEMO_PASSWORD, role: "SOLICITANTE", departmentId: "dep_rh", phone: "2105", active: true, createdAt: ago(200) },
    { id: "usr_paulo", name: "Paulo Lima", email: "paulo.fin@chamati.local", password: DEMO_PASSWORD, role: "SOLICITANTE", departmentId: "dep_fin", phone: "2210", active: true, createdAt: ago(190) },
    { id: "usr_renata", name: "Renata Alves", email: "renata.lic@chamati.local", password: DEMO_PASSWORD, role: "SOLICITANTE", departmentId: "dep_lic", phone: "2304", active: true, createdAt: ago(150) },
    { id: "usr_bruno", name: "Bruno Carvalho", email: "bruno.saude@chamati.local", password: DEMO_PASSWORD, role: "SOLICITANTE", departmentId: "dep_sau", phone: "3012", active: true, createdAt: ago(140) },
    { id: "usr_luiza", name: "Luiza Martins", email: "luiza.obras@chamati.local", password: DEMO_PASSWORD, role: "SOLICITANTE", departmentId: "dep_obr", phone: "4007", active: true, createdAt: ago(90) },
    { id: "usr_rafael", name: "Rafael Nunes", email: "rafael.gab@chamati.local", password: DEMO_PASSWORD, role: "SOLICITANTE", departmentId: "dep_gab", phone: "1003", active: false, createdAt: ago(60) },
  ];

  const t = (
    n: number,
    data: Omit<Ticket, "id" | "number" | "updatedAt" | "createdAt"> & { createdAt: string; updatedAt?: string },
  ): Ticket => ({
    id: `tkt_${n}`,
    number: n,
    ...data,
    updatedAt: data.updatedAt ?? data.createdAt,
  });

  const tickets: Ticket[] = [
    t(1001, { title: "Formatar notebook do setor de folha de pagamento", description: "Notebook Dell Latitude (patrimônio 00871) muito lento e com vírus. Fazer backup da pasta Documentos antes de formatar.", departmentId: "dep_rh", requesterId: "usr_ana", assigneeId: "usr_carlos", priority: "ALTA", category: "FORMATACAO", status: "EM_ANDAMENTO", assetTag: "00871", createdAt: ago(3, 4), updatedAt: ago(0, 5) }),
    t(1002, { title: "Impressora da recepção não imprime frente e verso", description: "HP LaserJet M428 está imprimindo apenas um lado. Já reiniciamos.", departmentId: "dep_fin", requesterId: "usr_paulo", assigneeId: "usr_juliana", priority: "MEDIA", category: "IMPRESSORA", status: "A_FAZER", createdAt: ago(1, 2) }),
    t(1003, { title: "Sem acesso à internet na sala da comissão", description: "Todos os computadores da sala 2 do Anexo I estão sem rede desde hoje cedo.", departmentId: "dep_lic", requesterId: "usr_renata", assigneeId: "usr_diego", priority: "CRITICA", category: "REDE", status: "EM_ANDAMENTO", createdAt: ago(0, 6), updatedAt: ago(0, 1) }),
    t(1004, { title: "Instalar sistema de prontuário eletrônico em 3 máquinas", description: "Novas estações da recepção do Centro de Saúde precisam do cliente do e-SUS.", departmentId: "dep_sau", requesterId: "usr_bruno", assigneeId: "usr_carlos", priority: "ALTA", category: "SOFTWARE", status: "AGUARDANDO", waitingReason: "Aguardando liberação de licença pela Secretaria", createdAt: ago(5), updatedAt: ago(2) }),
    t(1005, { title: "Troca de fonte do desktop da engenharia", description: "Computador desliga sozinho. Fonte já diagnosticada como defeituosa.", departmentId: "dep_obr", requesterId: "usr_luiza", assigneeId: "usr_diego", priority: "MEDIA", category: "HARDWARE", status: "AGUARDANDO", waitingReason: "Aguardando chegada da peça (fonte 500W)", assetTag: "01422", createdAt: ago(8), updatedAt: ago(4) }),
    t(1006, { title: "Configurar e-mail institucional no celular do chefe de gabinete", description: "Configurar Outlook no Android e sincronizar agenda.", departmentId: "dep_gab", requesterId: "usr_rafael", assigneeId: "usr_juliana", priority: "BAIXA", category: "SOFTWARE", status: "CONCLUIDO", createdAt: ago(10), updatedAt: ago(9), closedAt: ago(9) }),
    t(1007, { title: "Ponto de rede novo para a sala de reuniões", description: "Passar cabo e crimpar ponto de rede para a TV da sala de reuniões.", departmentId: "dep_rh", requesterId: "usr_ana", priority: "BAIXA", category: "REDE", status: "A_FAZER", createdAt: ago(2, 3) }),
    t(1008, { title: "Formatação + Windows 11 em 2 máquinas do almoxarifado", description: "Máquinas recebidas da Saúde. Aplicar checklist pós-formatação padrão.", departmentId: "dep_obr", requesterId: "usr_luiza", assigneeId: "usr_carlos", priority: "MEDIA", category: "FORMATACAO", status: "A_FAZER", createdAt: ago(1, 8) }),
    t(1009, { title: "Scanner não aparece na rede", description: "Scanner Brother da Tesouraria não é encontrado pelo software de digitalização.", departmentId: "dep_fin", requesterId: "usr_paulo", assigneeId: "usr_juliana", priority: "MEDIA", category: "IMPRESSORA", status: "CONCLUIDO", createdAt: ago(14), updatedAt: ago(12), closedAt: ago(12) }),
    t(1010, { title: "Erro ao emitir empenho no sistema contábil", description: "Mensagem 'certificado digital não encontrado' ao assinar empenho.", departmentId: "dep_fin", requesterId: "usr_paulo", assigneeId: "usr_carlos", priority: "CRITICA", category: "SOFTWARE", status: "A_FAZER", createdAt: ago(0, 3) }),
    t(1011, { title: "Monitor piscando no balcão de atendimento", description: "Monitor LG 22\" pisca intermitentemente. Testar cabo e trocar se necessário.", departmentId: "dep_sau", requesterId: "usr_bruno", priority: "BAIXA", category: "HARDWARE", status: "A_FAZER", createdAt: ago(4, 6) }),
    t(1012, { title: "Wi-Fi instável no Centro de Saúde", description: "Quedas frequentes no access point do corredor B.", departmentId: "dep_sau", requesterId: "usr_bruno", assigneeId: "usr_diego", priority: "ALTA", category: "REDE", status: "CONCLUIDO", createdAt: ago(20), updatedAt: ago(17), closedAt: ago(17) }),
    t(1013, { title: "Instalar impressora de rede para a Licitação", description: "Nova Ricoh MP 301 entregue. Configurar IP fixo e instalar nos 6 computadores.", departmentId: "dep_lic", requesterId: "usr_renata", assigneeId: "usr_juliana", priority: "MEDIA", category: "IMPRESSORA", status: "EM_ANDAMENTO", createdAt: ago(2, 1), updatedAt: ago(0, 20) }),
    t(1014, { title: "Atualizar antivírus nas máquinas do Gabinete", description: "Console aponta 4 máquinas com definições desatualizadas.", departmentId: "dep_gab", requesterId: "usr_admin", assigneeId: "usr_diego", priority: "MEDIA", category: "SOFTWARE", status: "CONCLUIDO", createdAt: ago(6), updatedAt: ago(5), closedAt: ago(5) }),
    t(1015, { title: "Teclado e mouse novos para estagiário", description: "Novo estagiário inicia segunda-feira.", departmentId: "dep_rh", requesterId: "usr_ana", assigneeId: "usr_carlos", priority: "BAIXA", category: "HARDWARE", status: "CONCLUIDO", createdAt: ago(25), updatedAt: ago(24), closedAt: ago(24) }),
    t(1016, { title: "Backup do servidor de arquivos falhou", description: "Rotina noturna retornou erro de espaço em disco no NAS.", departmentId: "dep_ti", requesterId: "usr_admin", assigneeId: "usr_admin", priority: "ALTA", category: "HARDWARE", status: "EM_ANDAMENTO", createdAt: ago(1, 1), updatedAt: ago(0, 2) }),
  ];

  const checklists: Checklist[] = [
    {
      id: "chk_posformat",
      title: "Checklist Pós-Formatação Windows",
      description: "Procedimento padrão após formatar qualquer estação de trabalho da Prefeitura.",
      category: "FORMATACAO",
      createdById: "usr_admin",
      createdAt: ago(200),
      updatedAt: ago(15),
      items: [
        { id: "ci_1", label: "Instalar drivers (chipset, rede, vídeo, áudio)", hint: "Usar pendrive de drivers da TI ou site do fabricante" },
        { id: "ci_2", label: "Ativar Windows com a licença do patrimônio" },
        { id: "ci_3", label: "Executar Windows Update até não haver pendências" },
        { id: "ci_4", label: "Ingressar no domínio PREFEITURA.LOCAL", hint: "Renomear para padrão SIGLA-PATRIMONIO antes" },
        { id: "ci_5", label: "Instalar antivírus corporativo e verificar console" },
        { id: "ci_6", label: "Instalar pacote padrão: navegador, leitor PDF, 7-Zip, LibreOffice" },
        { id: "ci_7", label: "Instalar certificado digital / token, se o usuário usar" },
        { id: "ci_8", label: "Mapear unidades de rede e impressoras do setor" },
        { id: "ci_9", label: "Restaurar backup dos documentos do usuário" },
        { id: "ci_10", label: "Atualizar etiqueta e inventário do patrimônio" },
      ],
    },
    {
      id: "chk_printer",
      title: "Configuração de Impressora de Rede",
      description: "Instalação de impressora nova ou realocada na rede municipal.",
      category: "IMPRESSORA",
      createdById: "usr_juliana",
      createdAt: ago(160),
      updatedAt: ago(30),
      items: [
        { id: "cp_1", label: "Reservar IP fixo no DHCP", hint: "Faixa de impressoras: 10.0.20.200–250" },
        { id: "cp_2", label: "Configurar IP e máscara no painel da impressora" },
        { id: "cp_3", label: "Atualizar firmware" },
        { id: "cp_4", label: "Criar fila no servidor de impressão" },
        { id: "cp_5", label: "Instalar nas estações do setor via GPO" },
        { id: "cp_6", label: "Imprimir página de teste em cada estação" },
      ],
    },
    {
      id: "chk_user",
      title: "Onboarding de Novo Servidor",
      description: "Acesso e equipamentos para servidor recém-nomeado ou estagiário.",
      category: "SOFTWARE",
      createdById: "usr_admin",
      createdAt: ago(120),
      updatedAt: ago(40),
      items: [
        { id: "cu_1", label: "Criar usuário no Active Directory" },
        { id: "cu_2", label: "Criar e-mail institucional" },
        { id: "cu_3", label: "Liberar acesso aos sistemas do setor" },
        { id: "cu_4", label: "Entregar equipamento e registrar termo de responsabilidade" },
      ],
    },
    {
      id: "chk_network",
      title: "Diagnóstico de Rede (Sem Acesso)",
      description: "Roteiro rápido de triagem para chamados de falta de conexão.",
      category: "REDE",
      createdById: "usr_diego",
      createdAt: ago(90),
      updatedAt: ago(10),
      items: [
        { id: "cn_1", label: "Verificar cabo e LED da placa de rede" },
        { id: "cn_2", label: "ipconfig /all — conferir IP, gateway e DNS" },
        { id: "cn_3", label: "Ping no gateway e em 8.8.8.8" },
        { id: "cn_4", label: "Checar porta no switch do rack" },
        { id: "cn_5", label: "Verificar se o problema afeta o setor inteiro" },
      ],
    },
  ];

  const tc = (src: Checklist, ticketId: string, id: string, doneCount: number): TicketChecklist => ({
    id,
    ticketId,
    checklistId: src.id,
    title: src.title,
    attachedById: "usr_carlos",
    createdAt: ago(1),
    items: src.items.map((it, i) => ({
      id: `${id}_${i}`,
      label: it.label,
      hint: it.hint,
      done: i < doneCount,
      doneById: i < doneCount ? "usr_carlos" : undefined,
      doneAt: i < doneCount ? ago(0, 10 - i) : undefined,
    })),
  });

  const ticketChecklists: TicketChecklist[] = [
    tc(checklists[0], "tkt_1001", "tch_1", 6),
    tc(checklists[3], "tkt_1003", "tch_2", 3),
    tc(checklists[1], "tkt_1013", "tch_3", 2),
  ];

  const comments: TicketComment[] = [
    { id: "cm_1", ticketId: "tkt_1001", authorId: "usr_ana", kind: "SYSTEM", body: "Demanda aberta.", isInternal: false, createdAt: ago(3, 4) },
    { id: "cm_2", ticketId: "tkt_1001", authorId: "usr_carlos", kind: "ASSIGNMENT", body: "Carlos Mendes assumiu a demanda.", isInternal: false, createdAt: ago(3, 2) },
    { id: "cm_3", ticketId: "tkt_1001", authorId: "usr_carlos", kind: "COMMENT", body: "Backup da pasta Documentos feito no servidor (\\\\NAS\\backup\\RH\\00871). Iniciando formatação.", isInternal: false, createdAt: ago(1, 3) },
    { id: "cm_4", ticketId: "tkt_1001", authorId: "usr_carlos", kind: "STATUS_CHANGE", body: "Status alterado para Em Andamento.", isInternal: false, createdAt: ago(1, 3) },
    { id: "cm_5", ticketId: "tkt_1003", authorId: "usr_diego", kind: "COMMENT", body: "Switch do rack do Anexo I sem energia. Verificando o nobreak.", isInternal: true, createdAt: ago(0, 2) },
    { id: "cm_6", ticketId: "tkt_1004", authorId: "usr_carlos", kind: "STATUS_CHANGE", body: "Status alterado para Aguardando Peça/Usuário: aguardando liberação de licença.", isInternal: false, createdAt: ago(2) },
    { id: "cm_7", ticketId: "tkt_1005", authorId: "usr_diego", kind: "COMMENT", body: "Peça solicitada ao almoxarifado. Previsão: 5 dias úteis.", isInternal: false, createdAt: ago(4) },
  ];

  const procedures: Procedure[] = [
    {
      id: "prc_1",
      title: "Padrão de nomenclatura de computadores",
      content: `# Padrão de nomenclatura\n\nTodo computador ingressado no domínio deve seguir o formato:\n\n\`SIGLA-PATRIMONIO\`\n\n## Exemplos\n\n- \`RH-00871\` — notebook do RH\n- \`FIN-01200\` — desktop da Tesouraria\n- \`SAU-00344\` — recepção do Centro de Saúde\n\n## Observações\n\n- Use sempre **5 dígitos** no patrimônio (complete com zeros).\n- Máquinas sem patrimônio: solicitar etiqueta ao Patrimônio antes de ingressar no domínio.`,
      tags: ["domínio", "padrão"],
      pinned: true,
      authorId: "usr_admin",
      updatedById: "usr_admin",
      createdAt: ago(180),
      updatedAt: ago(20),
    },
    {
      id: "prc_2",
      title: "Faixas de IP da rede municipal",
      content: `# Faixas de IP\n\n- \`10.0.10.0/24\` — Prédio Sede\n- \`10.0.11.0/24\` — Anexo I (Licitação)\n- \`10.0.20.200–250\` — Impressoras (IP fixo)\n- \`10.0.30.0/24\` — Centro de Saúde\n- \`10.0.99.0/24\` — Servidores e gerência\n\n> Gateway padrão é sempre o **.1** de cada faixa.`,
      tags: ["rede", "infraestrutura"],
      pinned: true,
      authorId: "usr_diego",
      updatedById: "usr_diego",
      createdAt: ago(150),
      updatedAt: ago(8),
    },
    {
      id: "prc_3",
      title: "Instalação do certificado digital A3 (token)",
      content: `# Certificado digital A3\n\n1. Instalar o driver do token (SafeNet Authentication Client).\n2. Conectar o token e abrir o **SafeNet** para conferir se o certificado aparece.\n3. Instalar a cadeia de certificados da AC.\n4. Testar a assinatura no sistema contábil.\n\n## Problemas comuns\n\n- *Certificado não encontrado*: reinstalar o driver e reiniciar o serviço \`SCardSvr\`.\n- Token bloqueado: somente o titular pode desbloquear com o PUK.`,
      tags: ["software", "certificado"],
      pinned: false,
      authorId: "usr_carlos",
      updatedById: "usr_carlos",
      createdAt: ago(100),
      updatedAt: ago(30),
    },
    {
      id: "prc_4",
      title: "Notas rápidas — plantão",
      content: `# Bloco de notas do plantão\n\n- Senha do Wi-Fi de visitantes troca toda segunda.\n- Nobreak do Anexo I com bateria fraca — trocar até o fim do mês.\n- Ligar para a operadora (protocolo do link): ramal 2000.`,
      tags: ["notas"],
      pinned: false,
      authorId: "usr_juliana",
      updatedById: "usr_juliana",
      createdAt: ago(12),
      updatedAt: ago(1),
    },
  ];

  return {
    departments,
    users,
    tickets,
    comments,
    checklists,
    ticketChecklists,
    procedures,
    notifications: [
      { id: "ntf_1", userId: "usr_carlos", ticketId: "tkt_1010", message: "Nova demanda crítica atribuída a você: #1010", read: false, createdAt: ago(0, 3) },
      { id: "ntf_2", userId: "usr_carlos", ticketId: "tkt_1008", message: "Você foi definido como responsável pela #1008", read: false, createdAt: ago(1, 8) },
      { id: "ntf_3", userId: "usr_admin", ticketId: "tkt_1003", message: "Demanda crítica aberta pela Licitação: #1003", read: false, createdAt: ago(0, 6) },
      { id: "ntf_4", userId: "usr_ana", ticketId: "tkt_1001", message: "Sua demanda #1001 está Em Andamento", read: false, createdAt: ago(1, 3) },
    ],
  };
}
