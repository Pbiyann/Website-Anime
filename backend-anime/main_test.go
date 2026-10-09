package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func setupAuthTestDatabase(t *testing.T) {
	t.Helper()
	previousDB := db
	testDB, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "auth.db"))
	if err != nil {
		t.Fatal(err)
	}
	testDB.SetMaxOpenConns(1)
	db = testDB
	for _, statement := range []string{
		`CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL COLLATE NOCASE UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL CHECK (role IN ('user', 'admin'))
		);`,
		`CREATE TABLE sessions (
			token_hash TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id),
			expires_at INTEGER NOT NULL
		);`,
		`CREATE TABLE animes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			judul TEXT,
			episode INTEGER,
			genre TEXT,
			sinopsis TEXT,
			gambar TEXT
		);`,
	} {
		if _, err := db.Exec(statement); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		testDB.Close()
		db = previousDB
	})
}

func TestAuthenticationAndAdminAuthorization(t *testing.T) {
	setupAuthTestDatabase(t)

	registerRequest := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"username":"viewer1","password":"viewer-password-1"}`))
	registerResponse := httptest.NewRecorder()
	registerUser(registerResponse, registerRequest)
	if registerResponse.Code != http.StatusCreated {
		t.Fatalf("register status = %d, want %d: %s", registerResponse.Code, http.StatusCreated, registerResponse.Body.String())
	}
	userCookie := registerResponse.Result().Cookies()[0]
	var registered struct {
		User AuthUser `json:"user"`
	}
	if err := json.Unmarshal(registerResponse.Body.Bytes(), &registered); err != nil {
		t.Fatal(err)
	}
	if registered.User.Role != "user" || registered.User.Username != "viewer1" {
		t.Fatalf("registered user = %+v", registered.User)
	}
	var storedHash string
	if err := db.QueryRow("SELECT password_hash FROM users WHERE username = ?", "viewer1").Scan(&storedHash); err != nil {
		t.Fatal(err)
	}
	if storedHash == "viewer-password-1" || bcrypt.CompareHashAndPassword([]byte(storedHash), []byte("viewer-password-1")) != nil {
		t.Fatal("registered password was not stored as a valid bcrypt hash")
	}

	userAnimeRequest := httptest.NewRequest(http.MethodPost, "/api/animes", strings.NewReader(`{"judul":"Unauthorized","episode":1}`))
	userAnimeRequest.AddCookie(userCookie)
	userAnimeResponse := httptest.NewRecorder()
	createAnime(userAnimeResponse, userAnimeRequest)
	if userAnimeResponse.Code != http.StatusForbidden {
		t.Fatalf("user create status = %d, want %d", userAnimeResponse.Code, http.StatusForbidden)
	}

	logoutRequest := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	logoutRequest.AddCookie(userCookie)
	logoutResponse := httptest.NewRecorder()
	logoutUser(logoutResponse, logoutRequest)
	if logoutResponse.Code != http.StatusNoContent {
		t.Fatalf("logout status = %d, want %d", logoutResponse.Code, http.StatusNoContent)
	}
	sessionRequest := httptest.NewRequest(http.MethodGet, "/api/auth/session", nil)
	sessionRequest.AddCookie(userCookie)
	sessionResponse := httptest.NewRecorder()
	getSession(sessionResponse, sessionRequest)
	if sessionResponse.Code != http.StatusUnauthorized {
		t.Fatalf("session after logout status = %d, want %d", sessionResponse.Code, http.StatusUnauthorized)
	}

	t.Setenv("ADMIN_USERNAME", "site-admin")
	t.Setenv("ADMIN_PASSWORD", "a-private-admin-password")
	ensureAdminAccount()
	loginRequest := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(`{"username":"site-admin","password":"a-private-admin-password","role":"admin"}`))
	loginResponse := httptest.NewRecorder()
	loginUser(loginResponse, loginRequest)
	if loginResponse.Code != http.StatusOK {
		t.Fatalf("admin login status = %d, want %d: %s", loginResponse.Code, http.StatusOK, loginResponse.Body.String())
	}
	adminCookie := loginResponse.Result().Cookies()[0]
	adminAnimeRequest := httptest.NewRequest(http.MethodPost, "/api/animes", strings.NewReader(`{"judul":"Authorized","episode":1,"genre":"Action","sinopsis":"test","gambar":"poster.jpg"}`))
	adminAnimeRequest.AddCookie(adminCookie)
	adminAnimeResponse := httptest.NewRecorder()
	createAnime(adminAnimeResponse, adminAnimeRequest)
	if adminAnimeResponse.Code != http.StatusCreated {
		t.Fatalf("admin create status = %d, want %d: %s", adminAnimeResponse.Code, http.StatusCreated, adminAnimeResponse.Body.String())
	}
}
