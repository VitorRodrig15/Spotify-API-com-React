import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl from 'react-bootstrap/FormControl';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import { useState, useEffect } from 'react';

const CLIENT_ID = "";       // Replace with your Spotify Client ID and Client Secret.
const CLIENT_SECRET = "";

function getSpotifyImageUrl(item) {
  if (!item) return null;
  const playlistImage = item.images?.find(image => image && image.url);
  if (playlistImage?.url) return playlistImage.url;
  const albumImage = item.album?.images?.find(image => image && image.url);
  if (albumImage?.url) return albumImage.url;
  return null;
}

function getTrackCount(item) {
  if (item?.tracks?.total != null) {
    return item.tracks.total;
  }
  return 'N/A';
}

function App() {
  const [searchInput, setSearchInput] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [searchMode, setSearchMode] = useState("albums");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [trackList, setTrackList] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [loadingTracks, setLoadingTracks] = useState(false);

  useEffect(() => {
    // API Access token
    var authParameters = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET
    }

    fetch('https://accounts.spotify.com/api/token', authParameters)
      .then(result => result.json())
      .then(data => setAccessToken(data.access_token))
      .catch(error => console.error("Error fetching access token:", error));
  }, [])

  // Search
  async function search() {
    console.log("Search for " + searchInput);
    setMessage("");
    setResults([]);
    setTrackList([]);
    setSelectedCollection(null);

    if (!accessToken) {
      console.error("Access token not available. Please wait for token to load.");
      alert("Token not ready yet. Please wait a moment and try again.");
      return;
    }

    if (!searchInput.trim()) {
      console.error("Search input is empty");
      alert("Please enter a search term");
      return;
    }

    const commonHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    };

    if (searchMode === 'albums') {
      var artistSearchParameters = {
        method: 'GET',
        headers: commonHeaders
      };

      const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchInput)}&type=artist`;
      console.log("Search URL:", searchUrl);

      var artistID = await fetch(searchUrl, artistSearchParameters)
        .then(response => {
          if (!response.ok) {
            console.error("Search response status:", response.status);
            return response.json().then(data => {
              console.error("Error response:", data);
              throw new Error(`HTTP error! status: ${response.status}`);
            });
          }
          return response.json();
        })
        .then(data => {
          if (data.artists && data.artists.items && data.artists.items.length > 0) {
            return data.artists.items[0].id;
          }
          return null;
        })
        .catch(error => {
          console.error("Error fetching artist:", error);
          alert("Error searching artist: " + error.message);
          return null;
        });

      if (!artistID) {
        console.log("Artist not found");
        alert("Artist not found. Try a different name.");
        return;
      }

      console.log("Artist ID is " + artistID);

      var albumsSearchParameters = {
        method: 'GET',
        headers: commonHeaders
      };

      const queryParams = new URLSearchParams({
        include_groups: 'album',
        market: 'US',
        limit: '10'
      }).toString();

      const albumsUrl = `https://api.spotify.com/v1/artists/${artistID}/albums?${queryParams}`;
      console.log("Albums URL:", albumsUrl);

      var albumsData = await fetch(albumsUrl, albumsSearchParameters)
        .then(response => {
          if (!response.ok) {
            console.error("Albums response status:", response.status);
            return response.json().then(data => {
              console.error("Detailed Error from Spotify:", data);
              throw new Error(`HTTP error! status: ${response.status}`);
            });
          }
          return response.json();
        })
        .then(data => {
          console.log("Albums received:", data);
          return data.items || [];
        })
        .catch(error => {
          console.error("Error fetching albums:", error);
          alert("Error fetching albums: " + error.message);
          return [];
        });

      setResults(albumsData);
      if (albumsData.length === 0) {
        setMessage("Nenhum álbum encontrado.");
      }
      return;
    }

    const searchType = searchMode === 'playlists' ? 'playlist' : 'track';
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchInput)}&type=${searchType}&limit=10`;
    console.log("Search URL:", searchUrl);

    var searchData = await fetch(searchUrl, { method: 'GET', headers: commonHeaders })
      .then(response => {
        if (!response.ok) {
          console.error("Search response status:", response.status);
          return response.json().then(data => {
            console.error("Error response:", data);
            throw new Error(`HTTP error! status: ${response.status}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (searchType === 'playlist') {
          return data.playlists ? data.playlists.items || [] : [];
        }
        return data.tracks ? data.tracks.items || [] : [];
      })
      .catch(error => {
        console.error("Error fetching search results:", error);
        alert("Error fetching results: " + error.message);
        return [];
      });

    setResults(searchData);
    if (searchData.length === 0) {
      setMessage(searchMode === 'playlists' ? "Nenhuma playlist encontrada." : "Nenhuma música encontrada.");
    }
  }

  async function openCollectionTracks(item, type) {
    if (!item?.id) return;
    if (!accessToken) {
      alert("Token not ready yet. Please wait a moment and try again.");
      return;
    }

    setMessage("");
    setTrackList([]);
    setSelectedCollection({ type, name: item.name });
    setLoadingTracks(true);

    const url = type === 'album'
      ? `https://api.spotify.com/v1/albums/${item.id}/tracks?market=US&limit=50`
      : `https://api.spotify.com/v1/playlists/${item.id}/tracks?market=US&limit=50`;

    const data = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      }
    })
      .then(response => {
        if (!response.ok) {
          console.error("Tracks response status:", response.status);
          return response.json().then(err => {
            console.error("Tracks error response:", err);
            if (type === 'playlist' && response.status === 403) {
              setMessage("Não autorizado a acessar as faixas da playlist. Playlists requerem autorização de usuário ou são privadas.");
              return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (type === 'playlist') {
          return (data.items || []).map(entry => entry.track).filter(Boolean);
        }
        return data.items || [];
      })
      .catch(error => {
        console.error("Error fetching tracks:", error);
        if (!message) {
          alert("Error fetching tracks: " + error.message);
        }
        return [];
      });

    setTrackList(data);
    setLoadingTracks(false);
    if (data.length === 0) {
      setMessage(`Nenhuma música encontrada em ${item.name}.`);
    }
  }

  function formatDuration(ms) {
    if (typeof ms !== 'number') return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  return (
    <div className="App">
      <Container className="mt-5">
        <div className="d-flex flex-column flex-md-row align-items-start gap-2 mb-3">
          <select
            className="form-select"
            style={{ maxWidth: '220px' }}
            value={searchMode}
            onChange={event => setSearchMode(event.target.value)}
          >
            <option value="albums">Artist albums</option>
            <option value="playlists">Playlists</option>
            <option value="track">Track details</option>
          </select>
          <InputGroup className="flex-fill" size="lg">
            <FormControl
              placeholder={searchMode === 'albums' ? 'Search For Artist' : searchMode === 'playlists' ? 'Search For Playlists' : 'Search For Track'}
              type="input"
              onKeyDown={event => {
                if (event.key === "Enter") {
                  search();
                }
              }}
              onChange={event => setSearchInput(event.target.value)}
            />
            <Button onClick={search}>
              Search
            </Button>
          </InputGroup>
        </div>
      </Container>
      <Container>
        <Row className="gx-4">
          <Col md={selectedCollection ? 8 : 12}>
            <Row className="mx-2 row-cols-1 row-cols-md-4 g-4">
              {message && results.length === 0 && (
                <p className="text-center w-100">{message}</p>
              )}
              {results && results.length > 0 && results.map((item, i) => (
                <Col key={i}>
                  <Card className="h-100">
                    <Card.Img
                      variant="top"
                      src={getSpotifyImageUrl(item) || '#'}
                    />
                    <Card.Body>
                      {searchMode === 'albums' && (
                        <>
                          <Card.Title>{item.name}</Card.Title>
                          <Card.Text>{item.release_date}</Card.Text>
                        </>
                      )}
                      {searchMode === 'playlists' && (
                        <>
                          <Card.Title>{item.name}</Card.Title>
                          <Card.Text>By {item.owner?.display_name || item.owner?.id || 'Unknown'}</Card.Text>
                          <Card.Text>{getTrackCount(item)} faixas</Card.Text>
                          <Button variant="primary" className="mt-2" onClick={() => openCollectionTracks(item, 'playlist')}>
                            Ver músicas
                          </Button>
                        </>
                      )}
                      {searchMode === 'track' && (
                        <>
                          <Card.Title>{item.name}</Card.Title>
                          <Card.Text>Artist: {item.artists?.map(artist => artist.name).join(', ')}</Card.Text>
                          <Card.Text>Album: {item.album?.name}</Card.Text>
                          <Card.Text>
                            Duration: {formatDuration(item.duration_ms)}
                          </Card.Text>
                        </>
                      )}
                      {searchMode === 'albums' && (
                        <>
                          <Button variant="primary" className="mt-2" onClick={() => openCollectionTracks(item, 'album')}>
                            Ver músicas
                          </Button>
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
          {selectedCollection && (
            <Col md={4}>
              <Card>
                <Card.Body>
                  <Card.Title>
                    {selectedCollection.type === 'album' ? 'Álbum' : 'Playlist'}
                  </Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    {selectedCollection.name}
                  </Card.Subtitle>
                  {loadingTracks && <p>Carregando músicas...</p>}
                  {!loadingTracks && (
                    <ul className="list-group list-group-flush">
                      {trackList.length > 0 ? (
                        trackList.map((track, index) => (
                          <li key={track?.id || index} className="list-group-item">
                            <strong>{index + 1}. {track?.name || 'Sem nome'}</strong>
                            <div>{track?.artists?.map(artist => artist.name).join(', ')}</div>
                            <div>{track?.album?.name || ''}</div>
                            <div>Duração: {formatDuration(track?.duration_ms)}</div>
                          </li>
                        ))
                      ) : (
                        <p>Nenhuma música encontrada para este item.</p>
                      )}
                    </ul>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </Container>
    </div>
  );
}

export default App;