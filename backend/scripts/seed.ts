/**
 * scripts/seed.ts
 * Populates the database with a starter set of films and schedules the first
 * 14 days of challenges starting from TODAY (UTC).
 *
 * Usage: tsx scripts/seed.ts
 *
 * Safe to re-run: INSERT OR IGNORE skips rows that already exist.
 * To wipe and re-seed from scratch: npm run db:reset first.
 *
 * Image strategy (IMAGE_SOURCE=tmdb):
 *   image_url stores the TMDB poster path ("/abc123.jpg").
 *   The service layer prepends TMDB_IMAGE_BASE_URL at query time.
 *   Change IMAGE_SOURCE=local + image_url="/posters/foo.jpg" to self-host.
 */

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seed script must not run in production')
  process.exit(1)
}

import 'dotenv/config';
import db from '../src/db/database.js';

// ─── Film catalogue ───────────────────────────────────────────────────────────

const films = [
  {
    title: 'Les Évadés',
    title_aliases: JSON.stringify(['The Shawshank Redemption', 'Shawshank Redemption']),
    year: 1994,
    director: 'Frank Darabont',
    genres: JSON.stringify(['Drame']),
    cast_members: JSON.stringify(['Tim Robbins', 'Morgan Freeman', 'Bob Gunton']),
    tagline: 'La peur peut vous emprisonner. L\'espoir peut vous libérer.',
    synopsis: 'Andy Dufresne, un banquier, est condamné à la prison à vie pour le meurtre de sa femme et de son amant. Il se lie d\'amitié avec Red, le caïd des détenus, et tente de garder espoir.',
    image_url: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    image_blurred_url: null,
    tmdb_id: 278,
    imdb_id: 'tt0111161',
  },
  {
    title: 'Le Parrain',
    title_aliases: JSON.stringify(['The Godfather', 'Godfather']),
    year: 1972,
    director: 'Francis Ford Coppola',
    genres: JSON.stringify(['Crime', 'Drame']),
    cast_members: JSON.stringify(['Marlon Brando', 'Al Pacino', 'James Caan']),
    tagline: 'Une offre que vous ne pourrez pas refuser.',
    synopsis: 'Le patriarche vieillissant d\'une dynastie criminelle organisée transfère le contrôle de son empire clandestin à son fils réticent.',
    image_url: '/3bhkrj58Vtu7enYsLegHnDmne2N.jpg',
    image_blurred_url: null,
    tmdb_id: 238,
    imdb_id: 'tt0068646',
  },
  {
    title: 'Pulp Fiction',
    title_aliases: JSON.stringify([]),
    year: 1994,
    director: 'Quentin Tarantino',
    genres: JSON.stringify(['Crime', 'Drame']),
    cast_members: JSON.stringify(['John Travolta', 'Uma Thurman', 'Samuel L. Jackson']),
    tagline: 'Vous ne connaîtrez pas les faits avant d\'avoir vu la fiction.',
    synopsis: 'Les destins de deux tueurs à gages, d\'un boxeur, d\'un gangster et de sa femme se croisent en quatre histoires de violence et de rédemption.',
    image_url: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    image_blurred_url: null,
    tmdb_id: 680,
    imdb_id: 'tt0110912',
  },
  {
    title: 'Inception',
    title_aliases: JSON.stringify([]),
    year: 2010,
    director: 'Christopher Nolan',
    genres: JSON.stringify(['Action', 'Science-fiction', 'Aventure']),
    cast_members: JSON.stringify(['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page']),
    tagline: 'Votre esprit est la scène du crime.',
    synopsis: 'Un voleur spécialisé dans l\'extraction de secrets à travers les rêves reçoit la mission inverse : implanter une idée dans l\'esprit d\'un PDG.',
    image_url: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    image_blurred_url: null,
    tmdb_id: 27205,
    imdb_id: 'tt1375666',
  },
  {
    title: 'Interstellar',
    title_aliases: JSON.stringify([]),
    year: 2014,
    director: 'Christopher Nolan',
    genres: JSON.stringify(['Aventure', 'Drame', 'Science-fiction']),
    cast_members: JSON.stringify(['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain']),
    tagline: 'L\'humanité est née sur Terre. Elle n\'était pas censée y mourir.',
    synopsis: 'Une équipe d\'explorateurs voyage à travers un trou de ver dans l\'espace pour tenter d\'assurer la survie de l\'humanité.',
    image_url: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    image_blurred_url: null,
    tmdb_id: 157336,
    imdb_id: 'tt0816692',
  },
  {
    title: 'The Dark Knight : Le Chevalier Noir',
    title_aliases: JSON.stringify(['The Dark Knight', 'Dark Knight', 'Le Chevalier Noir']),
    year: 2008,
    director: 'Christopher Nolan',
    genres: JSON.stringify(['Action', 'Crime', 'Drame']),
    cast_members: JSON.stringify(['Christian Bale', 'Heath Ledger', 'Aaron Eckhart']),
    tagline: 'Pourquoi si sérieux ?',
    synopsis: 'Quand le Joker sème le chaos à Gotham, Batman doit affronter l\'un des plus grands tests psychologiques et physiques de sa vie.',
    image_url: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    image_blurred_url: null,
    tmdb_id: 155,
    imdb_id: 'tt0468569',
  },
  {
    title: 'Forrest Gump',
    title_aliases: JSON.stringify([]),
    year: 1994,
    director: 'Robert Zemeckis',
    genres: JSON.stringify(['Comédie', 'Drame', 'Romance']),
    cast_members: JSON.stringify(['Tom Hanks', 'Robin Wright', 'Gary Sinise']),
    tagline: 'La vie, c\'est comme une boîte de chocolats : on ne sait jamais sur quoi on va tomber.',
    synopsis: 'Les grandes étapes de l\'histoire américaine vécues par Forrest Gump, un homme au grand cœur mais au QI limité.',
    image_url: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
    image_blurred_url: null,
    tmdb_id: 13,
    imdb_id: 'tt0109830',
  },
  {
    title: 'Matrix',
    title_aliases: JSON.stringify(['The Matrix']),
    year: 1999,
    director: 'Lana Wachowski',
    genres: JSON.stringify(['Action', 'Science-fiction']),
    cast_members: JSON.stringify(['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss']),
    tagline: 'Libère ton esprit.',
    synopsis: 'Un hacker découvre la véritable nature de sa réalité et son rôle dans la guerre contre ses contrôleurs.',
    image_url: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    image_blurred_url: null,
    tmdb_id: 603,
    imdb_id: 'tt0133093',
  },
  {
    title: 'Le Voyage de Chihiro',
    title_aliases: JSON.stringify(['Spirited Away', 'Sen to Chihiro no Kamikakushi']),
    year: 2001,
    director: 'Hayao Miyazaki',
    genres: JSON.stringify(['Animation', 'Fantastique', 'Famille']),
    cast_members: JSON.stringify(['Daveigh Chase', 'Suzanne Pleshette', 'Miyu Irino']),
    tagline: 'Le tunnel a conduit Chihiro vers une ville mystérieuse.',
    synopsis: 'Lors du déménagement de sa famille, une fillette de 10 ans se retrouve dans un monde peuplé de dieux, de sorcières et d\'esprits.',
    image_url: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    image_blurred_url: null,
    tmdb_id: 129,
    imdb_id: 'tt0245429',
  },
  {
    title: 'Parasite',
    title_aliases: JSON.stringify(['Gisaengchung']),
    year: 2019,
    director: 'Bong Joon-ho',
    genres: JSON.stringify(['Drame', 'Thriller', 'Comédie']),
    cast_members: JSON.stringify(['Kang-ho Song', 'Sun-kyun Lee', 'Yeo-jeong Cho']),
    tagline: 'Fais comme si la maison t\'appartenait.',
    synopsis: 'La cupidité et la discrimination de classe menacent la relation symbiotique entre la riche famille Park et le clan Kim désargenté.',
    image_url: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    image_blurred_url: null,
    tmdb_id: 496243,
    imdb_id: 'tt6751668',
  },
  {
    title: 'Les Affranchis',
    title_aliases: JSON.stringify(['Goodfellas', 'Good Fellas']),
    year: 1990,
    director: 'Martin Scorsese',
    genres: JSON.stringify(['Crime', 'Drame']),
    cast_members: JSON.stringify(['Ray Liotta', 'Robert De Niro', 'Joe Pesci']),
    tagline: 'Trois décennies de vie dans la mafia.',
    synopsis: 'L\'ascension et la chute de Henry Hill au sein de la mafia américaine, vue à travers trois décennies de vie criminelle.',
    image_url: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
    image_blurred_url: null,
    tmdb_id: 769,
    imdb_id: 'tt0099685',
  },
  {
    title: 'Fight Club',
    title_aliases: JSON.stringify([]),
    year: 1999,
    director: 'David Fincher',
    genres: JSON.stringify(['Drame', 'Thriller']),
    cast_members: JSON.stringify(['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter']),
    tagline: 'Anarchie. Chaos. Savon.',
    synopsis: 'Un cadre insomniaque et un fabricant de savon charismatique fondent un club de combat clandestin qui évolue vers quelque chose de bien plus grand.',
    image_url: '/pB8BM7pdSp6B3DbRiSL7F5yKMnH.jpg',
    image_blurred_url: null,
    tmdb_id: 550,
    imdb_id: 'tt0137523',
  },
  {
    title: 'La Liste de Schindler',
    title_aliases: JSON.stringify(['Schindler\'s List', 'Schindlers List']),
    year: 1993,
    director: 'Steven Spielberg',
    genres: JSON.stringify(['Drame', 'Histoire', 'Guerre']),
    cast_members: JSON.stringify(['Liam Neeson', 'Ralph Fiennes', 'Ben Kingsley']),
    tagline: 'Celui qui sauve une vie sauve le monde entier.',
    synopsis: 'Dans la Pologne occupée par les nazis, Oskar Schindler, industriel allemand, s\'emploie progressivement à sauver ses employés juifs de la déportation.',
    image_url: '/sF1U4EUQS8udIMY7bdEliEBurek.jpg',
    image_blurred_url: null,
    tmdb_id: 424,
    imdb_id: 'tt0108052',
  },
  {
    title: 'Le Seigneur des anneaux : Le Retour du roi',
    title_aliases: JSON.stringify(['The Lord of the Rings: The Return of the King', 'Le Retour du Roi', 'LOTR 3', 'Return of the King']),
    year: 2003,
    director: 'Peter Jackson',
    genres: JSON.stringify(['Aventure', 'Fantastique', 'Action']),
    cast_members: JSON.stringify(['Elijah Wood', 'Viggo Mortensen', 'Ian McKellen']),
    tagline: 'L\'œil de l\'ennemi est en mouvement.',
    synopsis: 'Gandalf et Aragorn mènent les Hommes contre l\'armée de Sauron pour détourner son regard de Frodon et Sam qui approchent de la Montagne du Destin.',
    image_url: '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
    image_blurred_url: null,
    tmdb_id: 122,
    imdb_id: 'tt0167260',
  },
];

