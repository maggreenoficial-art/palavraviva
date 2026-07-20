/**
 * Gera scripts/sos-anxiety-scripts.json — sequência SOS "Paz na Ansiedade" (7 episódios).
 * Usa apenas IDs do catálogo bíblico ({{BIBLE:id}}). Não inventa versículos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'sos-anxiety-scripts.json');

const settings = {
  stability: 0.8,
  similarity_boost: 0.72,
  style: 0.22,
  speed: 0.78,
};

const seriesTitle = 'Paz na Ansiedade';
const coverColor = '#1B2E3A';
const voiceHint = 'acolhedora, pausada, segura, sem sensacionalismo';

const episodes = [
  {
    day: 1,
    id: 'sos-ansiedade-01',
    title: 'O que a Bíblia diz sobre a ansiedade',
    summary:
      'Filipenses 4:6-7: a Bíblia não proíbe sentir ansiedade — convida a não viver dominado por ela. Oração com gratidão. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['PHILIPPIANS_4_6_7', '1_PETER_5_7'],
    ambientKey: 'ansiedade-01',
    ambientVolume: 0.12,
    script: `Respire comigo. Devagar.
<break time="3.0s" />
Você está no SOS — Alívio Imediato. Esta é a sequência Paz na Ansiedade. Sete áudios curtos para o coração cansado. Sem pressa. Sem cobrança.
<break time="2.5s" />
Hoje vamos olhar com honestidade para uma frase que muita gente lê e se sente ainda mais culpada: “Não andem ansiosos.”
<break time="2.5s" />
Se você já se perguntou: “Será que eu falhei na fé porque estou ansioso?” — este áudio é para você.
<break time="2.5s" />
A ansiedade é uma emoção humana. O corpo reage. A mente acelera. O peito aperta. Isso acontece com pessoas de fé e com pessoas sem fé. A Bíblia conhece esse território.
<break time="2.5s" />
Ouça com calma Filipenses, capítulo quatro, versículos seis e sete.
<break time="1.5s" />
{{BIBLE:PHILIPPIANS_4_6_7}}
<break time="4.0s" />
O que a Palavra está proibindo aqui?
<break time="2.0s" />
Não é o sentimento em si. É deixar a ansiedade mandar na casa. É viver aprisionado no “e se…”, sem caminho de volta para Deus.
<break time="2.5s" />
Sentir ansiedade não é o mesmo que viver em ansiedade. Sentir é humano. Viver dominado é outra história — e é disso que o texto cuida.
<break time="2.5s" />
Muitos cristãos pensam: ansiedade igual falta de fé. Mas a Bíblia não diz isso. Jesus, no Getsêmani, conheceu angústia profunda. Davi chorou de noite. Paulo falou de fraqueza. Fé e emoção podem caminhar juntas.
<break time="3.0s" />
E a solução do texto não é “só ore e finja que está bem”. É oração e súplicas — com ação de graças. Pedir e agradecer. Entregar e reconhecer o que ainda é bom.
<break time="2.5s" />
A gratidão não apaga o problema. Ela muda o ângulo. Ela lembra o coração de que Deus ainda cuida.
<break time="2.5s" />
Ouça também este convite de Pedro.
<break time="1.5s" />
{{BIBLE:1_PETER_5_7}}
<break time="3.5s" />
Prática de agora: faça este teste interior, sem julgamento.
<break time="2.0s" />
Quando a ansiedade sobe… você ora só pedindo socorro? Ou também agradece alguma coisa — mesmo pequena?
<break time="3.0s" />
Escolha agora uma preocupação. Só uma. Nomeie em silêncio.
<break time="3.0s" />
Diga: “Senhor, isto pesa em mim. Eu entrego.”
<break time="2.5s" />
Agora diga: “Obrigado por cuidares de mim — mesmo quando eu ainda não sinto paz completa.”
<break time="3.0s" />
Respire. Inspira… dois… três… quatro.
<break time="2.5s" />
Solta… dois… três… quatro… cinco… seis.
<break time="2.5s" />
Vamos orar.
<break time="2.0s" />
Pai, eu não quero viver dominado pela ansiedade. Ensina-me a orar com gratidão. Guarda o meu coração e a minha mente em Cristo Jesus. Amém.
<break time="3.0s" />
Frase-âncora: Eu posso sentir ansiedade — e ainda assim entregar a Deus, com gratidão.
<break time="2.5s" />
No próximo áudio: Jesus também sentiu angústia — e isso muda a forma como você se culpa.
<break time="2.0s" />
Este áudio oferece apoio espiritual e não substitui terapia ou acompanhamento médico.`,
  },
  {
    day: 2,
    id: 'sos-ansiedade-02',
    title: 'Jesus também sentiu angústia',
    summary:
      'Mateus 26 e Hebreus 5: Jesus reconheceu a angústia, pediu apoio e orou com honestidade. Você não está sozinho. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['mateus-26-37-38', 'hebreus-5-7', 'lucas-22-44', 'getsemani'],
    ambientKey: 'medo-01',
    ambientVolume: 0.11,
    script: `Bem-vindo de volta.
<break time="2.5s" />
Hoje a pergunta é direta — e pode trazer alívio: Jesus teve ansiedade?
<break time="2.5s" />
Se você já se sentiu culpado por um peito apertado, por lágrimas, por uma noite sem sono… respire. Você não está sozinho nessa história.
<break time="2.5s" />
Ouça Mateus, capítulo vinte e seis, versículos trinta e sete e trinta e oito.
<break time="1.5s" />
{{BIBLE:mateus-26-37-38}}
<break time="4.0s" />
Jesus, o Filho de Deus, se entristeceu e se angustiou. Ele pôs em palavras o peso da alma. Ele não fingiu força falsa.
<break time="2.5s" />
A carta aos Hebreus confirma o mesmo caminho de honestidade.
<break time="1.5s" />
{{BIBLE:hebreus-5-7}}
<break time="3.5s" />
E Lucas descreve a intensidade daquele momento.
<break time="1.5s" />
{{BIBLE:lucas-22-44}}
<break time="3.5s" />
Por que isso importa para você?
<break time="2.0s" />
Porque muitos pensam: se eu tenho fé, eu não posso sentir medo. Mas Jesus — perfeito em fé e em amor — atravessou angústia real. Então sentir não te desqualifica. Sentir te humaniza.
<break time="3.0s" />
O que Jesus fez com a angústia?
<break time="2.0s" />
Primeiro: reconheceu. Não negou.
<break time="2.0s" />
Segundo: procurou apoio. Levou Pedro, Tiago e João. Pediu presença. “Ficai aqui e vigiai comigo.”
<break time="2.5s" />
Terceiro: orou com honestidade. Ouça a oração do Getsêmani.
<break time="1.5s" />
{{BIBLE:getsemani}}
<break time="4.0s" />
Honestidade diante do Pai. Entrega. Não performance.
<break time="2.5s" />
A diferença não é “nunca sentir”. A diferença é: Ele não deixou a angústia decidir sozinha o caminho. Ele levou a angústia a Deus — e pediu companhia humana.
<break time="3.0s" />
Prática de agora — o desafio de Jesus, em três passos suaves.
<break time="2.0s" />
Um: diga em voz baixa o que está pesando. Nomeie.
<break time="3.0s" />
Dois: pense em uma pessoa de confiança a quem você pode falar — ou peça a Deus uma. Você não precisa carregar tudo sozinho.
<break time="3.0s" />
Três: ore com honestidade. Sem frases bonitas. Só verdade.
<break time="2.5s" />
Vamos orar.
<break time="2.0s" />
Jesus, Tu conheceste a angústia. Então eu posso trazer a minha sem vergonha. Ensina-me a pedir ajuda, a falar a verdade e a entregar o cálice pesado nas mãos do Pai. Amém.
<break time="3.0s" />
Frase-âncora: Se Jesus sentiu angústia, eu não estou sozinho — e posso orar com honestidade.
<break time="2.5s" />
No próximo: o Salmo vinte e três — um caminho de paz que a mente também reconhece.
<break time="2.0s" />
Este áudio oferece apoio espiritual e não substitui terapia ou acompanhamento médico.`,
  },
  {
    day: 3,
    id: 'sos-ansiedade-03',
    title: 'O Salmo 23 e o alívio da mente',
    summary:
      'Visualização guiada com o Salmo 23: pastos, águas tranquilas e a presença do Pastor. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['salmo-23', 'PSALM_23_1_4'],
    ambientKey: 'manha-esperanca-01',
    ambientVolume: 0.12,
    script: `Feche os olhos, se puder.
<break time="3.0s" />
Hoje vamos caminhar pelo Salmo vinte e três — não só com a mente, mas com a imaginação e o corpo.
<break time="2.5s" />
Psicólogos e terapeutas, há décadas, usam visualização de lugares tranquilos para acalmar o sistema nervoso: um campo, uma água quieta, um lugar seguro. O Salmo vinte e três faz exatamente isso — há milênios.
<break time="3.0s" />
Não é magia. É atenção. É memória sagrada. É deixar a Palavra pintar um lugar interno onde o coração pode desacelerar.
<break time="2.5s" />
Ouça o Salmo vinte e três.
<break time="1.5s" />
{{BIBLE:salmo-23}}
<break time="4.5s" />
Pastos verdejantes: imagem de descanso.
<break time="2.0s" />
Águas tranquilas: ritmo lento. Som suave.
<break time="2.0s" />
Refrigera a minha alma: alívio. Renovação.
<break time="2.5s" />
A ciência, em estudos sobre leitura de Salmos e práticas contemplativas, tem observado redução de tensão e ansiedade em muitas pessoas. A Bíblia já convidava a esse descanso há muito tempo.
<break time="2.5s" />
Agora, prática guiada. Devagar.
<break time="2.0s" />
Imagine-se em um campo verde. Sinta o chão sob os pés. O cheiro da grama. O ar fresco no rosto.
<break time="4.0s" />
À sua frente, uma água quieta. Sem pressa. Só o movimento leve da superfície.
<break time="3.5s" />
Alguém caminha com você. O Pastor. Não como figura distante — como presença próxima. Você não precisa explicar tudo. Ele já sabe.
<break time="3.5s" />
Diga por dentro: “O Senhor é o meu pastor. De nada terei falta.”
<break time="3.0s" />
Respire. Inspira… dois… três… quatro.
<break time="2.5s" />
Solta… dois… três… quatro… cinco… seis.
<break time="2.5s" />
Ouça de novo o começo do Salmo, com atenção.
<break time="1.5s" />
{{BIBLE:PSALM_23_1_4}}
<break time="4.0s" />
Desafio suave: sete dias. Leia o Salmo vinte e três pela manhã. Anote, em uma frase, como você se sente depois. Sem perfeição. Só presença.
<break time="2.5s" />
Vamos orar.
<break time="2.0s" />
Senhor, meu Pastor, leva-me a pastos verdejantes. Guia-me junto a águas tranquilas. Refrigera a minha alma. Amém.
<break time="3.0s" />
Frase-âncora: O Senhor é o meu pastor — eu posso descansar.
<break time="2.5s" />
No próximo: ansiedade é pecado? Vamos responder com honestidade bíblica — sem culpa exagerada e sem superficialidade.
<break time="2.0s" />
Este áudio oferece apoio espiritual e não substitui terapia ou acompanhamento médico.`,
  },
  {
    day: 4,
    id: 'sos-ansiedade-04',
    title: 'Ansiedade é pecado?',
    summary:
      '2 Timóteo 1:7 e 1 Pedro 5:7: emoção humana não é pecado; o convite é lançar a ansiedade sobre Deus. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['2timoteo-1-7', '1_PETER_5_7', 'salmo-6-6-7'],
    ambientKey: 'certeza-fe-01',
    ambientVolume: 0.11,
    script: `Vamos falar de um tema que divide opiniões — com cuidado e verdade.
<break time="2.5s" />
Ansiedade é pecado?
<break time="2.5s" />
Alguns sermões dizem que sim. Muitos corações saem mais feridos do que curados. Mas precisamos perguntar: o que a Bíblia realmente diz?
<break time="2.5s" />
Ouça Segunda Timóteo, capítulo um, versículo sete.
<break time="1.5s" />
{{BIBLE:2timoteo-1-7}}
<break time="3.5s" />
Deus dá espírito de poder, amor e equilíbrio — não de covardia. Isso é identidade e direção. Não é uma sentença contra quem está tremendo por dentro.
<break time="2.5s" />
Agora ouça Pedro.
<break time="1.5s" />
{{BIBLE:1_PETER_5_7}}
<break time="3.5s" />
Se a ansiedade fosse simplesmente “pecado a esconder”, o convite seria outro. Mas o convite é: lance sobre Ele. Traga. Entregue. Porque Ele tem cuidado de você.
<break time="3.0s" />
Diferença importante:
<break time="2.0s" />
Ansiedade como emoção: humana. Corpo e mente reagindo.
<break time="2.0s" />
Viver sem jamais confiar, sem jamais entregar, fugindo de Deus no meio da crise: aí a questão espiritual fica mais séria — não por sentir, mas por se fechar.
<break time="3.0s" />
Davi, homem segundo o coração de Deus, também conheceu noites de lágrimas.
<break time="1.5s" />
{{BIBLE:salmo-6-6-7}}
<break time="3.5s" />
Ele não foi descartado por gemer. Foi ouvido. Foi acolhido no Salmo.
<break time="2.5s" />
Se ansiedade, por si só, fosse pecado condenatório, então Davi, Jesus e Paulo — que também falaram de fraqueza e peso — estariam fora. Mas a Escritura mostra outra coisa: Deus se aproxima do quebrantado.
<break time="3.0s" />
Prática: pare de se culpar pelo sentimento. Examine o caminho.
<break time="2.0s" />
Quando a ansiedade sobe… você corre para Deus, ou foge Dele?
<break time="3.0s" />
Se foge, não é porque você é “mau”. É porque dói. Então o convite de hoje é um passo pequeno de volta: lançar. Nem que seja um pedaço.
<break time="2.5s" />
Coloque a mão no peito. Sinta o ritmo.
<break time="2.5s" />
Inspira… dois… três… quatro.
<break time="2.5s" />
Solta… dois… três… quatro… cinco… seis.
<break time="2.5s" />
Diga: “Eu não sou condenado por sentir. Eu sou convidado a entregar.”
<break time="3.0s" />
Vamos orar.
<break time="2.0s" />
Pai, eu solto a culpa que não vem de Ti. Eu trago a ansiedade às Tuas mãos. Dá-me espírito de poder, amor e equilíbrio. Amém.
<break time="3.0s" />
Frase-âncora: Sentir ansiedade não me condena — lançá-la a Deus me liberta.
<break time="2.5s" />
No próximo: Moisés, Elias e Paulo — crises reais, e o cuidado de Deus em cada história.
<break time="2.0s" />
Este áudio oferece apoio espiritual e não substitui terapia ou acompanhamento médico.`,
  },
  {
    day: 5,
    id: 'sos-ansiedade-05',
    title: 'Moisés, Elias e Paulo — e suas crises',
    summary:
      'Três histórias de medo, esgotamento e fraqueza: Deus capacita, restaura e sustenta. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['exodo-4-10-12', '1reis-19-4-8', '2corintios-12-7-9'],
    ambientKey: 'ansiedade-02',
    ambientVolume: 0.11,
    script: `Hoje você não vai ouvir teoria. Vai ouvir três nomes conhecidos — e três crises humanas.
<break time="2.5s" />
Se você acha que é o único a tremer, a querer desistir, a sentir o peito apertado diante da missão… respire. A Bíblia está cheia de gente assim — e Deus não os abandonou.
<break time="3.0s" />
Primeiro: Moisés. Medo de falar. Sensação de incapacidade.
<break time="1.5s" />
{{BIBLE:exodo-4-10-12}}
<break time="4.0s" />
Deus não ridicularizou o medo. Deus prometeu presença. E deu ajuda — Arão. Às vezes a resposta de Deus inclui pessoas.
<break time="2.5s" />
Lição: Deus não te chama para te deixar sozinho sem recurso. Ele capacita — no tempo e no modo Dele.
<break time="2.5s" />
Segundo: Elias. Depois de um grande momento, veio o colapso. Medo. Desejo de que tudo acabasse.
<break time="1.5s" />
{{BIBLE:1reis-19-4-8}}
<break time="4.0s" />
O que Deus fez? Não um sermão duro primeiro. Pão. Água. Descanso. Depois, missão renovada. Às vezes o cuidado de Deus começa no corpo: comer, dormir, respirar.
<break time="3.0s" />
Lição: Deus nem sempre tira a tempestade na hora — mas sustenta você nela.
<break time="2.5s" />
Terceiro: Paulo. Um “espinho”. Um peso. Um pedido de livramento.
<break time="1.5s" />
{{BIBLE:2corintios-12-7-9}}
<break time="4.0s" />
A graça bastou. Não porque a dor era pequena — mas porque Deus é suficiente quando a força humana falha.
<break time="2.5s" />
Lição: Deus não promete apagar toda ansiedade imediatamente. Promete sustento. Graça. Presença.
<break time="2.5s" />
Prática: escolha um dos três — Moisés, Elias ou Paulo. Em silêncio, diga: “A história dele toca a minha porque…”
<break time="4.0s" />
Anote mentalmente três lições pequenas para a sua semana. Uma já basta para hoje.
<break time="2.5s" />
Vamos orar.
<break time="2.0s" />
Senhor, como Moisés, eu trago o medo. Como Elias, eu trago o cansaço. Como Paulo, eu trago a fraqueza. Que a Tua graça me baste. Amém.
<break time="3.0s" />
Frase-âncora: Eu não sou o único — e Deus ainda me sustenta.
<break time="2.5s" />
No próximo: o que a Bíblia diz sobre remédios e cuidado médico — com honestidade e sem julgamento.
<break time="2.0s" />
Este áudio oferece apoio espiritual e não substitui terapia ou acompanhamento médico.`,
  },
  {
    day: 6,
    id: 'sos-ansiedade-06',
    title: 'Fé, remédios e cuidado médico',
    summary:
      'A Bíblia não condena o cuidado médico. Medicina e fé podem caminhar juntas. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['1timoteo-5-23', 'lucas-10-33-34'],
    ambientKey: 'amor-acalma-01',
    ambientVolume: 0.11,
    script: `Este áudio pede honestidade — e respeito.
<break time="2.5s" />
Há pessoas que tomam remédio para ansiedade e carregam vergonha. Há pessoas que condenam quem toma. E há quem use o remédio no lugar de Deus — ou use “fé” no lugar de cuidar do corpo.
<break time="3.0s" />
O que a Bíblia diz?
<break time="2.0s" />
Ela não proíbe o cuidado. Paulo recomenda a Timóteo um recurso medicinal da época.
<break time="1.5s" />
{{BIBLE:1timoteo-5-23}}
<break time="3.5s" />
E na parábola do bom samaritano, o cuidado inclui azeite e vinho — meios concretos de tratar feridas.
<break time="1.5s" />
{{BIBLE:lucas-10-33-34}}
<break time="3.5s" />
Deus é o autor da vida — e da sabedoria que cura. Médicos, terapeutas e remédios podem ser instrumentos. Isso não diminui a fé. Pode ser expressão de cuidado.
<break time="3.0s" />
O cuidado: não é o remédio em si o problema. É quando qualquer coisa — remédio, distração, trabalho — vira o único salvador, e Deus fica de fora.
<break time="2.5s" />
Deus pode cuidar de você de formas diferentes: com milagre, com medicina, com ambas, com tempo, com comunidade. Não cabe a nós julgar o caminho do outro.
<break time="3.0s" />
Pergunta reflexiva — sem culpa:
<break time="2.0s" />
Você está usando ajuda médica como complemento à fé… ou como substituto de qualquer relacionamento com Deus?
<break time="3.5s" />
Se for complemento: continue com gratidão e acompanhamento profissional.
<break time="2.0s" />
Se for substituto: o convite não é jogar o remédio fora. É reabrir a porta da oração, da Palavra, da presença — enquanto cuida do corpo.
<break time="3.0s" />
Três caminhos possíveis — sem ranking de espiritualidade:
<break time="2.0s" />
Um: Deus age de forma milagrosa.
<break time="2.0s" />
Dois: Deus age através da medicina e da terapia.
<break time="2.0s" />
Três: Deus combina as duas.
<break time="2.5s" />
O que importa é não ficar sozinho — nem sem Deus, nem sem cuidado humano quando precisa.
<break time="2.5s" />
Respire. Inspira… dois… três… quatro.
<break time="2.5s" />
Solta… dois… três… quatro… cinco… seis.
<break time="2.5s" />
Vamos orar.
<break time="2.0s" />
Senhor, obrigado pelos meios de cura que Tu permites. Livra-me da culpa falsa e da autossuficiência. Seja Tu o centro — e usa também a medicina, se for preciso, para o meu bem. Amém.
<break time="3.0s" />
Frase-âncora: Cuidar do corpo não é falta de fé — é também cuidado de Deus.
<break time="2.5s" />
Importante: nunca pare um medicamento sem orientação médica. Este app não substitui profissional de saúde.
<break time="2.5s" />
No último áudio da sequência: o segredo de Paulo para os pensamentos — Filipenses quatro, oito.
<break time="2.0s" />
Este áudio oferece apoio espiritual e não substitui terapia ou acompanhamento médico.`,
  },
  {
    day: 7,
    id: 'sos-ansiedade-07',
    title: 'O segredo de Paulo para os pensamentos',
    summary:
      'Filipenses 4:8: redirecionar a mente para o que edifica — prática diária contra o looping ansioso. Apoio espiritual — não substitui terapia.',
    biblicalPrayerIds: ['filipenses-4-4-9', 'PHILIPPIANS_4_6_7'],
    ambientKey: 'ordem-caos-01',
    ambientVolume: 0.1,
    script: `Chegamos ao sétimo áudio da sequência Paz na Ansiedade.
<break time="2.5s" />
Paulo não diz apenas “pare de pensar no medo”. Ele ensina a preencher a mente com outra coisa — o que é verdadeiro, puro, amável, de boa fama.
<break time="3.0s" />
A psicologia moderna, na terapia cognitivo-comportamental, trabalha com a troca de pensamentos automáticos por pensamentos mais verdadeiros e úteis. Paulo, séculos antes, já apontava o direcionamento da mente.
<break time="3.0s" />
Ouça Filipenses, capítulo quatro, versículos quatro a nove — o contexto completo da paz e do pensamento.
<break time="1.5s" />
{{BIBLE:filipenses-4-4-9}}
<break time="4.5s" />
Orar. Agradecer. Entregar. E também: pensar naquilo que edifica.
<break time="2.5s" />
Não é negação tóxica. Não é fingir que o problema não existe. É recusar dar ao medo o microfone o dia inteiro.
<break time="2.5s" />
Prática — desafio dos dias: quando um pensamento ansioso vier, pause.
<break time="2.0s" />
Nomeie: “Isso é preocupação.”
<break time="2.0s" />
Substitua por um versículo, uma memória boa, ou uma gratidão concreta.
<break time="2.5s" />
Exemplo: “Deus tem cuidado de mim.” Ou: “Hoje eu tenho este fôlego.” Ou: “Eu posso dar um passo.”
<break time="3.0s" />
Dica simples: coloque um lembrete no celular com Filipenses quatro, oito — ou com a frase: “Nisso pensai.”
<break time="2.5s" />
Vamos fechar a sequência revisando o coração de Filipenses quatro, seis e sete.
<break time="1.5s" />
{{BIBLE:PHILIPPIANS_4_6_7}}
<break time="4.0s" />
Respire comigo uma última vez nesta série.
<break time="2.0s" />
Inspira… dois… três… quatro.
<break time="2.5s" />
Solta… dois… três… quatro… cinco… seis.
<break time="2.5s" />
Vamos orar.
<break time="2.0s" />
Pai, guarda a minha mente. Ensina-me a pensar no que é verdadeiro e amável. Que a Tua paz, que excede todo entendimento, guarde o meu coração em Cristo Jesus. Amém.
<break time="3.0s" />
Frase-âncora: Eu redireciono meus pensamentos — e Deus guarda meu coração.
<break time="2.5s" />
Você pode voltar a qualquer episódio quando a crise bater. O SOS está aqui. Você não está sozinho.
<break time="2.5s" />
Se quiser aprofundar a paz no dia a dia, o Diário de Gratidão no app pode ajudar a praticar a ação de graças de Filipenses.
<break time="2.0s" />
Este áudio oferece apoio espiritual e não substitui terapia ou acompanhamento médico.`,
  },
];

const out = {};
for (const ep of episodes) {
  out[ep.id] = {
    title: ep.title,
    subtitle: `Áudio ${ep.day} · ${seriesTitle}`,
    summary: ep.summary,
    voiceHint,
    coverColor,
    seriesId: 'sos-ansiedade',
    seriesTitle,
    seriesDay: ep.day,
    biblicalPrayerIds: ep.biblicalPrayerIds,
    ambientKey: ep.ambientKey,
    ambientVolume: ep.ambientVolume,
    durationSeconds: 300,
    settings,
    devotionalScript: ep.script,
  };
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`Salvo ${Object.keys(out).length} roteiros em ${outPath}`);
