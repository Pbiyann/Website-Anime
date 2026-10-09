import Link from 'next/link';

export const instant = false;

async function DaftarAnime() {
  try {
    const res = await fetch('http://localhost:8080/api/animes', { cache: 'no-store' });
    if (!res.ok) throw new Error('Gagal mengambil daftar anime');

    const daftarAnime = await res.json();

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {daftarAnime.map((anime: any) => (
          <Link
            key={anime.id}
            href={`/anime/${anime.id}`}
            className="bg-neutral-900 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:shadow-red-500/20 block cursor-pointer group"
          >
            <div className="h-64 bg-neutral-800 relative overflow-hidden">
              <img
                src={anime.gambar || `https://placehold.co/400x600/1a1a1a/red?text=${anime.judul}`}
                alt={`Poster ${anime.judul}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-base truncate">{anime.judul}</h3>
              <p className="text-sm text-neutral-400 mt-1">Episode {anime.episode}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  } catch {
    return (
      <p className="text-neutral-400">
        Daftar anime tidak dapat dimuat. Pastikan server API berjalan di port 8080.
      </p>
    );
  }
}

export default async function Home() {
  return (
    <>
      <h2 className="text-xl font-semibold mb-6 border-l-4 border-red-500 pl-3">Rilis Terbaru</h2>
      {await DaftarAnime()}
    </>
  );
}