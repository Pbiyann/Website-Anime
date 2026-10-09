'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  
  const [judul, setJudul] = useState('');
  const [episode, setEpisode] = useState('');
  // State genre diubah menjadi Array untuk menampung lebih dari 1 pilihan
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sinopsis, setSinopsis] = useState('');
  const [gambar, setGambar] = useState('');
  const [loading, setLoading] = useState(false);

  const daftarGenre = [
    'Action', 'Adventure', 'Comedy', 'Demons',
    'Drama', 'Ecchi', 'Fantasy', 'Game',
    'Harem', 'Historical', 'Horror', 'Josei',
    'Magic', 'Martial Arts', 'Mecha', 'Military',
    'Music', 'Mystery', 'Psychological', 'Parody',
    'Police', 'Romance', 'Samurai', 'School',
    'Sci-Fi', 'Seinen', 'Shoujo', 'Shoujo Ai',
    'Shounen', 'Slice of Life', 'Sports', 'Space',
    'Super Power', 'Supernatural', 'Thriller', 'Vampire'
  ];

  // Fungsi untuk mengatur sistem centang (check/uncheck)
  const handleGenreToggle = (genrePilihan: string) => {
    if (selectedGenres.includes(genrePilihan)) {
      // Hapus dari daftar jika centangnya dihilangkan
      setSelectedGenres(selectedGenres.filter((g) => g !== genrePilihan));
    } else {
      // Tambahkan ke daftar jika dicentang
      setSelectedGenres([...selectedGenres, genrePilihan]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi agar pengguna tidak lupa memilih genre
    if (selectedGenres.length === 0) {
      alert('Tolong pilih minimal 1 genre!');
      return;
    }

    setLoading(true);

    const dataBaru = {
      judul: judul,
      episode: parseInt(episode),
      genre: selectedGenres.join(', '), // Menggabungkan array menjadi teks: "Action, Comedy"
      sinopsis: sinopsis,
      gambar: gambar
    };

    try {
      const res = await fetch('http://localhost:8080/api/animes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataBaru)
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(result.error || 'Tidak dapat menyimpan anime. Login admin diperlukan.');
        return;
      }
      alert('Yey! Anime baru berhasil ditambahkan.');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-neutral-900 p-8 rounded-xl border border-neutral-800 my-10">
      <h1 className="text-2xl font-bold mb-6 text-red-500 border-b border-neutral-800 pb-4">Tambah Anime Baru</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        <div>
          <label className="block text-sm font-medium mb-2">Judul Anime</label>
          <input 
            type="text" required placeholder="Cth: Naruto Shippuden"
            value={judul} onChange={(e) => setJudul(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Total Episode</label>
            <input
              type="number" required placeholder="Cth: 500"
              value={episode} onChange={(e) => setEpisode(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">URL Gambar (Link Poster)</label>
            <input
              type="url" required placeholder="Cth: https://.../gambar.jpg"
              value={gambar} onChange={(e) => setGambar(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Area Kotak Centang Genre */}
        <div>
          <label className="block text-sm font-medium mb-3">Kategori Genre (Bisa pilih lebih dari satu)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-800 p-4 rounded-lg border border-neutral-700">
            {daftarGenre.map((g) => (
              <label key={g} className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedGenres.includes(g)}
                  onChange={() => handleGenreToggle(g)}
                  className="w-4 h-4 accent-red-500 cursor-pointer"
                />
                <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">{g}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sinopsis Cerita</label>
          <textarea 
            required rows={5} placeholder="Ceritakan sedikit tentang anime ini..."
            value={sinopsis} onChange={(e) => setSinopsis(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
          ></textarea>
        </div>

        <button 
          type="submit" disabled={loading}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-lg transition-colors disabled:opacity-50 text-lg shadow-lg shadow-red-500/20"
        >
          {loading ? 'Menyimpan...' : 'Simpan Anime ke Database'}
        </button>
      </form>
    </div>
  );
}