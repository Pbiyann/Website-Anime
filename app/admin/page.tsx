'use client'; // Wajib ada karena kita menggunakan interaksi form dan state

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  
  // State untuk menyimpan ketikan user
  const [judul, setJudul] = useState('');
  const [episode, setEpisode] = useState('');
  const [genre, setGenre] = useState('');
  const [sinopsis, setSinopsis] = useState('');
  const [loading, setLoading] = useState(false);

  // Fungsi saat tombol simpan ditekan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataBaru = {
      judul: judul,
      episode: parseInt(episode),
      genre: genre,
      sinopsis: sinopsis
    };

    try {
      const res = await fetch('http://localhost:8080/api/animes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataBaru)
      });

      if (res.ok) {
        alert('Yey! Anime baru berhasil ditambahkan.');
        router.push('/'); // Kembali ke beranda
        router.refresh(); // Refresh data beranda
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-neutral-900 p-8 rounded-xl border border-neutral-800">
      <h1 className="text-2xl font-bold mb-6 text-red-500">Tambah Anime Baru</h1>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium mb-2">Judul Anime</label>
          <input 
            type="text" required
            value={judul} onChange={(e) => setJudul(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Total Episode</label>
            <input 
              type="number" required
              value={episode} onChange={(e) => setEpisode(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Genre</label>
            <input 
              type="text" required placeholder="Cth: Action, Comedy"
              value={genre} onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sinopsis</label>
          <textarea 
            required rows={4}
            value={sinopsis} onChange={(e) => setSinopsis(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
          ></textarea>
        </div>

        <button 
          type="submit" disabled={loading}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Simpan ke Database'}
        </button>
      </form>
    </div>
  );
}