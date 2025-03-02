'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, X } from 'react-feather';
import './App.css';
import { API_URL } from './config';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Language translations
const translations = {
  english: {
    siteTitle: "FIND-IT",
    searchPlaceholder: "Search for facilities...",
    searchRadius: "Search Radius",
    interactiveMap: "Interactive Map",
    nearbyFacilities: "Nearby Facilities (within {radius} km)",
    loading: "Loading facilities...",
    locateMe: "Locate Me",
    settings: "Website Settings",
    mapStyle: "Map Style",
    theme: "Theme",
    language: "Language",
    all: "All",
    metro: "Metro",
    busStands: "Bus Stands",
    malls: "Malls",
    restaurants: "Restaurants",
    atms: "ATMs",
  },
  hindi: {
    siteTitle: "खोजें",
    searchPlaceholder: "सुविधाओं की खोज करें...",
    searchRadius: "खोज त्रिज्या",
    interactiveMap: "इंटरैक्टिव मानचित्र",
    nearbyFacilities: "निकटवर्ती सुविधाएँ ({radius} किमी के भीतर)",
    loading: "सुविधाएँ लोड हो रही हैं...",
    locateMe: "मुझे ढूंढें",
    settings: "वेबसाइट सेटिंग्स",
    mapStyle: "मानचित्र शैली",
    theme: "थीम",
    language: "भाषा",
    all: "सभी",
    metro: "मेट्रो",
    busStands: "बस स्टैंड",
    malls: "मॉल",
    restaurants: "रेस्तरां",
    atms: "एटीएम",
  },
  kannada: {
    siteTitle: "ಹುಡುಕಿ",
    searchPlaceholder: "ಸೌಲಭ್ಯಗಳನ್ನು ಹುಡುಕಿ...",
    searchRadius: "ಹುಡುಕಾಟ ವ್ಯಾಪ್ತಿ",
    interactiveMap: "ಸಂವಾದಾತ್ಮಕ ನಕ್ಷೆ",
    nearbyFacilities: "ಹತ್ತಿರದ ಸೌಲಭ್ಯಗಳು ({radius} ಕಿ.ಮೀ ಒಳಗೆ)",
    loading: "ಸೌಲಭ್ಯಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...",
    locateMe: "ನನ್ನನ್ನು ಪತ್ತೆಹಚ್ಚಿ",
    settings: "ವೆಬ್‌ಸೈಟ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    mapStyle: "ನಕ್ಷೆ ಶೈಲಿ",
    theme: "ಥೀಮ್",
    language: "ಭಾಷೆ",
    all: "ಎಲ್ಲಾ",
    metro: "ಮೆಟ್ರೋ",
    busStands: "ಬಸ್ ನಿಲ್ದಾಣಗಳು",
    malls: "ಮಾಲ್‌ಗಳು",
    restaurants: "ರೆಸ್ಟೋರೆಂಟ್‌ಗಳು",
    atms: "ಎಟಿಎಂಗಳು",
  },
};

