export type JourneyContentType =
  | 'biblical_text'
  | 'devotional_reflection'
  | 'authorial_prayer'
  | 'grounding_instruction'
  | 'safety_message';

export interface AnxietyJourneySession {
  id: string;
  day: number;
  title: string;
  category: string;
  durationEstimateSeconds: number;
  biblicalReferences: string[];
  /** IDs do dataset / marcadores {{BIBLE:ID}} */
  bibleMarkerIds: string[];
  /** Roteiro com marcadores — reflexão/oração autoral + Bíblia literal */
  devotionalScript: string;
  summary: string;
  coverColor: string;
  ambientVolume: number;
}

/**
 * Jornada de sete dias.
 * Tudo fora de {{BIBLE:...}} é reflexão/oração autoral.
 * Marcadores são resolvidos somente via biblicalPrayerTexts.json.
 */
export const anxietyJourney: AnxietyJourneySession[] = [
  {
    id: 'ansiedade-01',
    day: 1,
    title: 'Quando a ansiedade está forte',
    category: 'Ansiedade / SOS',
    durationEstimateSeconds: 147,
    biblicalReferences: ['Salmo 56:3-4', '1 Pedro 5:7'],
    bibleMarkerIds: ['PSALM_56_3_4', '1_PETER_5_7'],
    summary:
      'Um momento para reconhecer o medo, respirar e entregar uma preocupação a Deus.',
    coverColor: '#1B2E3A',
    ambientVolume: 0.12,
    devotionalScript: `Você não precisa resolver tudo nos próximos minutos.

Se puder, encontre uma posição confortável. Apoie os pés no chão e perceba que você está aqui, neste momento.

Respire de uma forma tranquila, sem forçar. Inspire devagar. Faça uma pequena pausa. Depois, solte o ar com calma.

Mais uma vez.

Talvez existam muitos pensamentos disputando sua atenção. Você não precisa lutar contra todos eles agora. Apenas reconheça: este é um momento difícil, mas você não precisa atravessá-lo sozinho.

Agora, ouça o que está escrito no Salmo cinquenta e seis, versículos três e quatro.

{{BIBLE:PSALM_56_3_4}}

A Bíblia não exige que você finja não sentir medo. O salmista reconhece o medo e, no meio dele, decide voltar sua confiança para Deus.

Ouça também a primeira carta de Pedro, capítulo cinco, versículo sete.

{{BIBLE:1_PETER_5_7}}

Escolha apenas uma preocupação. Não todas. Somente uma.

Diga a Deus, com suas próprias palavras, o que está pesando mais neste momento.

Vamos orar.

Deus, eu reconheço que estou preocupado. Existem coisas que não consigo controlar e pensamentos que não consigo organizar. Recebe aquilo que estou entregando agora. Dá-me clareza para o próximo passo e companhia para atravessar este momento. Amém.

Fique aqui por mais alguns segundos.

Você não precisa ter todas as respostas. Por enquanto, dê apenas o próximo passo possível.

Se a angústia continuar muito intensa, procure alguém de confiança ou ajuda profissional. Se estiver em risco ou pensando em se machucar, ligue para o CVV, no número cento e oitenta e oito, ou para o SAMU, no número cento e noventa e dois.`,
  },
  {
    id: 'ansiedade-02',
    day: 2,
    title: 'Entregue uma preocupação de cada vez',
    category: 'Ansiedade / Confiança',
    durationEstimateSeconds: 144,
    biblicalReferences: ['Filipenses 4:6-7'],
    bibleMarkerIds: ['PHILIPPIANS_4_6_7'],
    summary:
      'Apresente a Deus o que ocupa a mente e escolha um próximo passo possível.',
    coverColor: '#1A3340',
    ambientVolume: 0.12,
    devotionalScript: `Talvez sua mente esteja tentando resolver muitas coisas ao mesmo tempo.

Por alguns minutos, você pode fazer uma pausa.

Perceba seus ombros. Se estiverem tensos, permita que relaxem um pouco. Solte as mãos. Respire sem pressa.

Agora ouça Filipenses, capítulo quatro, versículos seis e sete.

{{BIBLE:PHILIPPIANS_4_6_7}}

Essa passagem não é uma condenação para quem sente ansiedade. Ela apresenta um caminho: levar a Deus, em oração, aquilo que ocupa a mente e pesa no coração.

Você não precisa encontrar palavras bonitas.

Pode começar assim: Deus, isto é o que está me preocupando.

Diga, em silêncio ou em voz baixa, qual é a preocupação.

Agora perceba o que depende de você hoje. Talvez seja uma conversa, um pedido de ajuda, uma tarefa pequena ou simplesmente descansar.

Depois, reconheça o que não está sob seu controle. Você pode entregar essa parte a Deus, mesmo que seus sentimentos ainda não tenham mudado completamente.

Vamos orar.

Senhor, Tu conheces meus pensamentos e sabes por que estou preocupado. Ajuda-me a não carregar sozinho aquilo que posso apresentar a Ti. Dá-me sabedoria para agir no que está ao meu alcance e serenidade diante do que não posso controlar. Guarda minha mente e conduz meus próximos passos. Amém.

Respire mais uma vez.

A paz nem sempre chega como uma mudança repentina. Às vezes, ela começa quando percebemos que não precisamos enfrentar tudo de uma só vez.

Hoje, escolha uma preocupação, uma oração e um próximo passo.

Quando quiser, você poderá voltar a esta sessão.`,
  },
  {
    id: 'ansiedade-03',
    day: 3,
    title: 'Hoje basta por hoje',
    category: 'Ansiedade / Jesus',
    durationEstimateSeconds: 162,
    biblicalReferences: ['Mateus 6:31-34'],
    bibleMarkerIds: ['MATTHEW_6_31_34'],
    summary:
      'Volte a atenção para o dia presente e dê apenas o próximo passo.',
    coverColor: '#20353F',
    ambientVolume: 0.12,
    devotionalScript: `A preocupação frequentemente leva nossa mente para um futuro que ainda não chegou.

Ela cria perguntas, possibilidades e problemas que talvez nem aconteçam. Enquanto isso, o dia presente pode parecer distante.

Por alguns minutos, volte sua atenção para agora.

Perceba o lugar onde você está. Observe um som ao seu redor. Sinta o apoio do chão ou da cadeira. Respire de forma natural.

Agora ouça as palavras de Jesus registradas em Mateus, capítulo seis, versículos trinta e um a trinta e quatro.

{{BIBLE:MATTHEW_6_31_34}}

Jesus não ignora que existem necessidades reais. Ele fala com pessoas que também conheciam insegurança, trabalho e preocupação.

O convite é não tentar viver todos os dias futuros ao mesmo tempo.

Pergunte a si mesmo: o que este dia está pedindo de mim?

Não o mês inteiro. Não todas as possibilidades. Apenas este dia.

Talvez o próximo passo seja beber água, fazer uma refeição, responder uma mensagem, organizar uma tarefa ou conversar com alguém.

Vamos orar.

Jesus, minha mente está tentando antecipar muitas coisas. Ajuda-me a voltar ao dia que está diante de mim. Dá-me sabedoria para cuidar do que precisa ser feito e liberdade para não carregar problemas que ainda não chegaram. Sustenta-me no próximo passo. Amém.

Não é necessário resolver o futuro inteiro agora.

Quando a mente voltar para o amanhã, repita com gentileza: neste momento, cuidarei apenas do próximo passo.

Se houver uma preocupação concreta que você não consegue enfrentar sozinho, procure ajuda. Confiar em Deus também pode incluir permitir que outras pessoas caminhem com você.`,
  },
  {
    id: 'sobrecarga-01',
    day: 4,
    title: 'Descanso para quem está sobrecarregado',
    category: 'Confiança / Jesus',
    durationEstimateSeconds: 138,
    biblicalReferences: ['Mateus 11:28-30'],
    bibleMarkerIds: ['MATTHEW_11_28_30'],
    summary:
      'Reconheça seus limites e receba o convite de Jesus ao descanso.',
    coverColor: '#172536',
    ambientVolume: 0.12,
    devotionalScript: `Talvez você esteja cansado de precisar continuar forte.

Existem responsabilidades, expectativas e preocupações que podem se acumular até parecer que não há espaço para descansar.

Por estes minutos, você não precisa produzir nada.

Apenas permaneça aqui.

Respire com tranquilidade. Ao soltar o ar, permita que seu corpo diminua um pouco o ritmo.

Agora ouça o convite de Jesus em Mateus, capítulo onze, versículos vinte e oito a trinta.

{{BIBLE:MATTHEW_11_28_30}}

Jesus dirige esse convite a pessoas cansadas e sobrecarregadas.

Isso significa que você não precisa esconder seu cansaço para se aproximar dele. Você pode chegar como está, reconhecendo seus limites.

Pense no peso que mais tem consumido suas forças.

Talvez seja uma responsabilidade, uma decisão, uma perda ou a expectativa de outras pessoas.

Imagine-se colocando esse peso diante de Deus. Isso não significa abandonar suas responsabilidades. Significa reconhecer que você não foi feito para carregá-las sozinho.

Vamos orar.

Jesus, eu estou cansado e preciso de descanso. Tu conheces as responsabilidades que carrego e os limites que alcancei. Ensina-me a caminhar sem exigir de mim mais do que posso oferecer. Mostra-me o que devo continuar, o que posso adiar e onde preciso pedir ajuda. Recebe o meu cansaço. Amém.

Hoje, permita-se fazer uma coisa de cada vez.

Descansar não é fracassar. Pedir ajuda não é falta de fé.

Você pode retornar a este momento sempre que precisar se lembrar de que não precisa carregar tudo sozinho.`,
  },
  {
    id: 'medo-01',
    day: 5,
    title: 'Quando você precisa se sentir seguro',
    category: 'Proteção / Confiança',
    durationEstimateSeconds: 133,
    biblicalReferences: ['Isaías 41:10'],
    bibleMarkerIds: ['ISAIAH_41_10'],
    summary:
      'Observe o que é real agora e lembre-se da presença cuidadosa de Deus.',
    coverColor: '#1E2A36',
    ambientVolume: 0.12,
    devotionalScript: `Quando sentimos medo, a mente pode procurar perigos em todos os lugares.

Antes de continuar, observe seu ambiente.

Neste exato momento, você está fisicamente em segurança?

Se não estiver, procure um lugar seguro e peça ajuda imediatamente.

Se estiver em segurança, permita que seu corpo reconheça isso. Apoie os pés no chão. Observe três objetos ao seu redor. Perceba dois sons. Depois, respire lentamente.

Agora ouça Isaías, capítulo quarenta e um, versículo dez.

{{BIBLE:ISAIAH_41_10}}

Essa passagem chama a atenção para a presença de Deus.

Ela não afirma que nunca enfrentaremos dificuldades. Seu consolo está na certeza de que não precisamos atravessá-las abandonados.

Diga em silêncio o seu nome.

Depois diga: Deus conhece onde eu estou.

Você não precisa sentir coragem completa. Pode apenas escolher permanecer por mais um momento e pedir a força necessária para o próximo passo.

Vamos orar.

Deus, o medo está ocupando meus pensamentos. Ajuda-me a perceber o que é real neste momento e a não ser conduzido somente pelas possibilidades que minha mente está criando. Dá-me coragem para pedir ajuda, sabedoria para tomar decisões e confiança para caminhar um passo de cada vez. Permanece comigo. Amém.

Olhe novamente ao seu redor.

Escolha uma ação pequena e concreta. Beber água. Abrir uma janela. Sentar-se perto de alguém. Enviar uma mensagem.

Fé e cuidado prático podem caminhar juntos.

Você não precisa provar sua força. Apenas dê o próximo passo possível.`,
  },
  {
    id: 'noite-ansiedade-01',
    day: 6,
    title: 'Entrega da noite',
    category: 'Proteção / Noite',
    durationEstimateSeconds: 147,
    biblicalReferences: ['Salmo 4:8', 'Salmo 23:1-4'],
    bibleMarkerIds: ['PSALM_4_8', 'PSALM_23_1_4'],
    summary:
      'Entregue o dia e prepare o corpo e a mente para o descanso.',
    coverColor: '#141F2C',
    ambientVolume: 0.1,
    devotionalScript: `O dia está terminando, mas talvez sua mente ainda esteja trabalhando.

Pensamentos sobre o que aconteceu, sobre o que ficou incompleto ou sobre o que poderá acontecer amanhã podem dificultar o descanso.

Agora você não precisa encontrar todas as soluções.

Acomode o corpo da maneira mais confortável possível. Diminua a luz, se puder. Relaxe a testa, a mandíbula e os ombros.

Ouça o Salmo quatro, versículo oito.

{{BIBLE:PSALM_4_8}}

Agora ouça o Salmo vinte e três, versículos um a quatro.

{{BIBLE:PSALM_23_1_4}}

A imagem do pastor fala de cuidado, direção e companhia.

Mesmo nos caminhos difíceis, o salmista não descreve uma caminhada solitária.

Pense em uma coisa boa que aconteceu hoje, mesmo que tenha sido pequena.

Agora reconheça uma coisa que não foi concluída.

Diga a si mesmo: isso pode esperar até amanhã.

Vamos orar.

Deus, obrigado por ter me sustentado durante este dia. Entrego a Ti aquilo que fiz, o que não consegui fazer e o que ainda não compreendo. Guarda minha mente durante a noite. Ajuda meu corpo a descansar e prepara-me para o novo dia. Cuida das pessoas que amo e acompanha aqueles que estão sofrendo. Amém.

Você não precisa obrigar o sono a chegar.

Apenas permita que o corpo descanse.

Se um pensamento insistente aparecer, reconheça-o e deixe para amanhã. Volte sua atenção para a respiração e para a certeza de que este dia terminou.

Agora é tempo de repousar.`,
  },
  {
    id: 'manha-esperanca-01',
    day: 7,
    title: 'Um novo começo',
    category: 'Esperança / Louvor',
    durationEstimateSeconds: 137,
    biblicalReferences: ['Lamentações 3:21-23'],
    bibleMarkerIds: ['LAMENTATIONS_3_21_23'],
    summary:
      'Comece o dia com esperança, gratidão e uma intenção simples.',
    coverColor: '#1A3340',
    ambientVolume: 0.12,
    devotionalScript: `Um novo dia começou.

Talvez você tenha acordado com disposição. Talvez tenha acordado cansado ou preocupado. Você não precisa esconder de Deus como está se sentindo.

Antes de olhar para todas as tarefas, permaneça por alguns instantes neste começo.

Respire devagar.

Perceba que este dia ainda não precisa estar completamente definido. Ele poderá ser vivido em pequenas partes.

Agora ouça Lamentações, capítulo três, versículos vinte e um a vinte e três.

{{BIBLE:LAMENTATIONS_3_21_23}}

Essas palavras surgem em um contexto de sofrimento. A esperança não aparece porque todas as dificuldades já terminaram. Ela aparece quando o autor volta sua atenção para o caráter e a misericórdia de Deus.

Isso também pode acontecer hoje.

Você pode reconhecer suas preocupações e, ao mesmo tempo, procurar um motivo para continuar.

Pense em uma coisa pela qual você é grato.

Agora escolha uma intenção simples para o dia. Pode ser agir com paciência, pedir ajuda, cuidar do corpo, concluir uma tarefa ou falar com alguém que você ama.

Vamos orar.

Deus, obrigado por este novo dia. Tu conheces o que espero e também aquilo que temo. Dá-me força para viver o presente, sabedoria para minhas decisões e sensibilidade para perceber o bem ao meu redor. Ajuda-me a caminhar sem tentar controlar tudo antecipadamente. Amém.

Você não precisa viver o dia inteiro agora.

Comece pela próxima hora. Depois, pelo próximo passo.

Quando a preocupação aparecer, volte ao presente e lembre-se: um novo começo pode ser construído aos poucos.`,
  },
];

export function getJourneySessionById(id: string) {
  return anxietyJourney.find((session) => session.id === id);
}
