import './globals.css';

export const metadata = {
  title: 'NontonAnime - Streaming Anime Lengkap',
  description: 'Web streaming anime minimalis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-neutral-950 text-white min-h-screen flex flex-col">
        
        {/* NAVBAR GLOBAL */}
        <nav className="bg-neutral-900 border-b border-neutral-800 p-4 sticky top-0 z-50 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-red-500">
              Nonton<span className="text-white">Anime</span>
            </a>
            
            <div className="hidden md:flex gap-6 text-sm font-medium">
              <a href="/" className="hover:text-red-500 transition-colors">Beranda</a>
              <a href="#" className="hover:text-red-500 transition-colors">Jadwal Rilis</a>
              <a href="/genre" className="hover:text-red-500 transition-colors">Genre</a>
            </div>

            <div className="hidden sm:block">
              {/* Form diarahkan ke /search */}
              <form action="/search" method="GET">
                <input 
                  name="q"
                  type="text" 
                  placeholder="Cari anime..." 
                  className="px-4 py-1.5 rounded-full bg-neutral-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </form>
            </div>
          </div>
        </nav>

        {/* KONTEN HALAMAN UTAMA */}
        <main className="flex-grow container mx-auto p-4 sm:p-8">
          {children}
        </main>

        {/* FOOTER GLOBAL */}
        <footer className="bg-neutral-900 border-t border-neutral-800 p-6 text-center text-neutral-500 text-sm mt-8">
          <p>&copy; 2026 NontonAnime. Dibuat untuk belajar Next.js & Golang.</p>
        </footer>

      </body>
    </html>
  );
}