export default function Component() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);
  const [radiusError, setRadiusError] = useState('');
  const [appSettings, setAppSettings] = useState({
    mapStyle: 'street',
    theme: 'light',
    language: 'english',
  });
  const [userLocation, setUserLocation] = useState({ lat: 0, lon: 0 });

  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  const t = translations[appSettings.language];

  const fetchFacilities = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/get_utilities?type=${activeTab}&distance=${searchRadius}&lat=${userLocation.lat}&lon=${userLocation.lon}`);
      if (!response.ok) {
        throw new Error('Failed to fetch facilities');
      }
      const data = await response.json();
      setFacilities(data);
      updateMapMarkers(data);
    } catch (error) {
      console.error('Error fetching facilities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchRadius, userLocation]);

  useEffect(() => {
    if (userLocation.lat !== 0 && userLocation.lon !== 0) {
      fetchFacilities();
    }
  }, [fetchFacilities, userLocation]);

  useEffect(() => {
    if (!mapRef.current) return;

    const newMap = L.map(mapRef.current).setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(newMap);

    setMap(newMap);

    return () => {
      newMap.remove();
    };
  }, []);

  useEffect(() => {
    if (map && userLocation.lat !== 0 && userLocation.lon !== 0) {
      map.setView([userLocation.lat, userLocation.lon], 13);
      L.marker([userLocation.lat, userLocation.lon]).addTo(map);
    }
  }, [map, userLocation]);

  const updateMapMarkers = (facilities) => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));

    // Add new markers
    const newMarkers = facilities.map(facility => {
      const marker = L.marker([facility.latitude, facility.longitude])
        .addTo(map)
        .bindPopup(`<b>${facility.name}</b><br>${facility.address || ''}`);
      return marker;
    });

    setMarkers(newMarkers);
  };

  useEffect(() => {
    // Get user's location when component mounts
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(function(position) {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      });
    } else {
      console.log("Geolocation is not available in your browser.");
    }
  }, []);

  const filteredFacilities = facilities.filter(facility => 
    facility.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSettingChange = (setting, value) => {
    setAppSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleRadiusChange = (e) => {
    const value = parseInt(e.target.value);
    if (isNaN(value)) {
      setRadiusError('Please enter a valid number');
    } else if (value <= 0) {
      setRadiusError('Radius must be greater than 0');
    } else if (value > 60) {
      setRadiusError('Radius cannot exceed 60km');
    } else {
      setRadiusError('');
      setSearchRadius(value);
    }
  };

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(function(position) {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      });
    } else {
      console.log("Geolocation is not available in your browser.");
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchFacilities();
  };

  const SettingsPanel = () => (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>{t.settings}</h2>
        <button onClick={() => setShowSettings(false)}><X size={24} /></button>
      </div>
      <div className="settings-content">
        <div className="setting-item">
          <label htmlFor="mapStyle">{t.mapStyle}:</label>
          <select
            id="mapStyle"
            value={appSettings.mapStyle}
            onChange={(e) => handleSettingChange('mapStyle', e.target.value)}
          >
            <option value="street">Street</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="theme">{t.theme}:</label>
          <select
            id="theme"
            value={appSettings.theme}
            onChange={(e) => handleSettingChange('theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="setting-item">
          <label htmlFor="language">{t.language}:</label>
          <select
            id="language"
            value={appSettings.language}
            onChange={(e) => handleSettingChange('language', e.target.value)}
          >
            <option value="english">English</option>
            <option value="hindi">हिंदी</option>
            <option value="kannada">ಕನ್ನಡ</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`app-container ${appSettings.theme}`}>
      <nav className="navbar">
        <div className="nav-content">
          <h1 className="site-title">{t.siteTitle}</h1>
          <div className="settings-container">
            <button className="settings-button" onClick={() => setShowSettings(!showSettings)}>
              <Settings size={24} />
            </button>
          </div>
        </div>
      </nav>

      {showSettings && <SettingsPanel />}

      <main className="main-content">
        <div className="search-container">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="radius-panel">
          <div className="radius-input-container">
            <label htmlFor="searchRadius">{t.searchRadius}</label>
            <div className="input-wrapper">
              <input
                type="number"
                id="searchRadius"
                value={searchRadius}
                onChange={handleRadiusChange}
                min="1"
                max="60"
                className="radius-input"
              />
              <span className="unit">km</span>
            </div>
            {radiusError && <p className="error">{radiusError}</p>}
          </div>
        </div>

        <div className="map-container">
          <h2>{t.interactiveMap}</h2>
          <div id="map" ref={mapRef} style={{ height: '400px', width: '100%' }}></div>
        </div>

        <div className="tabs-container">
          <button 
            onClick={() => handleTabChange('all')} 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          >
            {t.all}
          </button>
          <button 
            onClick={() => handleTabChange('metro_station')} 
            className={`tab ${activeTab === 'metro_station' ? 'active' : ''}`}
          >
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-lGst28Vi9Ucza9G2gYLjcUiURYyppi.png" 
                 alt="" 
                 className="tab-icon" />
            {t.metro}
          </button>
          <button 
            onClick={() => handleTabChange('bus_stop')} 
            className={`tab ${activeTab === 'bus_stop' ? 'active' : ''}`}
          >
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-VnQJti3ojsEnyaSG7g7unjrbax1ndH.png" 
                 alt="" 
                 className="tab-icon" />
            {t.busStands}
          </button>
          <button 
            onClick={() => handleTabChange('mall')} 
            className={`tab ${activeTab === 'mall' ? 'active' : ''}`}
          >
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-PuscUR0utvKGQ1QsN6gTkzqz4o1esR.png" 
                 alt="" 
                 className="tab-icon" />
            {t.malls}
          </button>
          <button 
            onClick={() => handleTabChange('restaurant')} 
            className={`tab ${activeTab === 'restaurant' ? 'active' : ''}`}
          >
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-4WYQw1dBvkjKqwMs6c3FEa0juv51yh.png" 
                 alt="" 
                 className="tab-icon" />
            {t.restaurants}
          </button>
          <button 
            onClick={() => handleTabChange('atm')} 
            className={`tab ${activeTab === 'atm' ? 'active' : ''}`}
          >
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-050JVKjJZ4EsX5xO5hC8a6K2I1MUhc.png" 
                 alt="" 
                 className="tab-icon" />
            {t.atms}
          </button>
        </div>

        <section className="facilities-section">
          <h2>{t.nearbyFacilities.replace('{radius}', searchRadius)}</h2>
          {isLoading ? (
            <p className="loading">{t.loading}</p>
          ) : (
            <div className="facilities-grid">
              {filteredFacilities.map((facility, index) => (
                <div key={index} className="facility-card">
                  <h3>{facility.name}</h3>
                  <p>Type: {activeTab}</p>
                  <p>Distance: {facility.distance} km</p>
                  {facility.address && <p>Address: {facility.address}</p>}
                  {facility.phone && <p>Phone: {facility.phone}</p>}
                  {facility.email && <p>Email: {facility.email}</p>}
                  {facility.line && <p>Line: {facility.line}</p>}
                  {facility.layout && <p>Layout: {facility.layout}</p>}
                  {facility.short_form && <p>Short Form: {facility.short_form}</p>}
                  {facility.num_trips_in_stop && <p>Number of Trips: {facility.num_trips_in_stop}</p>}
                  {facility.boothcode && <p>Booth Code: {facility.boothcode}</p>}
                  {facility.buses && <p>Buses: {facility.buses.join(', ')}</p>}
                  {facility.rate && <p>Rating: {facility.rate}</p>}
                  {facility.cuisines && <p>Cuisines: {facility.cuisines}</p>}
                  {facility.approx_cost && <p>Approximate Cost: {facility.approx_cost}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <button className="locate-button" onClick={handleLocateMe}>{t.locateMe}</button>
      </main>
    </div>
  );
}