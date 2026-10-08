import Link from 'next/link';

export default async function Home() {
  // Menarik data langsung dari server Golang dan SQLite
  const res = await fetch('http://localhost:8080/api/animes', { cache: 'no-store' });
  const daftarAnime = await res.json();

  return (
    <>
      <h2 className="text-xl font-semibold mb-6 border-l-4 border-red-500 pl-3">Rilis Terbaru</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        
        {daftarAnime.map((anime: any) => (
          <Link 
            key={anime.id} 
            href={`/anime/${anime.id}`} 
            className="bg-neutral-900 rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:shadow-red-500/20 block cursor-pointer"
          >
            <div className="h-64 bg-neutral-800 flex items-center justify-center">
              <span className="text-neutral-500 text-sm px-2 text-center">Poster {anime.judul}</span>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-base truncate">{anime.judul}</h3>
              <p className="text-sm text-neutral-400 mt-1">Episode {anime.episode}</p>
            </div>
          </Link>
        ))}

      </div>
    </>
  );
}