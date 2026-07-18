// Пример использования защищенных API endpoints

// ===== НА СЕРВЕРЕ (server/index.js или отдельный роут) =====

const { authenticateToken, optionalAuth } = require('./src/middleware/auth');

// Пример 1: Полностью защищенный endpoint
app.get('/api/user/favorites', authenticateToken, async (req, res) => {
	try {
		// req.user автоматически содержит данные авторизованного пользователя
		const favorites = await req.user.favoriteCartoonIds;
		res.json({ success: true, favorites });
	} catch (error) {
		res.status(500).json({ error: 'Server error' });
	}
});

// Пример 2: Endpoint с опциональной авторизацией
app.get('/api/cartoons/random', optionalAuth, async (req, res) => {
	try {
		// Если пользователь авторизован, учитываем его предпочтения
		const filter = req.user ? req.user.movieFilter : defaultFilter;
		const cartoon = await getRandomCartoon(filter);
		res.json({ success: true, cartoon });
	} catch (error) {
		res.status(500).json({ error: 'Server error' });
	}
});

// Пример 3: Добавление в избранное (требует авторизации)
app.post('/api/user/favorites/:cartoonId', authenticateToken, async (req, res) => {
	try {
		const cartoonId = parseInt(req.params.cartoonId);
		
		if (!req.user.favoriteCartoonIds.includes(cartoonId)) {
			req.user.favoriteCartoonIds.push(cartoonId);
			await req.user.save();
		}
		
		res.json({ success: true, favorites: req.user.favoriteCartoonIds });
	} catch (error) {
		res.status(500).json({ error: 'Server error' });
	}
});

// ===== НА КЛИЕНТЕ (React) =====

// Пример использования API с авторизацией

// Утилита для запросов с токеном
async function apiFetch(url, options = {}) {
	const token = localStorage.getItem('authToken');
	
	const headers = {
		'Content-Type': 'application/json',
		...options.headers,
	};
	
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}
	
	const response = await fetch(url, {
		...options,
		headers,
	});
	
	// Если токен невалидный, выходим
	if (response.status === 401 || response.status === 403) {
		localStorage.removeItem('authToken');
		window.location.reload();
	}
	
	return response.json();
}

// Пример использования в компоненте
export function useFavorites() {
	const [favorites, setFavorites] = useState([]);
	
	// Получить избранное
	const loadFavorites = async () => {
		const data = await apiFetch('/api/user/favorites');
		if (data.success) {
			setFavorites(data.favorites);
		}
	};
	
	// Добавить в избранное
	const addToFavorites = async (cartoonId) => {
		const data = await apiFetch(`/api/user/favorites/${cartoonId}`, {
			method: 'POST',
		});
		if (data.success) {
			setFavorites(data.favorites);
		}
	};
	
	return { favorites, loadFavorites, addToFavorites };
}

// Пример компонента с защищенными данными
function FavoritesPage() {
	const { favorites, loadFavorites } = useFavorites();
	
	useEffect(() => {
		loadFavorites();
	}, []);
	
	return (
		<div>
			<h2>Избранное</h2>
			{favorites.map(id => (
				<CartoonCard key={id} id={id} />
			))}
		</div>
	);
}
