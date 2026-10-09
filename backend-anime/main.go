package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

type Anime struct {
	ID       int    `json:"id"`
	Judul    string `json:"judul"`
	Episode  int    `json:"episode"`
	Genre    string `json:"genre"`
	Sinopsis string `json:"sinopsis"`
	Gambar   string `json:"gambar"`
}

type AuthCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type AuthUser struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

const sessionCookieName = "anime_session"

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
		"sinopsis" TEXT,
		"gambar" TEXT
	);`
	db.Exec(createTableSQL)
	for _, statement := range []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL COLLATE NOCASE UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL CHECK (role IN ('user', 'admin'))
		);`,
		`CREATE TABLE IF NOT EXISTS sessions (
			token_hash TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL
		);`,
	} {
		if _, err := db.Exec(statement); err != nil {
			log.Fatal(err)
		}
	}

	var hasGambar bool
	if err := db.QueryRow("SELECT EXISTS (SELECT 1 FROM pragma_table_info('animes') WHERE name = 'gambar')").Scan(&hasGambar); err != nil {
		log.Fatal(err)
	}
	if !hasGambar {
		if _, err := db.Exec("ALTER TABLE animes ADD COLUMN gambar TEXT"); err != nil {
			log.Fatal(err)
		}
	}

	var count int
	db.QueryRow("SELECT COUNT(*) FROM animes").Scan(&count)

	if count == 0 {
		insertDataAwal()
	}
	perbaruiPosterKosong()
	ensureAdminAccount()
}