// ─── Insert films ─────────────────────────────────────────────────────────────

const insertFilm = db.prepare(`
  INSERT OR IGNORE INTO films
    (title, title_aliases, year, director, genres, cast_members,
     tagline, synopsis, image_url, image_blurred_url, tmdb_id, imdb_id)
  VALUES
    (@title, @title_aliases, @year, @director, @genres, @cast_members,
     @tagline, @synopsis, @image_url, @image_blurred_url, @tmdb_id, @imdb_id)
`);

const insertMany = db.transaction((rows: typeof films) => {
  for (const film of rows) {
    insertFilm.run(film);
  }
});

console.log('Seeding films…');
insertMany(films);
console.log(`  Inserted (or skipped) ${films.length} films.`);

// ─── Schedule daily challenges ────────────────────────────────────────────────

// Build a list of all inserted film IDs in the same order (by title)
const filmIds = db
  .prepare<[], { id: number; title: string }>(
    `SELECT id, title FROM films WHERE is_active = 1 ORDER BY id ASC`
  )
  .all();

// Figure out today in UTC and what challenge_number to start from
const existingMax = (
  db
    .prepare<[], { max_num: number | null }>(
      `SELECT MAX(challenge_number) AS max_num FROM daily_challenges`
    )
    .get()?.max_num ?? 0
);

