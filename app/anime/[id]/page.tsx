export default async function AnimeDetail({ params }: { params: Promise<{ id: string }> }) {
  // Tunggu parameter URL siap
  const { id } = await params;

  // Memanggil endpoint Golang
  const res = await fetch(`http://localhost:8080/api/animes/${id}`);

  if (!res.ok) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold text-white mb-4">404 - Anime Tidak Ditemukan</h1>
        <a href="/" className="text-red-500 hover:underline">Kembali ke Beranda</a>
      </div>
    );
  }

  const anime = await res.json();

  return (
    <div className="max-w-5xl mx-auto">
      
      {/* Tombol Kembali */}
      <div className="mb-6">
        <a href="/" className="text-neutral-400 hover:text-red-500 font-medium transition-colors">
          &larr; Kembali ke Beranda
        </a>
      </div>

      {/* Area Pemutar Video Asli (HTML5 Video Player) */}
      <div className="w-full aspect-video bg-black rounded-xl border border-neutral-800 shadow-2xl overflow-hidden mb-8">
        <video 
          controls 
          autoPlay
          className="w-full h-full focus:outline-none"
        >
          {/* Tautan video contoh (Dummy MP4) */}
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
          Maaf, browser kamu tidak mendukung pemutaran video.
        </video>
      </div>

      {/* Informasi Detail Anime */}
      <div className="bg-neutral-900 p-6 md:p-8 rounded-xl border border-neutral-800">
        <h1 className="text-3xl font-bold mb-3">{anime.judul}</h1>
        
        <div className="flex flex-wrap gap-4 text-sm text-neutral-400 mb-6">
          <span className="bg-neutral-800 px-3 py-1 rounded-full text-white">Episode {anime.episode}</span>
          <span className="flex items-center">{anime.genre}</span>
          <span className="flex items-center">HD 1080p</span>
        </div>
        
        <h2 className="text-lg font-semibold mb-2 text-white border-b border-neutral-800 pb-2">Sinopsis</h2>
        <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
          {anime.sinopsis}
        </p>
      </div>

    </div>
  );
}