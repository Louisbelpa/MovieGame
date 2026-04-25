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

import 'dotenv/config';
import db from '../src/db/database.js';

// ─── Film catalogue ───────────────────────────────────────────────────────────

const films = [
  {
    title: 'The Shawshank Redemption',
    title_aliases: JSON.stringify(['Shawshank Redemption']),
    year: 1994,
    director: 'Frank Darabont',
    genres: JSON.stringify(['Drama']),
    cast_members: JSON.stringify(['Tim Robbins', 'Morgan Freeman', 'Bob Gunton']),
    tagline: 'Fear can hold you prisoner. Hope can set you free.',
    synopsis: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    image_url: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    image_blurred_url: null,
    tmdb_id: 278,
    imdb_id: 'tt0111161',
  },
  {
    title: 'The Godfather',
    title_aliases: JSON.stringify(['Le Parrain', 'El Padrino']),
    year: 1972,
    director: 'Francis Ford Coppola',
    genres: JSON.stringify(['Crime', 'Drama']),
    cast_members: JSON.stringify(['Marlon Brando', 'Al Pacino', 'James Caan']),
    tagline: "An offer you can't refuse.",
    synopsis: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
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
    genres: JSON.stringify(['Crime', 'Drama']),
    cast_members: JSON.stringify(['John Travolta', 'Uma Thurman', 'Samuel L. Jackson']),
    tagline: 'You won\'t know the facts until you\'ve seen the fiction.',
    synopsis: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
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
    genres: JSON.stringify(['Action', 'Science Fiction', 'Adventure']),
    cast_members: JSON.stringify(['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page']),
    tagline: 'Your mind is the scene of the crime.',
    synopsis: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.',
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
    genres: JSON.stringify(['Adventure', 'Drama', 'Science Fiction']),
    cast_members: JSON.stringify(['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain']),
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    synopsis: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    image_url: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    image_blurred_url: null,
    tmdb_id: 157336,
    imdb_id: 'tt0816692',
  },
  {
    title: 'The Dark Knight',
    title_aliases: JSON.stringify(['Dark Knight']),
    year: 2008,
    director: 'Christopher Nolan',
    genres: JSON.stringify(['Action', 'Crime', 'Drama']),
    cast_members: JSON.stringify(['Christian Bale', 'Heath Ledger', 'Aaron Eckhart']),
    tagline: 'Why so serious?',
    synopsis: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
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
    genres: JSON.stringify(['Comedy', 'Drama', 'Romance']),
    cast_members: JSON.stringify(['Tom Hanks', 'Robin Wright', 'Gary Sinise']),
    tagline: 'Life is like a box of chocolates…you never know what you\'re gonna get.',
    synopsis: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold through the perspective of an Alabama man with an IQ of 75.',
    image_url: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
    image_blurred_url: null,
    tmdb_id: 13,
    imdb_id: 'tt0109830',
  },
  {
    title: 'The Matrix',
    title_aliases: JSON.stringify(['Matrix']),
    year: 1999,
    director: 'Lana Wachowski',
    genres: JSON.stringify(['Action', 'Science Fiction']),
    cast_members: JSON.stringify(['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss']),
    tagline: 'Free your mind.',
    synopsis: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    image_url: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    image_blurred_url: null,
    tmdb_id: 603,
    imdb_id: 'tt0133093',
  },
  {
    title: 'Spirited Away',
    title_aliases: JSON.stringify(['Sen to Chihiro no Kamikakushi', 'Le Voyage de Chihiro']),
    year: 2001,
    director: 'Hayao Miyazaki',
    genres: JSON.stringify(['Animation', 'Fantasy', 'Family']),
    cast_members: JSON.stringify(['Daveigh Chase', 'Suzanne Pleshette', 'Miyu Irino']),
    tagline: 'The tunnel led Chihiro to a mysterious town.',
    synopsis: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.',
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
    genres: JSON.stringify(['Drama', 'Thriller', 'Comedy']),
    cast_members: JSON.stringify(['Kang-ho Song', 'Sun-kyun Lee', 'Yeo-jeong Cho']),
    tagline: 'Act like you own the place.',
    synopsis: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    image_url: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    image_blurred_url: null,
    tmdb_id: 496243,
    imdb_id: 'tt6751668',
  },
  {
    title: 'Goodfellas',
    title_aliases: JSON.stringify(['Good Fellas', 'Les Affranchis']),
    year: 1990,
    director: 'Martin Scorsese',
    genres: JSON.stringify(['Crime', 'Drama']),
    cast_members: JSON.stringify(['Ray Liotta', 'Robert De Niro', 'Joe Pesci']),
    tagline: 'Three decades of life in the mafia.',
    synopsis: 'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito.',
    image_url: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
    image_blurred_url: null,
    tmdb_id: 769,
    imdb_id: 'tt0099685',
  },
  {
    title: 'Fight Club',
    title_aliases: JSON.stringify(['Le Fight Club']),
    year: 1999,
    director: 'David Fincher',
    genres: JSON.stringify(['Drama', 'Thriller']),
    cast_members: JSON.stringify(['Brad Pitt', 'Edward Norton', 'Helena Bonham Carter']),
    tagline: 'Mischief. Mayhem. Soap.',
    synopsis: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.',
    image_url: '/pB8BM7pdSp6B3DbRiSL7F5yKMnH.jpg',
    image_blurred_url: null,
    tmdb_id: 550,
    imdb_id: 'tt0137523',
  },
  {
    title: 'Schindler\'s List',
    title_aliases: JSON.stringify(['La Liste de Schindler']),
    year: 1993,
    director: 'Steven Spielberg',
    genres: JSON.stringify(['Drama', 'History', 'War']),
    cast_members: JSON.stringify(['Liam Neeson', 'Ralph Fiennes', 'Ben Kingsley']),
    tagline: 'Whoever saves one life, saves the world entire.',
    synopsis: 'In German-occupied Poland during World War II, Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.',
    image_url: '/sF1U4EUQS8udIMY7bdEliEBurek.jpg',
    image_blurred_url: null,
    tmdb_id: 424,
    imdb_id: 'tt0108052',
  },
  {
    title: 'The Lord of the Rings: The Return of the King',
    title_aliases: JSON.stringify(['Le Retour du Roi', 'LOTR 3', 'Return of the King']),
    year: 2003,
    director: 'Peter Jackson',
    genres: JSON.stringify(['Adventure', 'Fantasy', 'Action']),
    cast_members: JSON.stringify(['Elijah Wood', 'Viggo Mortensen', 'Ian McKellen']),
    tagline: 'The eye of the enemy is moving.',
    synopsis: 'Gandalf and Aragorn lead the World of Men against Sauron\'s army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.',
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
        hint_schedule: JSON.stringify([
          'image_blurred',
          'year',
          'director',
          'genres',
          'cast',
          'tagline',
          'synopsis',
        ]),
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
