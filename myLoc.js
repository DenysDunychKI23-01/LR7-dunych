// =============================================================
// Глобальні змінні та налаштування
// =============================================================
let watchId = null;
let map = null;
let destinationMarker = null;
let routePolyline = null;
let trackHistory = [];

// Координати Коледжу (з матеріалів практичної роботи)
const ourCoords = {
  latitude: 48.94321,
  longitude: 24.73380
};

// Запуск при завантаженні сторінки
document.addEventListener('DOMContentLoaded', getMyLocation);

function getMyLocation() {
  if (navigator.geolocation) {
    addLog("Запит дозволу на доступ до геолокації...");
    
    // Початкове одноразове отримання позиції (Частина 1)
    navigator.geolocation.getCurrentPosition(displayLocation, displayError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    // Налаштування обробників подій для кнопок (Частина 2 та Індивідуальне завдання)
    document.getElementById("watch").onclick = watchLocation;
    document.getElementById("clearWatch").onclick = clearWatch;
    document.getElementById("scrollToDest").onclick = scrollToDestination;
  } else {
    alert("На жаль, ваш браузер не підтримує Geolocation API.");
    addLog("Помилка: Geolocation API не підтримується браузером", "error");
  }
}

// =============================================================
// Частина 1. Відображення місцезнаходження, точності та відстані
// =============================================================
function displayLocation(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  // 1. Вивід точних координат на сторінку
  const locDiv = document.getElementById("location");
  locDiv.innerHTML = `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`;

  // 2. Вивід точності визначення місцезнаходження в метрах
  const accDiv = document.getElementById("accuracy");
  accDiv.innerHTML = `± ${accuracy.toFixed(1)} м`;

  // 3. Обчислення відстані за формулою гаверсинуса до Коледжу
  const km = computeDistance(position.coords, ourCoords);
  const distDiv = document.getElementById("distance");
  distDiv.innerHTML = `${km.toFixed(3)} км`;

  // 4. Оновлення або створення карти з маркером (Індивідуальне завдання)
  updateMapAndMarkers(latitude, longitude, accuracy);
}

// -------------------------------------------------------------
// Формула гаверсинуса для розрахунку відстані на сфері (км)
// -------------------------------------------------------------
function computeDistance(startCoords, destCoords) {
  const startLatRads = degreesToRadians(startCoords.latitude);
  const startLongRads = degreesToRadians(startCoords.longitude);
  const destLatRads = degreesToRadians(destCoords.latitude);
  const destLongRads = degreesToRadians(destCoords.longitude);
  
  const Radius = 6371; // Радіус Землі у кілометрах

  const distance = Math.acos(
    Math.sin(startLatRads) * Math.sin(destLatRads) +
    Math.cos(startLatRads) * Math.cos(destLatRads) *
    Math.cos(startLongRads - destLongRads)
  ) * Radius;

  return distance;
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// -------------------------------------------------------------
// Повна обробка помилок геолокації
// -------------------------------------------------------------
function displayError(error) {
  const errorTypes = {
    0: "Невідома помилка",
    1: "Доступ до геолокації заборонено користувачем",
    2: "Поточна позиція недоступна",
    3: "Перевищено час очікування відповіді (Timeout)"
  };
  
  let errorMessage = errorTypes[error.code] || "Помилка визначення координат";
  if (error.code === 0 || error.code === 2) {
    errorMessage += `: ${error.message}`;
  }
  
  document.getElementById("location").innerHTML = `<span style="color: var(--danger)">${errorMessage}</span>`;
  addLog(`Помилка [Код ${error.code}]: ${errorMessage}`, "error");
  
  const statusText = document.getElementById("statusText");
  statusText.innerText = "Помилка геолокації";
  document.getElementById("statusBadge").style.borderColor = "rgba(239, 68, 68, 0.4)";
}

// =============================================================
// Частина 2. Трекінг у режимі реального часу (watchPosition)
// =============================================================
function watchLocation() {
  if (!watchId) {
    watchId = navigator.geolocation.watchPosition(displayLocation, displayError, {
      enableHighAccuracy: true,
      maximumAge: 1000
    });
    
    addLog(`Запущено трекінг у режимі реального часу (ID відстеження: ${watchId})`);
    
    const statusText = document.getElementById("statusText");
    statusText.innerText = "Активний трекінг";
    document.getElementById("statusBadge").style.background = "rgba(6, 182, 212, 0.15)";
    document.getElementById("statusBadge").style.color = "var(--secondary)";
  }
}

function clearWatch() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    addLog(`Зупинено трекінг (ID: ${watchId})`);
    watchId = null;
    
    const statusText = document.getElementById("statusText");
    statusText.innerText = "Трекінг зупинено";
    document.getElementById("statusBadge").style.background = "rgba(245, 158, 11, 0.15)";
    document.getElementById("statusBadge").style.color = "var(--accent)";
  }
}

