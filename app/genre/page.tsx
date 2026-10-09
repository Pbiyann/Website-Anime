import Link from 'next/link';

export const instant = false;

type Anime = {
  id: number;
  judul: string;
  episode: number;
  gambar: string;
};

const daftarGenre = [
  'Action', 'Adventure', 'Comedy', 'Demons',
  'Drama', 'Ecchi', 'Fantasy', 'Game',
  'Harem', 'Historical', 'Horror', 'Josei',
  'Magic', 'Martial Arts', 'Mecha', 'Military',
  'Music', 'Mystery', 'Psychological', 'Parody',
  'Police', 'Romance', 'Samurai', 'School',
  'Sci-Fi', 'Seinen', 'Shoujo', 'Shoujo Ai',
  'Shounen', 'Slice of Life', 'Sports', 'Space',
  'Super Power', 'Supernatural', 'Thriller', 'Vampire',
];

function parseGenres(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) => item.split(',')).map((item) => item.trim()).filter(Boolean);
}

export default async function GenrePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string | string[]; genreText?: string | string[] }>;
}) {
  const { genre: rawGenres, genreText: rawGenreText } = await searchParams;
  const selectedGenres = parseGenres(rawGenres);
  const typedGenres = parseGenres(rawGenreText);
  const genres = Array.from(
    new Map([...selectedGenres, ...typedGenres].map((item) => [item.toLocaleLowerCase(), item])).values(),
  );
  const selectedGenreSet = new Set(selectedGenres.map((item) => item.toLocaleLowerCase()));
  const genre = genres.join(', ');
  let daftarAnime: Anime[] = [];

  if (genres.length > 0) {
    const query = new URLSearchParams({ genre });
    const response = await fetch(`http://localhost:8080/api/animes?${query}`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Gagal mencari anime berdasarkan genre');
    daftarAnime = await response.json();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 border-l-4 border-red-500 pl-3">
        Cari Anime Berdasarkan Genre
      </h2>

      <form action="/genre" method="GET" className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="search"
            name="genreText"
            defaultValue={typedGenres.join(', ')}
            placeholder="Pisahkan genre dengan koma, contoh: Action, Fantasy"
            aria-label="Cari genre"
            className="flex-1 px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-lg bg-red-600 hover:bg-red-500 font-semibold transition-colors"
          >
            Cari genre
          </button>
        </div>

        <fieldset>
          <legend className="sr-only">Pilih beberapa genre</legend>
          <div className="flex flex-wrap gap-2">
            {daftarGenre.map((item) => (
              <label key={item} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="genre"
                  value={item}
                  defaultChecked={selectedGenreSet.has(item.toLocaleLowerCase())}
                  className="peer sr-only"
                />
                <span className="inline-flex px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 hover:border-red-500 peer-checked:border-red-500 peer-checked:bg-red-600/20 peer-checked:text-red-300 peer-focus-visible:ring-2 peer-focus-visible:ring-red-400 transition-colors">
                  {item}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      {genres.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold mb-5">
            Hasil untuk &quot;{genre}&quot;
          </h3>
          {daftarAnime.length === 0 ? (
            <p className="text-neutral-400">Belum ada anime dengan genre tersebut.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {daftarAnime.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.id}`}
                  className="bg-neutral-900 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:shadow-red-500/20 block group"
                >
                  <div className="h-64 bg-neutral-800 relative overflow-hidden">
                    <img
                      src={anime.gambar || `https://placehold.co/400x600/1a1a1a/red?text=${encodeURIComponent(anime.judul)}`}
                      alt={`Poster ${anime.judul}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-base truncate">{anime.judul}</h4>
                    <p className="text-sm text-neutral-400 mt-1">Episode {anime.episode}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}