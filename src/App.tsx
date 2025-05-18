import { useState } from 'react';
import { getRandomCartoon, Cartoon } from './api/tmdb';

function App() {
  const [cartoon, setCartoon] = useState<Cartoon | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const result = await getRandomCartoon();
    setCartoon(result);
    setLoading(false);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      
      <h1>Случайный мультфильм</h1>
      <button onClick={handleClick}>Показать мульт</button>

      {loading && <p>Загрузка...</p>}

      {cartoon && (
        <div>
          <h2>{cartoon.title}</h2>
          <img
            src={`https://image.tmdb.org/t/p/w500${cartoon.poster_path}`}
            alt={cartoon.title}
            style={{ maxWidth: '300px' }}
          />
          <p>{cartoon.overview}</p>
        </div>
      )}
    </div>
  );
}

export default App;