const insertChallenge = db.prepare(`
  INSERT OR IGNORE INTO daily_challenges
    (challenge_date, film_id, challenge_number, hint_schedule)
  VALUES
    (@challenge_date, @film_id, @challenge_number, @hint_schedule)
`);

const scheduleMany = db.transaction(
  (entries: Array<{ challenge_date: string; film_id: number; challenge_number: number }>) => {
    for (const entry of entries) {
      insertChallenge.run({
        ...entry,
        hint_schedule: JSON.stringify(['year', 'director', 'cast']),
      });
    }
  }
);

// Start scheduling from today for 14 days
const today = new Date();
const entries: Array<{ challenge_date: string; film_id: number; challenge_number: number }> = [];

for (let i = 0; i < Math.min(14, filmIds.length); i++) {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + i);
  const dateStr = d.toISOString().slice(0, 10);

  entries.push({
    challenge_date: dateStr,
    film_id: filmIds[i].id,
    challenge_number: existingMax + i + 1,
  });
}

console.log('Scheduling daily challenges…');
scheduleMany(entries);
console.log(`  Scheduled ${entries.length} challenges starting ${entries[0]?.challenge_date}.`);

// ─── Summary ──────────────────────────────────────────────────────────────────

const totalFilms = (db.prepare(`SELECT COUNT(*) AS c FROM films`).get() as { c: number }).c;
const totalChallenges = (
  db.prepare(`SELECT COUNT(*) AS c FROM daily_challenges`).get() as { c: number }
).c;

console.log(`\nDatabase state:`);
console.log(`  Films          : ${totalFilms}`);
console.log(`  Daily challenges: ${totalChallenges}`);
console.log('\nSeed complete.');

db.close();