// =============================================================
// Індивідуальне завдання (Варіант 6): Інтерактивна карта Leaflet
// =============================================================
function updateMapAndMarkers(lat, lng, accuracy) {
  const timestamp = new Date().toLocaleTimeString();

  // 1. Ініціалізація карти при першому завантаженні (з центруванням відносно власних координат)
  if (!map) {
    map = L.map('map', { zoomControl: true }).setView([lat, lng], 15);

    // Додаємо картграфічні плитки CartoDB / OpenStreetMap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap & CartoDB'
    }).addTo(map);

    addLog(`Карту успішно створено та відцентровано в точці [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
  }

  // 2. Додавання нового маркера при зміні положення з часом фіксації (Пункт 5)
  trackHistory.push([lat, lng]);

  const marker = L.circleMarker([lat, lng], {
    radius: 8,
    fillColor: "#06b6d4",
    color: "#ffffff",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9
  }).addTo(map);

  const popupContent = `
    <div style="font-family: sans-serif;">
      <strong style="color: #06b6d4;"><i class="fa-solid fa-location-dot"></i> Фіксація Позиції</strong><br>
      <b>Час фіксації:</b> ${timestamp}<br>
      <b>Широта:</b> ${lat.toFixed(6)}<br>
      <b>Довгота:</b> ${lng.toFixed(6)}<br>
      <b>Точність:</b> ±${accuracy.toFixed(1)} м
    </div>
  `;
  marker.bindPopup(popupContent);

  // Центруємо карту на найновішу позицію
  map.panTo([lat, lng]);
  addLog(`Додано новий маркер: [${lat.toFixed(5)}, ${lng.toFixed(5)}] о ${timestamp}`);
}

// -------------------------------------------------------------
// Скрол/політ до пункту призначення (Пункти 6 та 7)
// -------------------------------------------------------------
function scrollToDestination() {
  const destLatVal = document.getElementById("destLat").value;
  const destLngVal = document.getElementById("destLng").value;

  const destLat = parseFloat(destLatVal);
  const destLng = parseFloat(destLngVal);

  if (isNaN(destLat) || isNaN(destLng)) {
    alert("Будь ласка, введіть коректні числові координати пункту призначення!");
    return;
  }

  if (!map) {
    alert("Спочатку активуйте геолокацію для ініціалізації карти.");
    return;
  }

  // Видаляємо попередній маркер призначення та лінію, якщо вони вже були
  if (destinationMarker) map.removeLayer(destinationMarker);
  if (routePolyline) map.removeLayer(routePolyline);

  // 1. Анімоване переміщення (плавний скрол/політ) карти до обраного пункту
  map.flyTo([destLat, destLng], 16, { duration: 2.0 });

  // 2. Встановлення нового маркера з Popup
  destinationMarker = L.marker([destLat, destLng]).addTo(map);
  
  const destPopup = `
    <div style="font-family: sans-serif;">
      <strong style="color: #f59e0b;"><i class="fa-solid fa-flag-checkered"></i> Пункт Призначення</strong><br>
      <b>Широта:</b> ${destLat.toFixed(6)}<br>
      <b>Довгота:</b> ${destLng.toFixed(6)}
    </div>
  `;
  destinationMarker.bindPopup(destPopup).openPopup();

  // 3. Побудова пунктирної лінії від вашої останньої позиції до пункту призначення
  if (trackHistory.length > 0) {
    const currentPos = trackHistory[trackHistory.length - 1];
    routePolyline = L.polyline([currentPos, [destLat, destLng]], {
      color: '#f59e0b',
      dashArray: '8, 8',
      weight: 3
    }).addTo(map);
  }

  addLog(`Карту проскролено до пункту призначення: [${destLat}, ${destLng}]`, "accent");
}

// -------------------------------------------------------------
// Допоміжна функція ведення онлайн-журналу логів
// -------------------------------------------------------------
function addLog(text, type = "normal") {
  const container = document.getElementById("logsContainer");
  const time = new Date().toLocaleTimeString();
  
  const logDiv = document.createElement("div");
  logDiv.className = "log-item";
  
  let colorStyle = "";
  if (type === "error") colorStyle = 'style="color: var(--danger)"';
  if (type === "accent") colorStyle = 'style="color: var(--accent)"';

  logDiv.innerHTML = `<span ${colorStyle}>${text}</span><span class="log-time">${time}</span>`;
  container.prepend(logDiv);
}