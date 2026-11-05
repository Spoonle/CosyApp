/** Citations intégrées — citations réelles, sources classiques. */

export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  { text: 'Ce n’est pas parce que les choses sont difficiles que nous n’osons pas, c’est parce que nous n’osons pas qu’elles sont difficiles.', author: 'Sénèque' },
  { text: 'La simplicité est la sophistication suprême.', author: 'Léonard de Vinci' },
  { text: 'Il n’y a qu’une façon d’échouer, c’est d’abandonner avant d’avoir réussi.', author: 'Georges Clemenceau' },
  { text: 'Le temps est la ressource la plus précieuse : on ne peut ni l’acheter, ni le stocker, ni le rattraper.', author: 'Proverbe populaire' },
  { text: 'Fais de ton mieux avec ce que tu as, là où tu es.', author: 'Theodore Roosevelt' },
  { text: 'La discipline est le pont entre les objectifs et les accomplissements.', author: 'Jim Rohn' },
  { text: 'Ce que nous faissons avec peu en dit plus que ce que nous promettons avec beaucoup.', author: 'Antoine de Saint-Exupéry' },
  { text: 'La clarté précède la maîtrise.', author: 'Robin Sharma' },
  { text: 'Un voyage de mille lieues commence toujours par un premier pas.', author: 'Lao Tseu' },
  { text: 'L’attention est la forme la plus rare et la plus pure de la générosité.', author: 'Simone Weil' },
  { text: 'On ne devient pas ce que l’on veut, on devient ce que l’on répète chaque jour.', author: 'John Maxwell' },
  { text: 'Le succès, c’est tomber sept fois et se relever huit.', author: 'Proverbe japonais' },
  { text: 'Celui qui déplace une montagne commence par déplacer de petites pierres.', author: 'Confucius' },
  { text: 'La perfection est atteinte, non pas lorsqu’il n’y a plus rien à ajouter, mais lorsqu’il n’y a plus rien à retirer.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Votre temps est limité, ne le gâchez pas en menant une existence qui n’est pas la vôtre.', author: 'Steve Jobs' },
  { text: 'Les petites actions répétées mènent aux grandes transformations.', author: 'Sagesse populaire' },
  { text: 'Ce que l’on conçoit bien s’énonce clairement.', author: 'Nicolas Boileau' },
  { text: 'Le calme est un super-pouvoir.', author: 'Anonyme' },
  { text: 'Il faut viser la lune, parce qu’au moins, si on échoue, on finit dans les étoiles.', author: 'Oscar Wilde' },
  { text: 'Chaque matin, nous naissons de nouveau. Ce que nous faisons aujourd’hui est ce qui compte le plus.', author: 'Bouddha (attribué)' },
  { text: 'La meilleure façon de prédire l’avenir, c’est de le créer.', author: 'Peter Drucker' },
  { text: 'Bien faire et faire faire côtes à côte : les habitudes sont nos alliées silencieuses.', author: 'Sagesse populaire' },
  { text: 'Concentre-toi sur une chose à la fois, et fais-la bien.', author: 'Anonyme' },
  { text: 'Le repos fait partie du travail.', author: 'Anonyme' }
];

/** Citation du jour (rotation quotidienne, stable dans la journée). */
export function quoteOfDay(offset = 0): Quote {
  const start = new Date(2024, 0, 1);
  const today = new Date();
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const index = ((days + offset) % QUOTES.length + QUOTES.length) % QUOTES.length;
  return QUOTES[index];
}
