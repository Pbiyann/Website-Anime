import Link from 'next/link';

export const instant = false;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // Tunggu kata kunci dari URL siap
  const { q } = await searchParams;
  
  // Format parameter ke alamat Golang
  const queryUrl = q ? `?${new URLSearchParams({ q })}` : "";
  
  // Menarik hasil pencarian spesifik dari server Golang
  const res = await fetch(`http://localhost:8080/api/animes${queryUrl}`, { cache: 'no-store' });
  const daftarAnime = await res.json();

  return (
    <>
      {/* Tombol Kembali */}
      <div className="mb-6">
        <a href="/" className="text-neutral-400 hover:text-red-500 font-medium transition-colors">
          &larr; Kembali ke Beranda
        </a>
      </div>

      <h2 className="text-xl font-semibold mb-6 border-l-4 border-red-500 pl-3">
        Hasil Pencarian: "{q}"
      </h2>
      
      {/* Jika hasil pencarian kosong */}
      {daftarAnime.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
          <p className="text-lg">Yah, anime "{q}" tidak ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {/* Jika hasil pencarian ada */}
          {daftarAnime.map((anime: any) => (
            <Link 
              key={anime.id} 
              href={`/anime/${anime.id}`} 
              className="bg-neutral-900 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:shadow-red-500/20 block cursor-pointer"
            >
              <div className="h-64 bg-neutral-800 relative overflow-hidden">
                <img
                  src={anime.gambar || `https://placehold.co/400x600/1a1a1a/red?text=${encodeURIComponent(anime.judul)}`}
                  alt={`Poster ${anime.judul}`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-base truncate">{anime.judul}</h3>
                <p className="text-sm text-neutral-400 mt-1">Episode {anime.episode}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}