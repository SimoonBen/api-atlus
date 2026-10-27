const showInputError = (output, message) => {
  output.innerHTML = '';

  const errorMessage = document.createElement('p');
  errorMessage.className = 'input-error';
  errorMessage.setAttribute('role', 'alert');
  errorMessage.textContent = message;
  output.appendChild(errorMessage);
};

const addDownloadButton = (output, imageUrl, filename) => {
  const downloadButton = document.createElement('button');
  downloadButton.className = 'download-button';
  downloadButton.type = 'button';
  downloadButton.textContent = 'Download image';

  downloadButton.addEventListener('click', async () => {
    const originalText = downloadButton.textContent;
    downloadButton.disabled = true;
    downloadButton.textContent = 'Preparing...';

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const imageBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Could not download image:', error);
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    } finally {
      downloadButton.disabled = false;
      downloadButton.textContent = originalText;
    }
  });

  output.appendChild(downloadButton);
};

// Dog API

const getDog = document.getElementById('fetchDog');
const dogOutput = document.getElementById('dog-output');

const fetchDog = async () => {
  try {
    const res = await fetch(`https://dog.ceo/api/breeds/image/random`);

    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }

    const data = await res.json();

    const img = document.createElement('img');

    img.classList.add('img');
    img.src = data.message;
    img.alt = data.message;
    dogOutput.appendChild(img);
    addDownloadButton(dogOutput, data.message, 'random-dog.jpg');

    return data;
  } catch (error) {
    console.error(error);
  }
};

getDog.addEventListener('click', () => {
  dogOutput.innerHTML = '';
  fetchDog();
});

// Cat API

const getCat = document.getElementById('fetchCat');
const catOutput = document.getElementById('cat-output');

const fetchCat = async () => {
  try {
    const res = await fetch(`https://cataas.com/cat`, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }

    const data = await res.json();
    const img = document.createElement('img');

    img.classList.add('img');
    img.src = data.url;
    img.alt = data.id;
    catOutput.appendChild(img);
    addDownloadButton(catOutput, data.url, 'random-cat.jpg');

    return data;
  } catch (error) {
    console.error(error);
  }
};

getCat.addEventListener('click', () => {
  catOutput.innerHTML = '';
  fetchCat();
});

// Weather API

const locationInput = document.getElementById('locationInput');
const getWeather = document.getElementById('getWeather');
const weatherOutput = document.getElementById('weather-output');

async function getCurrentTemperature(location) {
  // Step 1: Search for the location
  const searchUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en`;

  const searchResponse = await fetch(searchUrl);

  if (!searchResponse.ok) {
    throw new Error('Could not search for the location.');
  }

  const searchData = await searchResponse.json();

  // Check whether the location was found
  if (!searchData.results || searchData.results.length === 0) {
    throw new Error('Location not found.');
  }

  // Get the coordinates of the first result
  const place = searchData.results[0];
  const latitude = place.latitude;
  const longitude = place.longitude;

  // Step 2: Request the current temperature
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`;

  const weatherResponse = await fetch(weatherUrl);

  if (!weatherResponse.ok) {
    throw new Error('Could not fetch the weather.');
  }

  const weatherData = await weatherResponse.json();

  // Step 3: Return the temperature and location
  return {
    location: place.name,
    country: place.country,
    temperature: weatherData.current.temperature_2m,
    unit: weatherData.current_units.temperature_2m,
    weatherCode: weatherData.current.weather_code,
  };
}

const getWeatherCondition = (weatherCode) => {
  if ([0, 1].includes(weatherCode)) return 'clear';
  if ([2, 3].includes(weatherCode)) return 'cloudy';
  if ([45, 48].includes(weatherCode)) return 'fog';
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)
  )
    return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snow';
  if ([95, 96, 99].includes(weatherCode)) return 'storm';
  return 'cloudy';
};

const createWeatherVisual = (condition) => {
  const visual = document.createElement('div');
  visual.className = `weather-visual weather-${condition}`;
  visual.setAttribute('role', 'img');
  visual.setAttribute('aria-label', `${condition} weather animation`);

  const visualParts = {
    clear: '<span class="weather-sun"></span>',
    cloudy: '<span class="weather-cloud"></span>',
    fog: '<span class="weather-fog"></span>',
    rain: '<span class="weather-cloud"></span><span class="weather-rain"></span>',
    snow: '<span class="weather-cloud"></span><span class="weather-snow"></span>',
    storm:
      '<span class="weather-cloud"></span><span class="weather-rain"></span><span class="weather-lightning">⚡</span>',
  };

  visual.innerHTML = visualParts[condition];
  return visual;
};

getWeather.addEventListener('click', () => {
  const location = locationInput.value.trim();

  if (!location) {
    showInputError(weatherOutput, 'Please enter a location.');
    return;
  }

  weatherOutput.innerHTML = '';
  // Step 4: Call the function
  getCurrentTemperature(location)
    .then((data) => {
      const condition = getWeatherCondition(data.weatherCode);
      weatherOutput.appendChild(createWeatherVisual(condition));

      const weather = document.createElement('p');

      weather.textContent = `The temperature in ${data.location} is ${data.temperature}${data.unit}`;
      weatherOutput.appendChild(weather);
    })
    .catch((error) => {
      console.error(error.message);
    });
});

