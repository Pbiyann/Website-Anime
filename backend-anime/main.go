package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	_ "modernc.org/sqlite"
)

type Anime struct {
	ID       int    `json:"id"`
	Judul    string `json:"judul"`
	Episode  int    `json:"episode"`
	Genre    string `json:"genre"`
	Sinopsis string `json:"sinopsis"`
}

var db *sql.DB

func initDB() {
	var err error
	db, err = sql.Open("sqlite", "anime.db")
	if err != nil {
		log.Fatal(err)
	}

	createTableSQL := `CREATE TABLE IF NOT EXISTS animes (
		"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		"judul" TEXT,
		"episode" INTEGER,
		"genre" TEXT,
		"sinopsis" TEXT
	);`
	db.Exec(createTableSQL)

	var count int
	db.QueryRow("SELECT COUNT(*) FROM animes").Scan(&count)

	if count == 0 {
		insertDataAwal()
	}
}

func insertDataAwal() {
	insertSQL := `INSERT INTO animes (judul, episode, genre, sinopsis) VALUES (?, ?, ?, ?)`
	stmt, _ := db.Prepare(insertSQL)
	defer stmt.Close()

	daftarAnime := []Anime{
		{Judul: "Solo Leveling", Episode: 12, Genre: "Action, Fantasy", Sinopsis: "Sepuluh tahun lalu, gerbang yang menghubungkan dunia manusia dengan dunia monster terbuka..."},
		{Judul: "Frieren", Episode: 28, Genre: "Adventure, Drama", Sinopsis: "Kisah penyihir elf bernama Frieren..."},
	}

	for _, a := range daftarAnime {
		stmt.Exec(a.Judul, a.Episode, a.Genre, a.Sinopsis)
	}
}

// Endpoint GET: Mengambil SEMUA data, pencarian judul, atau filter genre
func getAnimes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	searchQuery := r.URL.Query().Get("q")
	genreQuery := r.URL.Query().Get("genre") // Menangkap kata kunci genre dari URL

	var rows *sql.Rows
	var err error

	// Logika baru: Jika ada pencarian judul, cari judul. Jika ada genre, filter genre.
	if searchQuery != "" {
		rows, err = db.Query("SELECT id, judul, episode, genre, sinopsis FROM animes WHERE judul LIKE ?", "%"+searchQuery+"%")
	} else if genreQuery != "" {
		rows, err = db.Query("SELECT id, judul, episode, genre, sinopsis FROM animes WHERE genre LIKE ?", "%"+genreQuery+"%")
	} else {
		rows, err = db.Query("SELECT id, judul, episode, genre, sinopsis FROM animes")
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var animes []Anime
	for rows.Next() {
		var a Anime
		rows.Scan(&a.ID, &a.Judul, &a.Episode, &a.Genre, &a.Sinopsis)
		animes = append(animes, a)
	}

	if animes == nil {
		animes = []Anime{}
	}
	json.NewEncoder(w).Encode(animes)
}

// Endpoint GET: Mengambil SATU anime
func getAnimeByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	idParam := r.PathValue("id")
	id, _ := strconv.Atoi(idParam)

	var a Anime
	err := db.QueryRow("SELECT id, judul, episode, genre, sinopsis FROM animes WHERE id = ?", id).Scan(&a.ID, &a.Judul, &a.Episode, &a.Genre, &a.Sinopsis)

	if err != nil {
		http.Error(w, `{"message": "Tidak ditemukan"}`, http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(a)
}

// Endpoint POST: Menambahkan anime BARU ke database
func createAnime(w http.ResponseWriter, r *http.Request) {
	// Mengatur CORS (wajib agar Next.js diizinkan mengirim data)
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Menangani preflight request dari browser
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var a Anime
	json.NewDecoder(r.Body).Decode(&a)

	insertSQL := `INSERT INTO animes (judul, episode, genre, sinopsis) VALUES (?, ?, ?, ?)`
	result, err := db.Exec(insertSQL, a.Judul, a.Episode, a.Genre, a.Sinopsis)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	a.ID = int(id)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(a)
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("GET /api/animes", getAnimes)
	http.HandleFunc("GET /api/animes/{id}", getAnimeByID)

	// Daftarkan jalur endpoint POST yang baru
	http.HandleFunc("POST /api/animes", createAnime)
	http.HandleFunc("OPTIONS /api/animes", createAnime) // Menangani CORS

	fmt.Println("Server API berjalan di http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