func ensureAdminAccount() {
	username := normalizeUsername(os.Getenv("ADMIN_USERNAME"))
	password := os.Getenv("ADMIN_PASSWORD")
	if username == "" && password == "" {
		log.Println("Admin login disabled; set ADMIN_USERNAME and ADMIN_PASSWORD to enable it")
		return
	}
	if !validUsername(username) || len(password) < 12 || len(password) > 72 {
		log.Fatal("ADMIN_USERNAME must be 3-32 letters, numbers, dots, underscores, or hyphens, and ADMIN_PASSWORD must be 12-72 bytes")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}
	_, err = db.Exec(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')
		ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = 'admin'`, username, string(passwordHash))
	if err != nil {
		log.Fatal(err)
	}
}

func normalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

func validUsername(username string) bool {
	if len(username) < 3 || len(username) > 32 {
		return false
	}
	for _, char := range username {
		if (char < 'a' || char > 'z') && (char < '0' || char > '9') && char != '.' && char != '_' && char != '-' {
			return false
		}
	}
	return true
}

func writeAuthError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func setSession(w http.ResponseWriter, user AuthUser) error {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return err
	}
	token := base64.RawURLEncoding.EncodeToString(tokenBytes)
	tokenHash := sha256.Sum256([]byte(token))
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	if _, err := db.Exec("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", hex.EncodeToString(tokenHash[:]), user.ID, expiresAt.Unix()); err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		Secure:   strings.EqualFold(os.Getenv("COOKIE_SECURE"), "true"),
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func sessionUser(r *http.Request) (AuthUser, bool) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		return AuthUser{}, false
	}
	tokenHash := sha256.Sum256([]byte(cookie.Value))
	var user AuthUser
	err = db.QueryRow(`SELECT users.id, users.username, users.role
		FROM sessions JOIN users ON users.id = sessions.user_id
		WHERE sessions.token_hash = ? AND sessions.expires_at > ?`, hex.EncodeToString(tokenHash[:]), time.Now().Unix()).Scan(&user.ID, &user.Username, &user.Role)
	return user, err == nil
}

func registerUser(w http.ResponseWriter, r *http.Request) {
	var credentials AuthCredentials
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&credentials); err != nil {
		writeAuthError(w, http.StatusBadRequest, "Data pendaftaran tidak valid")
		return
	}
	username := normalizeUsername(credentials.Username)
	if !validUsername(username) || len(credentials.Password) < 8 || len(credentials.Password) > 72 {
		writeAuthError(w, http.StatusBadRequest, "Username harus 3-32 karakter dan password 8-72 byte")
		return
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(credentials.Password), bcrypt.DefaultCost)
	if err != nil {
		writeAuthError(w, http.StatusInternalServerError, "Tidak dapat membuat akun")
		return
	}
	result, err := db.Exec("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')", username, string(passwordHash))
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique constraint") {
			writeAuthError(w, http.StatusConflict, "Username sudah digunakan")
			return
		}
		writeAuthError(w, http.StatusInternalServerError, "Tidak dapat membuat akun")
		return
	}
	userID, err := result.LastInsertId()
	if err != nil {
		writeAuthError(w, http.StatusInternalServerError, "Tidak dapat membuat sesi")
		return
	}
	user := AuthUser{ID: int(userID), Username: username, Role: "user"}
	if err := setSession(w, user); err != nil {
		writeAuthError(w, http.StatusInternalServerError, "Tidak dapat membuat sesi")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]AuthUser{"user": user})
}

func loginUser(w http.ResponseWriter, r *http.Request) {
	var credentials AuthCredentials
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&credentials); err != nil {
		writeAuthError(w, http.StatusBadRequest, "Data login tidak valid")
		return
	}
	username := normalizeUsername(credentials.Username)
	role := strings.ToLower(strings.TrimSpace(credentials.Role))
	if role != "user" && role != "admin" {
		writeAuthError(w, http.StatusBadRequest, "Pilih jenis akun yang valid")
		return
	}
	var user AuthUser
	var passwordHash string
	err := db.QueryRow("SELECT id, username, role, password_hash FROM users WHERE username = ?", username).Scan(&user.ID, &user.Username, &user.Role, &passwordHash)
	if err != nil || user.Role != role || bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(credentials.Password)) != nil {
		writeAuthError(w, http.StatusUnauthorized, "Username, password, atau jenis akun salah")
		return
	}
	if err := setSession(w, user); err != nil {
		writeAuthError(w, http.StatusInternalServerError, "Tidak dapat membuat sesi")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]AuthUser{"user": user})
}

func getSession(w http.ResponseWriter, r *http.Request) {
	user, ok := sessionUser(r)
	if !ok {
		writeAuthError(w, http.StatusUnauthorized, "Sesi tidak valid atau sudah berakhir")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]AuthUser{"user": user})
}

func logoutUser(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		tokenHash := sha256.Sum256([]byte(cookie.Value))
		db.Exec("DELETE FROM sessions WHERE token_hash = ?", hex.EncodeToString(tokenHash[:]))
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: strings.EqualFold(os.Getenv("COOKIE_SECURE"), "true"), SameSite: http.SameSiteLaxMode})
	w.WriteHeader(http.StatusNoContent)
}

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigin := strings.TrimSpace(os.Getenv("WEB_ORIGIN"))
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:3000"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Add("Vary", "Origin")
		} else if origin != "" {
			http.Error(w, "Origin tidak diizinkan", http.StatusForbidden)
			return
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func insertDataAwal() {
	insertSQL := `INSERT INTO animes (judul, episode, genre, sinopsis, gambar) VALUES (?, ?, ?, ?, ?)`
	stmt, _ := db.Prepare(insertSQL)
	defer stmt.Close()

	daftarAnime := []Anime{
		{Judul: "Solo Leveling", Episode: 12, Genre: "Action, Fantasy", Sinopsis: "Sepuluh tahun lalu, gerbang yang menghubungkan dunia manusia dengan dunia monster terbuka...", Gambar: "https://m.media-amazon.com/images/M/MV5BZDc2Zjg2NjItYjExZi00NDZhLTk5MWItYzc1YWFkOWY4MzJkXkEyXkFqcGc@._V1_.jpg"},
		{Judul: "Frieren", Episode: 28, Genre: "Adventure, Drama", Sinopsis: "Kisah penyihir elf bernama Frieren...", Gambar: "https://m.media-amazon.com/images/M/MV5BMjY5OGNiZmQtZDk5OC00N2I2LWEyOGEtN2FlY2EzOGVlZjlmXkEyXkFqcGc@._V1_.jpg"},
		{Judul: "Jujutsu Kaisen", Episode: 47, Genre: "Action, Supernatural", Sinopsis: "Yuji Itadori menelan jari roh kutukan...", Gambar: "https://m.media-amazon.com/images/I/81U+J-esnJS._AC_SY300_SX300_QL70_FMwebp_.jpg"},
		{Judul: "One Piece", Episode: 1100, Genre: "Adventure, Comedy", Sinopsis: "Monkey D. Luffy memulai perjalanannya mengarungi Grand Line...", Gambar: "https://m.media-amazon.com/images/M/MV5BMTNjNGU4NTUtYmVjMy00YjRiLTkxMWUtNzZkMDNiYjZhNmViXkEyXkFqcGc@._V1_.jpg"},
		{Judul: "Demon Slayer", Episode: 55, Genre: "Action, Historical", Sinopsis: "Tanjiro Kamado bergabung dengan Pasukan Pembasmi Iblis...", Gambar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSeIFwGioZgPM-IPgO2r1pHfzB8ZP4v_7ZfUSvbQfJjOqtc0TUhDMuRDbc&s=10"},
		{Judul: "Attack on Titan", Episode: 89, Genre: "Action, Dark Fantasy", Sinopsis: "Umat manusia bersembunyi di balik tembok raksasa...", Gambar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzXj-q00eWf9jv65bMm-KxV64MIBaMfr4wSMvKgop8Kg&s"},
	}

	for _, a := range daftarAnime {
		stmt.Exec(a.Judul, a.Episode, a.Genre, a.Sinopsis, a.Gambar)
	}
}

func perbaruiPosterKosong() {
	posterAnime := []Anime{
		{Judul: "Solo Leveling", Gambar: "https://i.ebayimg.com/images/g/CfsAAeSwJmFpQWUH/s-l1600.jpg"},
		{Judul: "Frieren", Gambar: "https://i5.walmartimages.com/seo/Frieren-Beyond-Journey-s-End-Key-Art-Wall-Poster-14-725-x-22-375_2716ee0b-2458-48dc-a6f7-e33f7c86a5f4.adb246ce6aa965b51e2e6848574c97ab.jpeg?odnHeight=573&odnWidth=573&odnBg=FFFFFF"},
		{Judul: "Jujutsu Kaisen", Gambar: "https://m.media-amazon.com/images/I/81U+J-esnJS._AC_SY300_SX300_QL70_FMwebp_.jpg"},
		{Judul: "One Piece", Gambar: "https://m.media-amazon.com/images/M/MV5BMTNjNGU4NTUtYmVjMy00YjRiLTkxMWUtNzZkMDNiYjZhNmViXkEyXkFqcGc@._V1_.jpg"},
		{Judul: "Demon Slayer", Gambar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSeIFwGioZgPM-IPgO2r1pHfzB8ZP4v_7ZfUSvbQfJjOqtc0TUhDMuRDbc&s=10"},
		{Judul: "Attack on Titan", Gambar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzXj-q00eWf9jv65bMm-KxV64MIBaMfr4wSMvKgop8Kg&s"},
	}

	stmt, err := db.Prepare("UPDATE animes SET gambar = ? WHERE judul = ? AND (gambar IS NULL OR gambar = '')")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	for _, anime := range posterAnime {
		if _, err := stmt.Exec(anime.Gambar, anime.Judul); err != nil {
			log.Fatal(err)
		}
	}
}

// Endpoint GET: Mengambil SEMUA data, pencarian judul, atau filter genre
func getAnimes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	searchQuery := r.URL.Query().Get("q")
	genreQuery := r.URL.Query().Get("genre") // Menangkap kata kunci genre dari URL

	var rows *sql.Rows
	var err error

	// Logika baru: Jika ada pencarian judul, cari judul. Jika ada genre, filter genre.
	if searchQuery != "" {
		rows, err = db.Query("SELECT id, judul, episode, genre, sinopsis, gambar FROM animes WHERE judul LIKE ?", "%"+searchQuery+"%")
	} else if genreQuery != "" {
		conditions := make([]string, 0)
		args := make([]any, 0)
		for _, genre := range strings.Split(genreQuery, ",") {
			genre = strings.TrimSpace(genre)
			if genre == "" {
				continue
			}
			conditions = append(conditions, "genre LIKE ?")
			args = append(args, "%"+genre+"%")
		}

		if len(conditions) == 0 {
			rows, err = db.Query("SELECT id, judul, episode, genre, sinopsis, gambar FROM animes")
		} else {
			query := "SELECT id, judul, episode, genre, sinopsis, gambar FROM animes WHERE " + strings.Join(conditions, " OR ")
			rows, err = db.Query(query, args...)
		}
	} else {
		rows, err = db.Query("SELECT id, judul, episode, genre, sinopsis, gambar FROM animes")
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var animes []Anime
	for rows.Next() {
		var a Anime
		rows.Scan(&a.ID, &a.Judul, &a.Episode, &a.Genre, &a.Sinopsis, &a.Gambar)
		animes = append(animes, a)
	}

	if animes == nil {
		animes = []Anime{}
	}
	json.NewEncoder(w).Encode(animes)
}

// Endpoint GET: Mengambil SATU anime
func getAnimeByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	idParam := r.PathValue("id")
	id, _ := strconv.Atoi(idParam)

	var a Anime
	err := db.QueryRow("SELECT id, judul, episode, genre, sinopsis, gambar FROM animes WHERE id = ?", id).Scan(&a.ID, &a.Judul, &a.Episode, &a.Genre, &a.Sinopsis, &a.Gambar)

	if err != nil {
		http.Error(w, `{"message": "Tidak ditemukan"}`, http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(a)
}

// Endpoint POST: Menambahkan anime BARU ke database
func createAnime(w http.ResponseWriter, r *http.Request) {
	user, authenticated := sessionUser(r)
	if !authenticated {
		writeAuthError(w, http.StatusUnauthorized, "Login admin diperlukan")
		return
	}
	if user.Role != "admin" {
		writeAuthError(w, http.StatusForbidden, "Akses admin diperlukan")
		return
	}

	var a Anime
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&a); err != nil {
		writeAuthError(w, http.StatusBadRequest, "Data anime tidak valid")
		return
	}

	insertSQL := `INSERT INTO animes (judul, episode, genre, sinopsis, gambar) VALUES (?, ?, ?, ?, ?)`
	result, err := db.Exec(insertSQL, a.Judul, a.Episode, a.Genre, a.Sinopsis, a.Gambar)
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

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/animes", getAnimes)
	mux.HandleFunc("GET /api/animes/{id}", getAnimeByID)
	mux.HandleFunc("POST /api/animes", createAnime)
	mux.HandleFunc("POST /api/auth/register", registerUser)
	mux.HandleFunc("POST /api/auth/login", loginUser)
	mux.HandleFunc("GET /api/auth/session", getSession)
	mux.HandleFunc("POST /api/auth/logout", logoutUser)

	fmt.Println("Server API berjalan di http://localhost:8080")
	server := &http.Server{Addr: ":8080", Handler: corsMiddleware(mux), ReadHeaderTimeout: 5 * time.Second}
	log.Fatal(server.ListenAndServe())
}