// Currency rates API

const getExchange = document.getElementById('getExchange');
const currencyOutput = document.getElementById('currency-output');
const amountInput = document.getElementById('amountInput');
const currencyFrom = document.getElementById('currencyFrom');
const currencyTo = document.getElementById('currencyTo');
const currencySymbols = { GBP: '£', USD: '$' };

const fetchExchangeRates = async (amount, from, to) => {
  try {
    let rate = 1;

    if (from !== to) {
      const res = await fetch(
        `https://api.frankfurter.dev/v2/rate/${from.toLowerCase()}/${to.toLowerCase()}`,
      );
      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data = await res.json();
      rate = data.rate;
    }

    const exchange = document.createElement('p');
    exchange.textContent = `${currencySymbols[from]}${Number(amount).toFixed(2)} = ${currencySymbols[to]}${(amount * rate).toFixed(2)} (1 ${from} = ${rate.toFixed(4)} ${to})`;

    currencyOutput.appendChild(exchange);

    return { rate };
  } catch (error) {
    console.error(error);
  }
};

getExchange.addEventListener('click', () => {
  const amount = amountInput.value.trim();

  if (!amount) {
    showInputError(currencyOutput, 'Please enter an amount to convert.');
    return;
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    showInputError(currencyOutput, 'Please enter a valid positive amount.');
    return;
  }

  currencyOutput.innerHTML = '';
  fetchExchangeRates(numericAmount, currencyFrom.value, currencyTo.value);
});

// Trending Movies

const KEY = import.meta.env.VITE_TMDB_KEY;

const moviesOutput = document.getElementById('movies-output');
const getMovies = document.getElementById('get-movies');

const fetchMovies = async () => {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${KEY}`,
      {
        headers: {
          accept: 'application/json',
        },
      },
    );

    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }

    const data = await res.json();
    const movies = data.results.slice(0, 3);

    moviesOutput.innerHTML = movies
      .map(
        (movie) => `
          <article class="movie-card">
            <img
              class="movie-poster"
              src="${
                movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : 'https://placehold.co/500x750?text=No+poster'
              }"
              alt="Poster for ${movie.title}"
            />
            <div class="movie-card-content">
              <h3>${movie.title}</h3>
              <p class="release-date">Release date: ${
                movie.release_date || 'Unknown'
              }</p>
              <p>${movie.overview || 'No overview available.'}</p>
            </div>
          </article>
        `,
      )
      .join('');

    return data;
  } catch (error) {
    console.error(error);
  }
};

getMovies.addEventListener('click', () => {
  moviesOutput.innerHTML = '';
  fetchMovies();
});

// Github user profile

const getUser = document.getElementById('getUser');
const githubOutput = document.getElementById('github-output');
const userName = document.getElementById('userName');

const fetchGithubUser = async (username) => {
  try {
    const res = await fetch(`https://api.github.com/users/${username}`);

    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }

    const data = await res.json();

    document.getElementById('github-output').innerHTML = `
      <ul class='git-details'>
      <li><img src=${data.avatar_url} alt=${data.avatar_url} /></li>
       <li><p>${data.login}</p></li>
      <li><a href=${data.html_url} target='_blank'><button id='get-api'>View profile</button></a></li>     
      </ul>`;

    return data;
  } catch (error) {
    console.error(error);
  }
};

getUser.addEventListener('click', () => {
  const username = userName.value.trim();

  if (!username) {
    showInputError(githubOutput, 'Please enter a GitHub username.');
    return;
  }

  githubOutput.innerHTML = '';
  fetchGithubUser(username);
});

// Joke API

const getJoke = document.getElementById('get-joke');
const jokeOutput = document.getElementById('joke-output');

const fetchJoke = async () => {
  try {
    const res = await fetch(
      `https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit`,
    );

    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }

    const data = await res.json();

    if (data.error) {
      throw new Error('The joke service returned an error.');
    }

    // JokeAPI returns either a single "joke" or a two-part joke.
    const jokeText =
      data.type === 'twopart' ? `${data.setup} ${data.delivery}` : data.joke;

    const joke = document.createElement('p');
    joke.textContent = jokeText;

    jokeOutput.appendChild(joke);
    return data;
  } catch (error) {
    console.error(error);
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Could not load a joke. Please try again.';
    jokeOutput.appendChild(errorMessage);
  }
};

getJoke.addEventListener('click', () => {
  jokeOutput.innerHTML = '';
  fetchJoke();
});

// Random API

const getApi = document.getElementById('get-api');
const apiOutput = document.getElementById('api-output');

const fetchApi = async () => {
  fetch('https://freeapi.today/api.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch API list');
      }
      return response.json();
    })
    .then((data) => {
      // Display only the first API
      let randomIndex = Math.floor(Math.random() * data.entries.length);
      const api = data.entries[randomIndex];

      document.getElementById('api-output').innerHTML = `
          <h2>${api.name}</h2>
          <p>${api.description}</p>
          <a href="${api.docs}" target="_blank"
             rel="noopener noreferrer">
            API Documentation
          </a>
        `;
    })
    .catch((error) => {
      document.getElementById('result').textContent =
        'Could not load the API list.';
      console.error(error);
    });
};

getApi.addEventListener('click', () => {
  apiOutput.innerHTML = '';
  fetchApi();
});
