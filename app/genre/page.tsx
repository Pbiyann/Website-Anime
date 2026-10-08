import Link from 'next/link';

export default function GenrePage() {
  // Daftar genre yang tersedia
  const daftarGenre = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Supernatural', 'Historical'];

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-8 border-l-4 border-red-500 pl-3">Pilih Kategori Genre</h2>
      
      <div className="flex flex-wrap gap-4">
        {daftarGenre.map((genre) => (
          <Link 
            key={genre} 
            href={`/genre/${genre}`} 
            className="bg-neutral-900 border border-neutral-800 hover:border-red-500 hover:bg-red-600/10 px-6 py-4 rounded-xl text-lg font-medium transition-all hover:scale-105"
          >
            {genre}
          </Link>
        ))}
      </div>
    </div>
  );
}